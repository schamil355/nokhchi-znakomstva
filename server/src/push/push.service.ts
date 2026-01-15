import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { getSupabaseAdminClient } from "../common/supabase-admin";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_ATTEMPTS = 5;

type DeviceToken = {
  token: string;
  projectId: string | null;
};

export type PushQueueRow = {
  id: number;
  user_id: string;
  type: "match.new" | "like.received" | "message.new" | "test.push";
  payload: Record<string, any>;
  scheduled_at: string;
  attempts: number;
};

interface QuietHours {
  start: number;
  end: number;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly supabase = getSupabaseAdminClient();
  private readonly quietHours: QuietHours | null;
  private readonly expoAccessToken: string;
  private readonly batchSize: number;
  private readonly maxAttempts: number;
  private readonly allowedProjectIds: string[];
  private readonly profileFields = "display_name,is_incognito";
  private readonly matchFields = "user_a,user_b";

  constructor(private readonly configService: ConfigService) {
    const skipQuiet = (process.env.SKIP_QUIET_HOURS ?? "true").toLowerCase() === "true";
    this.quietHours = skipQuiet ? null : parseQuietHours(this.configService.get<string>("push.quietHours"));
    this.expoAccessToken = this.configService.get<string>("push.expoAccessToken") ?? "";
    this.batchSize = this.configService.get<number>("push.batchSize") ?? DEFAULT_BATCH_SIZE;
    this.maxAttempts = this.configService.get<number>("push.maxAttempts") ?? DEFAULT_MAX_ATTEMPTS;
    this.allowedProjectIds = this.configService.get<string[]>("push.allowedProjectIds") ?? [];
  }

