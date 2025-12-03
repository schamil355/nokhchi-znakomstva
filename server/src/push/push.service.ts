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

  constructor(private readonly configService: ConfigService) {
    const skipQuiet = (process.env.SKIP_QUIET_HOURS ?? "true").toLowerCase() === "true";
    this.quietHours = skipQuiet ? null : parseQuietHours(this.configService.get<string>("push.quietHours"));
    this.expoAccessToken = this.configService.get<string>("push.expoAccessToken") ?? "";
    this.batchSize = this.configService.get<number>("push.batchSize") ?? DEFAULT_BATCH_SIZE;
    this.maxAttempts = this.configService.get<number>("push.maxAttempts") ?? DEFAULT_MAX_ATTEMPTS;
    this.allowedProjectIds = this.configService.get<string[]>("push.allowedProjectIds") ?? [];
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

    if (await this.shouldSkipDuplicate(job)) {
      await this.markProcessed(job, false);
      return;
    }

    if (job.type === "match.new") {
      await this.ensureReciprocalMatchPush(job);
    }

    const rawTokens = await this.fetchTokens(job.user_id);
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
      const messages = batchTokens.map((token) => this.composeMessage(token, job));
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
    const otherUserId = payload.other_user_id;
    const createdAt = payload.created_at ?? new Date().toISOString();

    if (!matchId || !otherUserId) {
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
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const windowStart = new Date(Date.now() - windowMs).toISOString();

    const hasDuplicate = async (type: string, field: string, value: any, includeProcessedWindow = true) => {
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

      return false;
    };

    if (job.type === "match.new" && matchId) {
      if (await hasDuplicate("match.new", "match_id", matchId, true)) {
        return true;
      }
    }

    if (job.type === "like.received" && likerId) {
      // For likes: only skip if there is a pending identical job; allow repeat likes even if processed recently.
      if (await hasDuplicate("like.received", "liker_id", likerId, false)) {
        return true;
      }
    }

    return false;
  }

  private composeMessage(token: string, job: PushQueueRow) {
    const payload: Record<string, any> = (job.payload ?? {}) as Record<string, any>;
    let title = "Neue Nachricht";
    let body = typeof payload.preview === "string" ? payload.preview : "Du hast eine neue Nachricht";
    let ttl: number | undefined;
    if (job.type === "match.new") {
      title = "Neues Match";
      body = "Ihr könnt jetzt chatten.";
      ttl = 7 * 24 * 60 * 60; // 7 Tage, damit Match-Push lange im Center bleibt
    } else if (job.type === "like.received") {
      title = "Neues Like";
      body = "Jemand mag dein Profil.";
    } else if (job.type === "test.push") {
      title = "Push-Test";
      body = payload.message ?? "Testbenachrichtigung";
    }

    return {
      to: token,
      sound: "default",
      title,
      body,
      ...(ttl ? { ttl } : null),
      data: {
        type: job.type,
        ...payload,
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
