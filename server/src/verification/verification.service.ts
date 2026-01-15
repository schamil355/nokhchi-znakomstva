import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { StorageService } from "../common/services/storage.service";
import { RekognitionService } from "../common/services/rekognition.service";
import { OtpChannel, OtpService } from "../common/services/otp.service";
import { RateLimitService } from "../common/services/rate-limit.service";
import { createHash } from "crypto";
import { getSupabaseAdminClient } from "../common/supabase-admin";

type VerificationStatus = "pending" | "selfie_ok" | "otp_ok" | "completed" | "failed";

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly sessionTtlMinutes: number;
  private readonly tempImageTtlMinutes: number;
  private readonly requiredOnSignup: boolean;
  private readonly selfieHashSalt: string;
  private readonly supabase = getSupabaseAdminClient();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly rekognitionService: RekognitionService,
    private readonly otpService: OtpService,
    private readonly rateLimitService: RateLimitService,
    private readonly configService: ConfigService,
  ) {
    this.sessionTtlMinutes = this.configService.get<number>("verification.sessionTTLMinutes", 30);
    this.tempImageTtlMinutes = this.configService.get<number>("verification.tempImageTtlMinutes", 15);
    this.requiredOnSignup = this.configService.get<boolean>("verification.requiredOnSignup", true);
    this.selfieHashSalt = this.configService.get<string>("security.selfieHashSalt", "");
  }

  requireVerification(): boolean {
    return this.requiredOnSignup;
  }

  async startSession(userId: string) {
    const expiresAt = new Date(Date.now() + this.sessionTtlMinutes * 60 * 1000);

    await this.prisma.verificationSession.updateMany({
      where: {
        userId,
        status: { in: ["pending", "selfie_ok", "otp_ok"] },
      },
      data: {
        status: "failed",
        failureReason: "superseded",
      },
    });

    const session = await this.prisma.verificationSession.create({
      data: {
        userId,
        status: "pending",
        expiresAt,
      },
    });

    await this.recordAuditLog({
      userId,
      action: "verification_started",
      meta: {
        sessionId: session.id,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      sessionId: session.id,
      steps: ["selfie", "otp"],
      expiresAt: session.expiresAt?.toISOString(),
    };
  }

  private async getActiveSession(userId: string, sessionId: string) {
    const session = await this.prisma.verificationSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException("VERIFICATION_SESSION_NOT_FOUND");
    }
    if (session.status === "failed" || session.status === "completed") {
      throw new BadRequestException("VERIFICATION_SESSION_CLOSED");
    }
    if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
      await this.prisma.verificationSession.update({
        where: { id: sessionId },
        data: {
          status: "failed",
          failureReason: "expired",
        },
      });
      throw new BadRequestException("VERIFICATION_SESSION_EXPIRED");
    }
    return session;
  }

  async uploadSelfie(params: {
    userId: string;
    sessionId: string;
    captureFlag: boolean;
    mimeType: string;
    buffer: Buffer;
    ip: string;
  }): Promise<{ similarity: number; next: string }>
  {
    const { userId, sessionId, captureFlag, mimeType, buffer, ip } = params;
    this.logger.log(`uploadSelfie start user=${userId} session=${sessionId}`);
    if (!captureFlag) {
      throw new BadRequestException("CAMERA_CAPTURE_REQUIRED");
    }
    const rateKey = `selfie:${userId}:${ip}`;
    if (await this.rateLimitService.isRateLimited(rateKey, 5, 300)) {
      throw new ForbiddenException("SELFIE_RATE_LIMIT");
    }

    await this.getActiveSession(userId, sessionId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException("USER_NOT_FOUND");
    }

    let selfieKey: string | null = null;
    let similarityScore = 0;
    let confidenceScore = 0;
    let matched = false;
    const selfieHash = this.hashPayload(buffer);

    try {
      selfieKey = await this.storage.uploadTempSelfie(buffer, mimeType);
      this.logger.log(`uploadSelfie stored temp key=${selfieKey}`);
      const profileBuffer = await this.fetchPrimaryPhotoBuffer(userId);
      const comparison = await this.rekognitionService.compareFaces(buffer, profileBuffer);
      similarityScore = comparison.similarity / 100;
      confidenceScore = Math.min(1, comparison.confidence / 100);
      matched = comparison.matched;
    } catch (error) {
      this.logger.error(
        `uploadSelfie error user=${userId} session=${sessionId}: ${(error as Error)?.message}`,
        (error as Error)?.stack
      );
      throw error instanceof BadRequestException ? error : new InternalServerErrorException("FACE_COMPARE_FAILED");
    } finally {
      if (selfieKey) {
        await this.storage.deleteObject(selfieKey);
      }
    }

    const livenessThreshold = this.configService.get<number>("verification.livenessThreshold", 0.5);
    const livenessPassed = confidenceScore >= livenessThreshold;

    let newStatus: VerificationStatus = "failed";
    let failureReason: string | null = "face_mismatch";

    if (!livenessPassed) {
      failureReason = "liveness_failed";
    } else if (matched) {
      newStatus = "selfie_ok";
      failureReason = null;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.verificationSession.update({
        where: { id: sessionId },
        data: {
          status: newStatus,
          similarityScore,
          livenessScore: confidenceScore,
          failureReason,
        },
      });

      await this.recordAuditLog({
        userId,
        action: matched ? "selfie_verified" : "selfie_failed",
        meta: {
          sessionId,
          similarity: similarityScore,
          confidence: confidenceScore,
          selfieHash,
          ip,
        },
        tx,
      });
    });

    if (newStatus !== "selfie_ok") {
      const riskLabel = failureReason === "liveness_failed" ? "liveness_failed" : "face_mismatch";
      await this.rateLimitService.setWithExpiry(`risk:selfie:${ip}`, riskLabel, 60 * 30);
      if (failureReason === "liveness_failed") {
        throw new ForbiddenException("LIVENESS_FAILED");
      }
      throw new ForbiddenException("SELFIE_NOT_MATCHED");
    }

    return {
      similarity: similarityScore,
      next: "otp",
    };
  }

  async sendOtp(params: { userId: string; sessionId: string; channel?: OtpChannel; ip: string }) {
    const { userId, sessionId, channel, ip } = params;
    const session = await this.getActiveSession(userId, sessionId);

    const rateKey = `otp:${userId}:${ip}`;
    if (await this.rateLimitService.isRateLimited(rateKey, 5, 600)) {
      throw new ForbiddenException("OTP_RATE_LIMIT");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("USER_NOT_FOUND");
    }

    let resolvedChannel: OtpChannel;
    if (channel) {
      resolvedChannel = channel;
    } else if (user.email) {
      resolvedChannel = OtpChannel.EMAIL;
    } else if (user.phone) {
      resolvedChannel = OtpChannel.SMS;
    } else {
      throw new BadRequestException("OTP_CHANNEL_UNAVAILABLE");
    }

    if (resolvedChannel === OtpChannel.EMAIL && !user.email) {
      throw new BadRequestException("EMAIL_NOT_AVAILABLE");
    }
    if (resolvedChannel === OtpChannel.SMS && !user.phone) {
      throw new BadRequestException("PHONE_NOT_AVAILABLE");
    }

    await this.otpService.generate(userId, resolvedChannel);

    if (resolvedChannel === OtpChannel.EMAIL) {
      // integrate with mailer
      // eslint-disable-next-line no-console
      console.log(`Send email OTP to ${user.email}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`Send SMS OTP to ${user.phone}`);
    }

    await this.rateLimitService.setWithExpiry(`risk:otp:${ip}`, "otp_sent", this.configService.get<number>("otp.resendCooldownSeconds", 60));

    await this.recordAuditLog({
      userId,
      action: "otp_sent",
      meta: {
        channel: resolvedChannel,
        sessionId: session.id,
      },
    });

    return {
      channel: resolvedChannel,
      expiresIn: this.configService.get<number>("otp.expirySeconds", 300),
    };
  }

  async verifyOtp(params: { userId: string; sessionId: string; code: string }) {
    const { userId, sessionId, code } = params;
    const session = await this.getActiveSession(userId, sessionId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("USER_NOT_FOUND");
    }

    const channel = user.email ? OtpChannel.EMAIL : OtpChannel.SMS;
    const attemptKey = `otp-verify:${userId}:${sessionId}:${channel}`;
    const attemptLimited = await this.rateLimitService.isRateLimited(attemptKey, 3, 900);
    if (attemptLimited) {
      await this.recordAuditLog({
        userId,
        action: "otp_cooldown",
        meta: {
          sessionId,
          channel,
        },
      });
      throw new ForbiddenException("OTP_RATE_LIMIT");
    }

    const success = await this.otpService.verify(userId, channel, code);
    if (!success) {
      await this.recordAuditLog({
        userId,
        action: "otp_failed",
        meta: {
          sessionId,
          channel,
        },
      });
      throw new BadRequestException("OTP_INVALID");
    }

    const finalStatus: VerificationStatus = session.status === "selfie_ok" ? "completed" : "otp_ok";

    await this.prisma.$transaction(async (tx) => {
      await tx.verificationSession.update({
        where: { id: sessionId },
        data: {
          status: finalStatus,
        },
      });

      if (finalStatus === "completed") {
        await tx.profile.update({
          where: { userId },
          data: {
            verified: true,
            verifiedAt: new Date(),
            verifiedMethod: "selfie",
            verifiedScore: session.similarityScore,
          },
        });
      }

      await this.recordAuditLog({
        userId,
        action: finalStatus === "completed" ? "verified" : "otp_ok",
        meta: {
          sessionId,
        },
        tx,
      });
    });

    if (finalStatus === "completed") {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          phoneVerifiedAt: channel === OtpChannel.SMS ? new Date() : user.phoneVerifiedAt,
          emailVerifiedAt: channel === OtpChannel.EMAIL ? new Date() : user.emailVerifiedAt,
        },
      });
    }

    await this.rateLimitService.delete(attemptKey);

    return finalStatus;
  }

  async getStatus(userId: string, sessionId: string) {
    const session = await this.prisma.verificationSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });
    if (!session) {
      throw new NotFoundException("VERIFICATION_SESSION_NOT_FOUND");
    }
    return session;
  }

  async overrideVerification(userId: string, adminId: string, reason: string) {
    await this.prisma.profile.update({
      where: { userId },
      data: {
        verifiedAt: new Date(),
        verifiedMethod: "admin_override",
        verifiedScore: null,
      },
    });

    await this.recordAuditLog({
      userId,
      action: "override",
      meta: {
        reason,
        adminId,
      },
    });
  }

  async expireSessions(): Promise<void> {
    try {
      const expiredSessions = await this.prisma.verificationSession.findMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
          status: {
            in: ["pending", "selfie_ok", "otp_ok"],
          },
        },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!expiredSessions.length) {
        return;
      }

      await this.prisma.verificationSession.updateMany({
        where: {
          id: {
            in: expiredSessions.map((session: { id: string }) => session.id),
          },
        },
        data: {
          status: "failed",
          failureReason: "expired",
        },
      });

      for (const session of expiredSessions) {
        await this.recordAuditLog({
          userId: session.userId,
          action: "verification_session_expired",
          meta: {
            sessionId: session.id,
          },
        });
      }
    } catch (error) {
      const message = (error as Error)?.message ?? "";
      // Ignore prepared-statement clashes on pooled connections and try next run.
      if (message.includes('prepared statement "s0" already exists')) {
        this.logger.warn("expireSessions skipped due to prepared statement conflict; will retry next run.");
        return;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError ||
        message.toLowerCase().includes("server has closed the connection") ||
        message.toLowerCase().includes("connection") ||
        message.toLowerCase().includes("timeout")
      ) {
        this.logger.warn(`expireSessions skipped due to transient prisma error: ${message}`);
        return;
      }
      this.logger.error("expireSessions failed", error as Error);
      return;
    }
  }

  async purgeTemporaryArtifacts(): Promise<void> {
    const cutoff = new Date(Date.now() - this.tempImageTtlMinutes * 60 * 1000);
    const artifacts = await this.prisma.verificationArtifact.findMany({
      where: {
        createdAt: {
          lt: cutoff,
        },
        type: "selfie",
        storageUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        storageUrl: true,
      },
    });

    for (const artifact of artifacts) {
      if (artifact.storageUrl) {
        await this.storage.deleteObject(artifact.storageUrl);
      }
      await this.prisma.verificationArtifact.delete({ where: { id: artifact.id } });
    }
  }

  private hashPayload(buffer: Buffer): string {
    const hash = createHash("sha256");
    if (this.selfieHashSalt) {
      hash.update(this.selfieHashSalt);
    }
    hash.update(buffer);
    return hash.digest("hex");
  }

  private async fetchPrimaryPhotoBuffer(userId: string): Promise<Buffer> {
    this.logger.log(`fetchPrimaryPhotoBuffer user=${userId}`);
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { primary_photo_path: true, primary_photo_id: true },
    });
    if (!profile) {
      throw new BadRequestException("PROFILE_PHOTO_REQUIRED");
    }

    let storagePath = profile.primary_photo_path ?? undefined;
    let bucket = this.configService.get<string>("PHOTOS_ORIGINAL_BUCKET") ?? "photos_private";

    if (!storagePath && profile.primary_photo_id !== null) {
      const asset = await this.prisma.photo_assets.findUnique({
        where: { id: profile.primary_photo_id },
        select: { storage_path: true, storage_bucket: true },
      });
      if (!asset) {
        throw new BadRequestException("PROFILE_PHOTO_REQUIRED");
      }
      storagePath = asset.storage_path;
      bucket = asset.storage_bucket ?? bucket;
    }

    if (!storagePath) {
      throw new BadRequestException("PROFILE_PHOTO_REQUIRED");
    }

    const { data, error } = await this.supabase.storage.from(bucket).download(storagePath);
    if (error || !data) {
      this.logger.error(
        `PROFILE_PHOTO_DOWNLOAD_FAILED bucket=${bucket} path=${storagePath}: ${error?.message ?? "no data"}`
      );
      throw new InternalServerErrorException("PROFILE_PHOTO_DOWNLOAD_FAILED");
    }
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async recordAuditLog(params: {
    userId: string;
    action: string;
    meta?: Record<string, unknown>;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const target = params.tx ?? this.prisma;
    const metaValue = params.meta ? (params.meta as Prisma.InputJsonValue) : Prisma.JsonNull;
    await target.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        meta: metaValue,
      },
    });
  }
}
