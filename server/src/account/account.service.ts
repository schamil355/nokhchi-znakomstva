import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../common/supabase-admin";

type PhotoAssetRecord = {
  id: number;
  storage_bucket: string | null;
  storage_path: string | null;
  blurred_bucket: string | null;
  blurred_path: string | null;
  visibility_mode: string;
  created_at: string;
};

type AccountSnapshot = {
  profile: Record<string, unknown>;
  photoAssets: PhotoAssetRecord[];
  likesGiven: any[];
  likesReceived: any[];
  passesGiven: any[];
  passesReceived: any[];
  matches: any[];
  events: any[];
  devices: any[];
  blocksAsBlocker: any[];
  blocksAsBlocked: any[];
  reportsAuthored: any[];
  reportsAgainst: any[];
};

type DeletionSummary = {
  photos: number;
  likesGiven: number;
  likesReceived: number;
  passesGiven: number;
  passesReceived: number;
  matches: number;
  events: number;
  devices: number;
  blocksAsBlocker: number;
  blocksAsBlocked: number;
  reportsAuthored: number;
  reportsAgainst: number;
};

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = getSupabaseAdminClient();
  }

  async exportAccount(userId: string) {
    const snapshot = await this.buildSnapshot(userId);
    return {
      generatedAt: new Date().toISOString(),
      profile: snapshot.profile,
      photos: snapshot.photoAssets,
      likes: {
        given: snapshot.likesGiven,
        received: snapshot.likesReceived,
      },
      passes: {
        given: snapshot.passesGiven,
        received: snapshot.passesReceived,
      },
      matches: snapshot.matches,
      events: snapshot.events,
      devices: snapshot.devices,
      blocks: {
        asBlocker: snapshot.blocksAsBlocker,
        asBlocked: snapshot.blocksAsBlocked,
      },
      reports: {
        authored: snapshot.reportsAuthored,
        againstMe: snapshot.reportsAgainst,
      },
    };
  }

  async deleteAccount(userId: string, options: { dryRun?: boolean } = {}) {
    const snapshot = await this.buildSnapshot(userId);
    const summary = this.toSummary(snapshot);

    if (options.dryRun) {
      return {
        dryRun: true,
        summary,
        generatedAt: new Date().toISOString(),
      };
    }

    await this.deletePhotoAssets(snapshot.photoAssets);
    await this.deleteRows("photo_permissions", (query) => query.eq("viewer_id", userId));
    await this.deleteRows("likes", (query) => query.or(`liker_id.eq.${userId},likee_id.eq.${userId}`));
    await this.deleteRows("passes", (query) => query.or(`passer_id.eq.${userId},passee_id.eq.${userId}`));
    await this.deleteRows("matches", (query) => query.or(`user_a.eq.${userId},user_b.eq.${userId}`));
    await this.deleteRows("events", (query) => query.eq("user_id", userId));
    await this.deleteRows("devices", (query) => query.eq("user_id", userId));
    await this.deleteRows("blocks", (query) => query.or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`));
    await this.deleteRows("reports", (query) =>
      query.or(`reporter_id.eq.${userId},reported_user_id.eq.${userId}`)
    );
    await this.deleteRows("photo_assets", (query) => query.eq("owner_id", userId));

    const { error: authError } = await this.supabase.auth.admin.deleteUser(userId);
    if (authError) {
      this.logger.error(`Failed to delete auth.user ${userId}`, authError);
      throw new InternalServerErrorException("AUTH_DELETE_FAILED");
    }

    return {
      deleted: true,
      summary,
      deletedAt: new Date().toISOString(),
    };
  }

  private async buildSnapshot(userId: string): Promise<AccountSnapshot> {
    const profile = await this.fetchProfile(userId);
    if (!profile) {
      throw new NotFoundException("PROFILE_NOT_FOUND");
    }

    const [
      photoAssets,
      likesGiven,
      likesReceived,
      passesGiven,
      passesReceived,
      matches,
      events,
      devices,
      blocksAsBlocker,
      blocksAsBlocked,
      reportsAuthored,
      reportsAgainst,
    ] = await Promise.all([
      this.selectRows<PhotoAssetRecord>("photo_assets", "*", (query) => query.eq("owner_id", userId)),
      this.selectRows("likes", "*", (query) => query.eq("liker_id", userId)),
      this.selectRows("likes", "*", (query) => query.eq("likee_id", userId)),
      this.selectRows("passes", "*", (query) => query.eq("passer_id", userId)),
      this.selectRows("passes", "*", (query) => query.eq("passee_id", userId)),
      this.selectRows("matches", "id, user_a, user_b, created_at", (query) =>
        query.or(`user_a.eq.${userId},user_b.eq.${userId}`)
      ),
      this.selectRows("events", "*", (query) => query.eq("user_id", userId)),
      this.selectRows("devices", "*", (query) => query.eq("user_id", userId)),
      this.selectRows("blocks", "*", (query) => query.eq("blocker_id", userId)),
      this.selectRows("blocks", "*", (query) => query.eq("blocked_id", userId)),
      this.selectRows("reports", "*", (query) => query.eq("reporter_id", userId)),
      this.selectRows("reports", "*", (query) => query.eq("reported_user_id", userId)),
    ]);

    return {
      profile,
      photoAssets,
      likesGiven,
      likesReceived,
      passesGiven,
      passesReceived,
      matches,
      events,
      devices,
      blocksAsBlocker,
      blocksAsBlocked,
      reportsAuthored,
      reportsAgainst,
    };
  }

  private toSummary(snapshot: AccountSnapshot): DeletionSummary {
    return {
      photos: snapshot.photoAssets.length,
      likesGiven: snapshot.likesGiven.length,
      likesReceived: snapshot.likesReceived.length,
      passesGiven: snapshot.passesGiven.length,
      passesReceived: snapshot.passesReceived.length,
      matches: snapshot.matches.length,
      events: snapshot.events.length,
      devices: snapshot.devices.length,
      blocksAsBlocker: snapshot.blocksAsBlocker.length,
      blocksAsBlocked: snapshot.blocksAsBlocked.length,
      reportsAuthored: snapshot.reportsAuthored.length,
      reportsAgainst: snapshot.reportsAgainst.length,
    };
  }

  private async fetchProfile(userId: string) {
    const { data, error } = await this.supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) {
      this.logger.error(`Failed to load profile for ${userId}`, error);
      throw new InternalServerErrorException("PROFILE_QUERY_FAILED");
    }
    return data;
  }

  private async selectRows<T = any>(
    table: string,
    columns: string,
    filter: (query: any) => any
  ): Promise<T[]> {
    try {
      let query = this.supabase.from(table).select(columns);
      query = filter(query);
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return (data as T[]) ?? [];
    } catch (error) {
      this.logger.error(`Failed to query ${table}: ${(error as Error).message}`);
      throw new InternalServerErrorException(`${table.toUpperCase()}_QUERY_FAILED`);
    }
  }

  private async deleteRows(
    table: string,
    filter: (query: any) => any
  ) {
    try {
      let query = this.supabase.from(table).delete();
      query = filter(query);
      const { error } = await query;
      if (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error(`Failed to delete from ${table}: ${(error as Error).message}`);
      throw new InternalServerErrorException(`${table.toUpperCase()}_DELETE_FAILED`);
    }
  }

  private async deletePhotoAssets(records: PhotoAssetRecord[]) {
    const bucketMap = new Map<string, string[]>();
    for (const record of records) {
      if (record.storage_bucket && record.storage_path) {
        const list = bucketMap.get(record.storage_bucket) ?? [];
        list.push(record.storage_path);
        bucketMap.set(record.storage_bucket, list);
      }
      if (record.blurred_bucket && record.blurred_path) {
        const list = bucketMap.get(record.blurred_bucket) ?? [];
        list.push(record.blurred_path);
        bucketMap.set(record.blurred_bucket, list);
      }
    }

    for (const [bucket, paths] of bucketMap.entries()) {
      for (const pathChunk of this.chunkArray(paths, 50)) {
        const { error } = await this.supabase.storage.from(bucket).remove(pathChunk);
        if (error) {
          this.logger.warn(`Failed to remove objects from ${bucket}: ${(error as Error).message}`);
        }
      }
    }
  }

  private chunkArray<T>(items: T[], size: number): T[][] {
    if (!items.length) {
      return [];
    }
    const bucket: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      bucket.push(items.slice(i, i + size));
    }
    return bucket;
  }

  async registerEmailAccount(payload: { email: string; password: string }) {
    const email = payload.email.trim().toLowerCase();
    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password: payload.password,
      email_confirm: true,
    });
    if (!error) {
      return { userId: data.user?.id, email: data.user?.email };
    }

    const message = error.message ?? "USER_NOT_CREATED";
    if (this.isUserAlreadyRegistered(error)) {
      const existing = await this.findUserByEmail(email);
      if (!existing?.id) {
        this.logger.warn(`User already registered but not found in listUsers: ${email}`);
        throw new BadRequestException("USER_NOT_FOUND");
      }

      if (!this.canAutoConfirm(existing)) {
        throw new BadRequestException("USER_ALREADY_REGISTERED");
      }

      const { data: updated, error: updateError } = await this.supabase.auth.admin.updateUserById(existing.id, {
        email_confirm: true,
      });
      if (updateError) {
        this.logger.error(`Failed to confirm existing user ${email}`, updateError);
        throw new InternalServerErrorException("USER_CONFIRM_FAILED");
      }

      return { userId: updated.user?.id ?? existing.id, email: updated.user?.email ?? existing.email };
    }

    this.logger.warn(`Failed to create user ${email}: ${message}`);
    throw new BadRequestException(message);
  }

  private isUserAlreadyRegistered(error: unknown) {
    const message = typeof (error as any)?.message === "string" ? (error as any).message.toLowerCase() : "";
    const code = typeof (error as any)?.code === "string" ? (error as any).code.toLowerCase() : "";
    return message.includes("already registered") || code === "user_already_exists";
  }

  private async findUserByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    let page = 1;
    const perPage = 1000;

    while (page) {
      const { data, error } = await this.supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        this.logger.error(`Failed to list users for ${normalized}`, error);
        throw new InternalServerErrorException("USER_LOOKUP_FAILED");
      }

      const match = data.users.find((user) => user.email?.toLowerCase() === normalized);
      if (match) {
        return match;
      }

      if (!data.nextPage) {
        break;
      }
      page = data.nextPage;
    }

    return null;
  }

  private canAutoConfirm(user: { created_at?: string | null; confirmed_at?: string | null; email_confirmed_at?: string | null }) {
    if (user.confirmed_at || user.email_confirmed_at) {
      return false;
    }
    if (!user.created_at) {
      return false;
    }
    const createdAt = Date.parse(user.created_at);
    if (Number.isNaN(createdAt)) {
      return false;
    }
    const tenMinutesMs = 10 * 60 * 1000;
    return Date.now() - createdAt <= tenMinutesMs;
  }
}
