import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import multer from "multer";
import { Request } from "express";
import { VerificationService } from "./verification.service";
import { StartVerificationResponseDto } from "./dto/start-verification.dto";
import { UploadSelfieDto, UploadSelfieResponseDto } from "./dto/upload-selfie.dto";
import { SendOtpDto, SendOtpResponseDto } from "./dto/send-otp.dto";
import { VerifyOtpDto, VerifyOtpResponseDto } from "./dto/verify-otp.dto";
import { VerificationStatusResponseDto } from "./dto/status-response.dto";
import { OverrideVerificationDto } from "./dto/override.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { AdminGuard } from "../common/guards/admin.guard";
import { OtpChannel } from "../common/services/otp.service";

@ApiTags("verification")
@ApiBearerAuth()
@Controller({ path: "v1/verification" })
@UseGuards(JwtAuthGuard)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post("start")
  @ApiOperation({ summary: "Start a new verification session" })
  async start(@Req() req: Request): Promise<StartVerificationResponseDto> {
    const userId = req.user?.id as string;
    const session = await this.verificationService.startSession(userId);
    return {
      ...session,
    };
  }

  @Post("upload-selfie")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        sessionId: { type: "string", format: "uuid" },
        captureFlag: { type: "boolean" },
        selfie: { type: "string", format: "binary" },
      },
      required: ["sessionId", "captureFlag", "selfie"],
    },
  })
  @UseInterceptors(FileInterceptor("selfie", { storage: multer.memoryStorage() }))
  async uploadSelfie(
    @Req() req: Request,
    @Body() body: UploadSelfieDto,
    @UploadedFile() file: Express.Multer.File
  ): Promise<UploadSelfieResponseDto> {
    if (!file) {
      throw new BadRequestException("SELFIE_REQUIRED");
    }
    const userId = req.user?.id as string;
    const result = await this.verificationService.uploadSelfie({
      userId,
      sessionId: body.sessionId,
      captureFlag: body.captureFlag,
      mimeType: file.mimetype,
      buffer: file.buffer,
      ip: req.ip ?? "",
    });
    return {
      ok: true,
      similarity: result.similarity,
      next: result.next,
    };
  }

  @Post("send-otp")
  async sendOtp(@Req() req: Request, @Body() body: SendOtpDto): Promise<SendOtpResponseDto> {
    const userId = req.user?.id as string;
    const response = await this.verificationService.sendOtp({
      userId,
      sessionId: body.sessionId,
      channel: body.channel,
      ip: req.ip ?? "",
    });
    return response;
  }

  @Post("verify-otp")
  async verifyOtp(@Req() req: Request, @Body() body: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    const userId = req.user?.id as string;
    const status = await this.verificationService.verifyOtp({
      userId,
      sessionId: body.sessionId,
      code: body.code,
    });
    return { status };
  }

  @Get("status")
  async status(@Req() req: Request, @Query("sessionId") sessionId: string): Promise<VerificationStatusResponseDto> {
    const userId = req.user?.id as string;
    const session = await this.verificationService.getStatus(userId, sessionId);
    return {
      sessionId: session.id,
      status: session.status,
      similarityScore: session.similarityScore ?? undefined,
      livenessScore: session.livenessScore ?? undefined,
      failureReason: session.failureReason ?? undefined,
      expiresAt: session.expiresAt?.toISOString(),
    };
  }

  @Post("override")
  @UseGuards(AdminGuard)
  async override(@Req() req: Request, @Body() body: OverrideVerificationDto) {
    await this.verificationService.overrideVerification(body.userId, req.user?.id as string, body.reason);
    return { ok: true };
  }
}
