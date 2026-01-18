import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { RateLimitService } from "../common/services/rate-limit.service";
import { getSupabaseAdminClient } from "../common/supabase-admin";
import { GrantPhotoDto } from "./dto/grant-photo.dto";
import { RegisterPhotoDto, VisibilityMode } from "./dto/register-photo.dto";
import { ViewPhotoDto } from "./dto/view-photo.dto";

type PhotoRecord = {
  id: number;
  owner_id: string;
  storage_bucket: string;
  storage_path: string;
  blurred_bucket: string | null;
  blurred_path: string | null;
  visibility_mode: VisibilityMode;
};

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);
  private readonly supabase: SupabaseClient;
  private readonly signTtlSeconds: number;
  private readonly originalBucket: string;
  private readonly blurredBucket: string;

  constructor(private readonly rateLimitService: RateLimitService, configService: ConfigService) {
    this.supabase = getSupabaseAdminClient();
    this.signTtlSeconds = Number(configService.get("SIGN_TTL_SECONDS") ?? 120);
    this.originalBucket = configService.get<string>("PHOTOS_ORIGINAL_BUCKET") ?? "photos_private";
    this.blurredBucket = configService.get<string>("PHOTOS_BLURRED_BUCKET") ?? "photos_blurred";
  }

  async registerPhoto(ownerId: string, payload: RegisterPhotoDto) {
    const rateKey = `photo:register:${ownerId}`;
    if (await this.rateLimitService.isRateLimited(rateKey, 30, 60)) {
      throw new ForbiddenException("RATE_LIMITED");
    }

    if (!payload.storagePath?.includes("/")) {
      throw new BadRequestException("INVALID_STORAGE_PATH");
    }
    if (!payload.storagePath.startsWith(`${ownerId}/`)) {
      throw new ForbiddenException("CANNOT_REGISTER_FOREIGN_PHOTO");
    }

    const originalBuffer = await this.downloadOriginal(payload.storagePath);
    const blurredBuffer = await this.createBlurredVariant(originalBuffer);
    const blurredPath = this.composeBlurredPath(payload.storagePath);

    await this.uploadBlurred(blurredPath, blurredBuffer);

    const { data, error } = await this.supabase
      .from("photo_assets")
      .insert({
        owner_id: ownerId,
        storage_bucket: this.originalBucket,
        storage_path: payload.storagePath,
        blurred_bucket: this.blurredBucket,
        blurred_path: blurredPath,
        visibility_mode: payload.visibility_mode,
      })
      .select("id")
      .single();

    if (error || !data) {
      const reason = error?.message ?? error?.details ?? "PHOTO_ASSET_INSERT_FAILED";
      this.logger.error("Failed to persist photo asset", error);
      throw new BadRequestException(reason);
    }

    return { photoId: data.id };
  }

  async viewPhoto(viewerId: string, payload: ViewPhotoDto) {
    const rateKey = `photo:view:${viewerId}:${payload.photoId}`;
    if (await this.rateLimitService.isRateLimited(rateKey, 60, 60)) {
      throw new ForbiddenException("RATE_LIMITED");
    }

    const photo = await this.getPhotoRecord(payload.photoId);
    await this.ensureNotBlocked(viewerId, photo.owner_id);

    const canViewOriginal = await this.canViewOriginal(viewerId, photo);
    const requested = payload.variant ?? "original";
    let modeToServe: "original" | "blur" = requested;

    if (requested === "original" && !canViewOriginal) {
      modeToServe = "blur";
    }
    if (requested === "blur" && canViewOriginal === false && !photo.blurred_path) {
      throw new ForbiddenException("NO_BLURRED_VARIANT");
    }

    if (modeToServe === "blur" && !photo.blurred_path) {
      modeToServe = canViewOriginal ? "original" : modeToServe;
    }

    const bucket = modeToServe === "original" ? photo.storage_bucket : photo.blurred_bucket;
    const path = modeToServe === "original" ? photo.storage_path : photo.blurred_path;

    if (!bucket || !path) {
      throw new NotFoundException("PHOTO_SOURCE_MISSING");
    }

    const signedUrl = await this.createSignedUrl(bucket, path, this.signTtlSeconds);
    return { url: signedUrl, modeReturned: modeToServe };
  }

  async grantAccess(ownerId: string, payload: GrantPhotoDto) {
    const photo = await this.getPhotoRecord(payload.photoId);
    if (photo.owner_id !== ownerId) {
      throw new ForbiddenException("NOT_OWNER");
    }
    const expiresAt =
      payload.expiresInSeconds && payload.expiresInSeconds > 0
        ? new Date(Date.now() + payload.expiresInSeconds * 1000).toISOString()
        : null;

    const { error } = await this.supabase.from("photo_permissions").upsert({
      photo_id: payload.photoId,
      viewer_id: payload.viewerId,
      expires_at: expiresAt,
    });
    if (error) {
      this.logger.error("Failed to upsert photo permission", error);
      throw new BadRequestException("PHOTO_PERMISSION_FAILED");
    }
    return { ok: true };
  }

  async revokePermission(ownerId: string, payload: GrantPhotoDto) {
    const photo = await this.getPhotoRecord(payload.photoId);
    if (photo.owner_id !== ownerId) {
      throw new ForbiddenException("NOT_OWNER");
    }
    const { error } = await this.supabase
      .from("photo_permissions")
      .delete()
      .eq("photo_id", payload.photoId)
      .eq("viewer_id", payload.viewerId);
    if (error) {
      this.logger.error("Failed to revoke photo permission", error);
      throw new BadRequestException("PHOTO_PERMISSION_FAILED");
    }
    return { revoked: true };
  }

  async revokeAllPermissions(ownerId: string, photoId: number) {
    const photo = await this.getPhotoRecord(photoId);
    if (photo.owner_id !== ownerId) {
      throw new ForbiddenException("NOT_OWNER");
    }
    const { error } = await this.supabase.from("photo_permissions").delete().eq("photo_id", photoId);
    if (error) {
      this.logger.error("Failed to revoke permissions", error);
      throw new BadRequestException("PHOTO_PERMISSION_FAILED");
    }
    return { revokedAll: true };
  }

  async deletePhoto(ownerId: string, photoId: number) {
    const rateKey = `photo:delete:${ownerId}`;
    if (await this.rateLimitService.isRateLimited(rateKey, 30, 60)) {
      throw new ForbiddenException("RATE_LIMITED");
    }

    const photo = await this.getPhotoRecord(photoId);
    if (photo.owner_id !== ownerId) {
      throw new ForbiddenException("NOT_OWNER");
    }

    await this.performPhotoDeletion(photo);
    return { deleted: true, photoId };
  }

  async bulkDelete(ownerId: string) {
    const { data, error } = await this.supabase.from("photo_assets").select("*").eq("owner_id", ownerId);
    if (error) {
      this.logger.error("Failed to list photos", error);
      throw new BadRequestException("PHOTO_LIST_FAILED");
    }
    const photos = (data ?? []) as PhotoRecord[];
    let deletedCount = 0;
    for (const photo of photos) {
      try {
        await this.performPhotoDeletion(photo);
        deletedCount += 1;
      } catch (err) {
        this.logger.warn(`Failed to delete photo ${photo.id}: ${(err as Error).message}`);
      }
    }
    return { deletedCount };
  }

  private async downloadOriginal(storagePath: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage.from(this.originalBucket).download(storagePath);
    if (error || !data) {
      this.logger.error(`Failed to download original photo ${storagePath}`, error);
      throw new NotFoundException("PHOTO_NOT_FOUND");
    }
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async createBlurredVariant(original: Buffer): Promise<Buffer> {
    return sharp(original).resize({ width: 256, withoutEnlargement: true }).blur(20).jpeg({ quality: 60 }).toBuffer();
  }

  private composeBlurredPath(originalPath: string) {
    const dotIndex = originalPath.lastIndexOf(".");
    if (dotIndex === -1) {
      return `${originalPath}_blur.jpg`;
    }
    const base = originalPath.slice(0, dotIndex);
    const ext = originalPath.slice(dotIndex);
    return `${base}_blur${ext}`;
  }

  private async uploadBlurred(path: string, buffer: Buffer) {
    const { error } = await this.supabase.storage.from("photos_blurred").upload(path, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (error) {
      this.logger.error("Failed to upload blurred photo", error);
      throw new BadRequestException("BLURRED_UPLOAD_FAILED");
    }
  }

  private async getPhotoRecord(photoId: number): Promise<PhotoRecord> {
    const { data, error } = await this.supabase.from("photo_assets").select("*").eq("id", photoId).single();
    if (error || !data) {
      throw new NotFoundException("PHOTO_NOT_FOUND");
    }
    return data as PhotoRecord;
  }

  private async ensureNotBlocked(viewerId: string, ownerId: string) {
    const { data, error } = await this.supabase
      .from("blocks")
      .select("blocker_id, blocked_id")
      .or(`and(blocker_id.eq.${viewerId},blocked_id.eq.${ownerId}),and(blocker_id.eq.${ownerId},blocked_id.eq.${viewerId})`)
      .maybeSingle();
    if (error) {
      this.logger.error("Failed to inspect block state", error);
      throw new BadRequestException("BLOCK_CHECK_FAILED");
    }
    if (data) {
      throw new ForbiddenException("BLOCKED");
    }
  }

  private async canViewOriginal(viewerId: string, photo: PhotoRecord): Promise<boolean> {
    if (viewerId === photo.owner_id) {
      return true;
    }

    switch (photo.visibility_mode) {
      case "public":
        return true;
      case "match_only":
        return this.isMatched(viewerId, photo.owner_id);
      case "whitelist":
        return this.isWhitelisted(photo.id, viewerId);
      case "blurred_until_match":
        return (await this.isMatched(viewerId, photo.owner_id)) || (await this.isWhitelisted(photo.id, viewerId));
      default:
        return false;
    }
  }

  private async isMatched(viewerId: string, ownerId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("matches")
      .select("id")
      .or(`and(user_a.eq.${viewerId},user_b.eq.${ownerId}),and(user_a.eq.${ownerId},user_b.eq.${viewerId})`)
      .maybeSingle();
    if (error) {
      this.logger.error("Failed to check match state", error);
      throw new BadRequestException("MATCH_CHECK_FAILED");
    }
    return Boolean(data);
  }

  private async isWhitelisted(photoId: number, viewerId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("photo_permissions")
      .select("photo_id, expires_at")
      .eq("photo_id", photoId)
      .eq("viewer_id", viewerId)
      .maybeSingle();
    if (error) {
      this.logger.error("Failed to read photo permissions", error);
      throw new BadRequestException("PERMISSION_CHECK_FAILED");
    }
    if (!data) {
      return false;
    }
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return false;
    }
    return true;
  }

  private async createSignedUrl(bucket: string, path: string, expiresIn: number): Promise<string> {
    const { data, error } = await this.supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error || !data) {
      this.logger.error(`Failed to sign url for ${bucket}/${path}`, error);
      throw new BadRequestException("SIGN_URL_FAILED");
    }
    return data.signedUrl;
  }

  private async deleteStorageObject(bucket: string | null, path: string | null) {
    if (!bucket || !path) {
      return;
    }
    const { error } = await this.supabase.storage.from(bucket).remove([path]);
    if (error) {
      this.logger.warn(`Failed to delete storage object ${bucket}/${path}: ${error.message}`);
    }
  }

  private async performPhotoDeletion(photo: PhotoRecord) {
    await this.supabase.from("photo_permissions").delete().eq("photo_id", photo.id);
    await this.deleteStorageObject(photo.storage_bucket, photo.storage_path);
    await this.deleteStorageObject(photo.blurred_bucket, photo.blurred_path);
    const { error } = await this.supabase.from("photo_assets").delete().eq("id", photo.id);
    if (error) {
      this.logger.error("Failed to delete photo asset", error);
      throw new BadRequestException("PHOTO_DELETE_FAILED");
    }
  }
}
