import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { getSupabaseAdminClient } from "../common/supabase-admin";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_ATTEMPTS = 5;

export type PushQueueRow = {
  id: number;
  user_id: string;
  type: "match.new" | "message.new";
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

  constructor(private readonly configService: ConfigService) {
    this.quietHours = parseQuietHours(this.configService.get<string>("push.quietHours"));
    this.expoAccessToken = this.configService.get<string>("push.expoAccessToken") ?? "";
    this.batchSize = this.configService.get<number>("push.batchSize") ?? DEFAULT_BATCH_SIZE;
    this.maxAttempts = this.configService.get<number>("push.maxAttempts") ?? DEFAULT_MAX_ATTEMPTS;
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
      .lte("scheduled_at", new Date().toISOString())
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

    const tokens = await this.fetchTokens(job.user_id);
    if (!tokens.length) {
      await this.markProcessed(job, false);
      return;
    }

    const messages = tokens.map((token) => this.composeMessage(token, job));
    const results = await this.sendExpoBatch(messages);
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

  private async fetchTokens(userId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("devices")
      .select("token")
      .eq("user_id", userId);

    if (error) {
      this.logger.error(`Failed to load devices for ${userId}`, error);
      return [];
    }

    return (data ?? []).map((row) => row.token).filter(Boolean);
  }

  private composeMessage(token: string, job: PushQueueRow) {
    const payload: Record<string, any> = (job.payload ?? {}) as Record<string, any>;
    const title = job.type === "match.new" ? "Neues Match" : "Neue Nachricht";
    const preview: string = typeof payload.preview === "string" ? payload.preview : "Du hast eine neue Nachricht";

    return {
      to: token,
      sound: "default",
      title,
      body: job.type === "match.new" ? "Ihr könnt jetzt chatten." : preview,
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
        this.logger.error("Expo push request failed", error as Error);
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