  private async fetchProfileMeta(userId: string | null | undefined): Promise<{ isIncognito: boolean; name: string | null } | null> {
    if (!userId) return null;
    try {
      const { data, error } = await this.supabase
        .from("profiles")
        .select(this.profileFields)
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        return null;
      }
      return {
        isIncognito: Boolean((data as any)?.is_incognito),
        name: ((data as any)?.display_name as string | null) ?? null
      };
    } catch {
      return null;
    }
  }

  private async fetchMatchParticipants(matchId: string | null | undefined): Promise<{ userA: string | null; userB: string | null } | null> {
    if (!matchId) return null;
    try {
      const { data, error } = await this.supabase
        .from("matches")
        .select(this.matchFields)
        .eq("id", matchId)
        .maybeSingle();
      if (error) {
        return null;
      }
      return {
        userA: (data as any)?.user_a ?? null,
        userB: (data as any)?.user_b ?? null
      };
    } catch {
      return null;
    }
  }

  async processQueue(limit = 50) {
    const pending = await this.fetchPending(limit);
    for (const job of pending) {
      try {
        await this.handleJob(job);
      } catch (error) {
        this.logger.error(`Failed to handle push job ${job.id}`, error as Error);
      }
    }
  }

  private async fetchPending(limit: number): Promise<PushQueueRow[]> {
    const { data, error } = await this.supabase
      .from("push_queue")
      .select("id,user_id,type,payload,scheduled_at,attempts")
      .is("processed_at", null)
      .order("scheduled_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`push_queue select failed: ${error.message}`);
    }

    return data ?? [];
  }

  private async handleJob(job: PushQueueRow) {
    const now = new Date();
    if (this.isQuietHours(now)) {
      await this.deferUntilQuietEnds(job, now);
      return;
    }

    if (job.attempts >= this.maxAttempts) {
      await this.markProcessed(job, false);
      return;
    }

    if (job.type === "like.received") {
      await this.markProcessed(job, false);
      return;
    }

    const basePayload = (job.payload ?? {}) as Record<string, any>;
    if (job.type === "message.new") {
      const senderId = basePayload.sender_id ?? basePayload.senderId ?? basePayload.sender;
      if (senderId && senderId === job.user_id) {
        // Falsch adressierter Eintrag (Sender = user_id). Lege einen neuen Job für den Empfänger an.
        const participants = await this.fetchMatchParticipants(basePayload.match_id ?? basePayload.matchId);
        const recipient =
          participants && senderId === participants.userA
            ? participants.userB
            : participants && senderId === participants.userB
              ? participants.userA
              : null;
        if (recipient && recipient !== senderId) {
          await this.supabase.from("push_queue").insert({
            user_id: recipient,
            type: "message.new",
            payload: job.payload,
            scheduled_at: new Date().toISOString()
          });
        }
        await this.markProcessed(job, false);
        return;
      }
    }

    if (await this.shouldSkipDuplicate(job)) {
      await this.markProcessed(job, false);
      return;
    }

    const hasIncognitoFlag = Boolean(
      basePayload.liker_incognito ??
        basePayload.likerIncognito ??
        basePayload.other_incognito ??
        basePayload.otherIncognito ??
        basePayload.match_incognito ??
        basePayload.matchIncognito ??
        false
    );

    let effectiveJob: PushQueueRow = job;
    if (job.type === "match.new") {
      let incognito = hasIncognitoFlag;
      let likerId =
        basePayload.liker_id ??
        basePayload.likerId ??
        basePayload.other_user_id ??
        basePayload.otherUserId ??
        null;
      let likerName =
        basePayload.liker_name ??
        basePayload.likerName ??
        basePayload.display_name ??
        basePayload.displayName ??
        null;

      const matchParticipants = await this.fetchMatchParticipants(basePayload.match_id ?? basePayload.matchId);
      if (!likerId && matchParticipants) {
        const { userA, userB } = matchParticipants;
        if (userA === job.user_id) {
          likerId = userB;
        } else if (userB === job.user_id) {
          likerId = userA;
        }
      }

      const metaOther = await this.fetchProfileMeta(likerId);
      const metaSelf = await this.fetchProfileMeta(job.user_id);
      incognito = incognito || Boolean(metaOther?.isIncognito);
      likerName = likerName ?? metaOther?.name ?? null;

      // Inkognito-Selbstempfänger bekommt keinen Match/Like-Push
      if (metaSelf?.isIncognito) {
        await this.markProcessed(job, false);
        return;
      }

      if (incognito) {
        effectiveJob = {
          ...job,
          type: "like.received",
          payload: {
            liker_id: likerId,
            liker_name: likerName,
            liker_incognito: true,
            avatar_path: null,
            created_at: basePayload.created_at ?? new Date().toISOString()
          }
        };
      } else {
        // Falls Flags fehlen: wenn irgendein Beteiligter inkognito ist, keinen Match-Push senden
        const otherProfile =
          matchParticipants && job.user_id === matchParticipants.userA ? matchParticipants.userB : matchParticipants?.userA;
        const otherMeta = await this.fetchProfileMeta(otherProfile);
        const eitherIncognito = Boolean(metaOther?.isIncognito) || Boolean(otherMeta?.isIncognito);
        if (eitherIncognito) {
          await this.markProcessed(job, false);
          return;
        }
      }
    }

    if (await this.shouldSkipDuplicate(effectiveJob)) {
      await this.markProcessed(job, false);
      return;
    }

    if (effectiveJob.type === "match.new") {
      await this.ensureReciprocalMatchPush(effectiveJob);
    }

    const rawTokens = await this.fetchTokens(effectiveJob.user_id);
    const tokens = await this.filterTokensByProject(rawTokens);
    if (!tokens.length) {
      await this.markProcessed(job, false);
      return;
    }

    const batches = this.partitionTokenBatches(tokens);
    const results: ExpoResponseItem[] = [];

    for (const batchTokens of batches) {
      if (!batchTokens.length) {
        continue;
      }
      const messages = await Promise.all(batchTokens.map((token) => this.composeMessage(token, effectiveJob)));
      const batchResults = await this.sendExpoBatch(messages);
      results.push(...batchResults);
    }

    const invalidTokens = results
      .filter((result) => result.status === "error" && result.details?.error === "DeviceNotRegistered")
      .map((result) => result.to)
      .filter(Boolean) as string[];

    if (invalidTokens.length) {
      await this.removeTokens(invalidTokens);
    }

    const hasFailure =
      results.length !== tokens.length || results.some((result) => result.status === "error");
    if (hasFailure) {
      await this.reschedule(job);
      return;
    }

    await this.markProcessed(job, true);
  }

  private async fetchTokens(userId: string): Promise<DeviceToken[]> {
    const { data, error } = await this.supabase
      .from("devices")
      .select("token, project_id")
      .eq("user_id", userId);

    if (error) {
      this.logger.error(`Failed to load devices for ${userId}`, error);
      return [];
    }

    return (data ?? [])
      .map((row) => ({
        token: row.token as string,
        projectId: (row.project_id as string | null) ?? null,
      }))
      .filter((row) => Boolean(row.token));
  }

  private async filterTokensByProject(tokens: DeviceToken[]): Promise<DeviceToken[]> {
    if (!this.allowedProjectIds.length) {
      return tokens;
    }
    const allowList = new Set(this.allowedProjectIds);
    const keep: DeviceToken[] = [];
    const reject: string[] = [];
    for (const entry of tokens) {
      if (!entry.projectId || allowList.has(entry.projectId)) {
        keep.push(entry);
      } else {
        reject.push(entry.token);
      }
    }
    if (reject.length) {
      this.logger.warn(
        `Removed ${reject.length} push token(s) with disallowed project_id (allowed: ${this.allowedProjectIds.join(
          ", "
        )})`
      );
      await this.removeTokens(reject);
    }
    return keep;
  }

  private partitionTokenBatches(tokens: DeviceToken[]): string[][] {
    const grouped = new Map<string, string[]>();
    const singles: string[][] = [];
    tokens.forEach(({ token, projectId }) => {
      if (projectId) {
        const existing = grouped.get(projectId) ?? [];
        existing.push(token);
        grouped.set(projectId, existing);
      } else {
        singles.push([token]);
      }
    });
    return [...grouped.values(), ...singles];
  }

  private async ensureReciprocalMatchPush(job: PushQueueRow) {
    const payload = job.payload ?? {};
    const matchId = payload.match_id ?? payload.matchId;
    let otherUserId = payload.other_user_id ?? payload.otherUserId;
    const createdAt = payload.created_at ?? new Date().toISOString();

    if (!matchId) {
      return;
    }

    // Fallback: resolve other participant if not provided
    if (!otherUserId) {
      try {
        const participants = await this.fetchMatchParticipants(matchId);
        if (participants) {
          const { userA, userB } = participants;
          if (userA === job.user_id) {
            otherUserId = userB;
          } else if (userB === job.user_id) {
            otherUserId = userA;
          }
        }
      } catch {
        // ignore
      }
    }

    if (!otherUserId) {
      return;
    }

    try {
      const { data, error } = await this.supabase
        .from("push_queue")
        .select("id")
        .eq("user_id", otherUserId)
        .eq("type", "match.new")
        .contains("payload", { match_id: matchId })
        .limit(1);

      if (error) {
        this.logger.warn(`ensureReciprocalMatchPush lookup failed for match ${matchId}`, error);
        return;
      }

      if (data && data.length) {
        return;
      }

      const { error: insertError } = await this.supabase.from("push_queue").insert({
        user_id: otherUserId,
        type: "match.new",
        payload: {
          match_id: matchId,
          created_at: createdAt,
          other_user_id: job.user_id,
          avatar_path: payload.avatar_path ?? null
        },
        scheduled_at: new Date().toISOString(),
      });

      if (insertError) {
        this.logger.warn(`ensureReciprocalMatchPush insert failed for match ${matchId}`, insertError);
      }
    } catch (err) {
      this.logger.warn(`ensureReciprocalMatchPush unexpected error for match ${matchId}`, err as Error);
    }
  }
  private async shouldSkipDuplicate(job: PushQueueRow): Promise<boolean> {
    const payload = (job.payload ?? {}) as Record<string, any>;
    const matchId = payload.match_id ?? payload.matchId ?? payload.match;
    const likerId = payload.liker_id ?? payload.likerId;
    const messageId = payload.message_id ?? payload.messageId;
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const windowStart = new Date(Date.now() - windowMs).toISOString();

    const hasDuplicate = async (type: string, field: string, value: any, includeProcessedWindow = true, anyProcessed = false) => {
      const { data: pending, error: pendingError } = await this.supabase
        .from("push_queue")
        .select("id")
        .eq("user_id", job.user_id)
        .eq("type", type)
        .is("processed_at", null)
        .neq("id", job.id)
        .contains("payload", { [field]: value })
        .limit(1);

      if (!pendingError && pending && pending.length) {
        return true;
      }

      if (includeProcessedWindow) {
        const { data: recent, error: recentError } = await this.supabase
          .from("push_queue")
          .select("id")
          .eq("user_id", job.user_id)
          .eq("type", type)
          .gte("processed_at", windowStart)
          .neq("id", job.id)
          .contains("payload", { [field]: value })
          .limit(1);

        if (!recentError && recent && recent.length) {
          return true;
        }
      }

      if (anyProcessed) {
        const { data: anyProcessedRows, error: anyErr } = await this.supabase
          .from("push_queue")
          .select("id")
          .eq("user_id", job.user_id)
          .eq("type", type)
          .not("processed_at", "is", null)
          .neq("id", job.id)
          .contains("payload", { [field]: value })
          .limit(1);
        if (!anyErr && anyProcessedRows && anyProcessedRows.length) {
          return true;
        }
      }

      return false;
    };

    if (job.type === "match.new" && matchId) {
      // Skip if pending/processed recently OR ever processed for this match id
      if (await hasDuplicate("match.new", "match_id", matchId, true, true)) {
        return true;
      }
    }

    if (job.type === "message.new" && messageId) {
      // Skip duplicate message push for the same message id
      if (await hasDuplicate("message.new", "message_id", messageId, true)) {
        return true;
      }
    }

    if (job.type === "like.received" && likerId) {
      // Skip if pending or processed recently to avoid duplicate like pushes (immer, auch incognito)
      if (await hasDuplicate("like.received", "liker_id", likerId, true)) {
        return true;
      }
    }

    return false;
  }

  private async composeMessage(token: string, job: PushQueueRow) {
    const payload: Record<string, any> = (job.payload ?? {}) as Record<string, any>;
    const likerIncognito = Boolean(
      payload.liker_incognito ??
        payload.likerIncognito ??
        payload.other_incognito ??
        payload.otherIncognito ??
        payload.from_user_incognito ??
        payload.fromUserIncognito ??
        false
    );
    const rawAvatar =
      payload.avatarUrl ??
      payload.avatar_url ??
      payload.avatar_path ??
      payload.avatarPath ??
      payload.avatar ??
      null;
    const safeAvatar = likerIncognito ? null : rawAvatar;
    let title = "Neue Nachricht";
    let body = typeof payload.preview === "string" ? payload.preview : "Du hast eine neue Nachricht";
    let ttl: number | undefined;
    let badge: number | undefined;
    if (job.type === "match.new") {
      title = "Neues Match";
      body = "Ihr könnt jetzt chatten.";
      ttl = 7 * 24 * 60 * 60; // 7 Tage, damit Match-Push lange im Center bleibt
    } else if (job.type === "like.received") {
      title = "Neues Like";
      const name =
        (typeof payload.liker_name === "string" && payload.liker_name.trim()) ||
        (typeof payload.display_name === "string" && payload.display_name.trim()) ||
        (await lookupDisplayName(payload.liker_id, this.supabase)) ||
        null;
      body = name ? `${name} hat dich geliket` : "Jemand hat dich geliket";
    } else if (job.type === "test.push") {
      title = "Push-Test";
      body = payload.message ?? "Testbenachrichtigung";
    } else if (job.type === "message.new") {
      badge = 1;
    }

    return {
      to: token,
      sound: "default",
      title,
      body,
      ...(ttl ? { ttl } : null),
      ...(badge ? { badge } : null),
      data: {
        type: job.type,
        ...payload,
        avatarUrl: safeAvatar,
        avatar_path: likerIncognito ? null : payload.avatar_path ?? null,
        liker_incognito: likerIncognito,
      },
    };
  }

  private async sendExpoBatch(messages: Array<{ to: string } & Record<string, any>>) {
    const chunks = chunk(messages, this.batchSize);
    const results: ExpoResponseItem[] = [];

    for (const chunkMessages of chunks) {
      try {
        const response = await axios.post<ExpoResponse>(
          EXPO_PUSH_ENDPOINT,
          chunkMessages,
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              ...(this.expoAccessToken ? { Authorization: `Bearer ${this.expoAccessToken}` } : {}),
            },
          }
        );
        const payload = response.data?.data ?? [];
        payload.forEach((item, index) => {
          results.push({ ...item, to: chunkMessages[index]?.to });
        });
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status ?? "unknown";
          const data = error.response?.data ? JSON.stringify(error.response.data) : "no-body";
          this.logger.error(`Expo push request failed (${status}): ${data}`);
        } else {
          this.logger.error("Expo push request failed", error as Error);
        }
        chunkMessages.forEach((message) => {
          results.push({ status: "error", message: "request_failed", to: message.to });
        });
      }
    }

    return results;
  }

  private async removeTokens(tokens: string[]) {
    if (!tokens.length) {
      return;
    }
    const unique = Array.from(new Set(tokens));
    await this.supabase.from("devices").delete().in("token", unique);
  }

  private async markProcessed(job: PushQueueRow, incrementAttempt: boolean) {
    const attempts = incrementAttempt ? job.attempts + 1 : job.attempts;
    await this.supabase
      .from("push_queue")
      .update({ processed_at: new Date().toISOString(), attempts })
      .eq("id", job.id);
  }

  private async reschedule(job: PushQueueRow) {
    const delay = Math.min(30_000 * Math.pow(2, job.attempts + 1), 10 * 60 * 1000);
    await this.supabase
      .from("push_queue")
      .update({
        attempts: job.attempts + 1,
        scheduled_at: new Date(Date.now() + delay).toISOString(),
      })
      .eq("id", job.id);
  }

  private async deferUntilQuietEnds(job: PushQueueRow, now: Date) {
    const next = this.nextQuietExit(now);
    await this.supabase
      .from("push_queue")
      .update({ scheduled_at: next.toISOString() })
      .eq("id", job.id);
  }

  private isQuietHours(date: Date) {
    if (!this.quietHours) {
      return false;
    }
    const hour = date.getHours();
    const { start, end } = this.quietHours;
    if (start === end) {
      return true;
    }
    if (start < end) {
      return hour >= start && hour < end;
    }
    return hour >= start || hour < end;
  }

  private nextQuietExit(date: Date) {
    if (!this.quietHours) {
      return date;
    }
    const { start, end } = this.quietHours;
    const target = new Date(date);
    if (start < end) {
      if (date.getHours() < end) {
        target.setHours(end, 0, 0, 0);
      } else {
        target.setDate(target.getDate() + 1);
        target.setHours(end, 0, 0, 0);
      }
    } else {
      if (date.getHours() >= start) {
        target.setDate(target.getDate() + 1);
        target.setHours(end, 0, 0, 0);
      } else {
        target.setHours(end, 0, 0, 0);
      }
    }
    return target;
  }
}

type ExpoResponse = {
  data: ExpoResponseItem[];
};

type ExpoResponseItem = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
  to?: string;
};

// Lookup helper for liker display names in like.received payloads
// Note: declared outside the class to keep the class lean.
const lookupDisplayName = async (userId: string | null | undefined, supabase: any): Promise<string | null> => {
  if (!userId) return null;
  try {
    const { data, error } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
    if (error) {
      return null;
    }
    return (data as any)?.display_name ?? null;
  } catch {
    return null;
  }
};

const chunk = <T,>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  const chunkSize = size > 0 ? size : Math.max(1, items.length);
  for (let i = 0; i < items.length; i += chunkSize) {
    result.push(items.slice(i, i + chunkSize));
  }
  return result;
};

const parseQuietHours = (value?: string | null): QuietHours | null => {
  if (!value) {
    return null;
  }
  const [startStr, endStr] = value.split("-");
  const start = Number(startStr);
  const end = Number(endStr);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }
  return { start: Math.max(0, Math.min(23, start)), end: Math.max(0, Math.min(23, end)) };
};
