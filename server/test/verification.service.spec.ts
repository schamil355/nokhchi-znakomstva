import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import configuration from "../src/config/configuration";
import { VerificationService } from "../src/verification/verification.service";
import { PrismaService } from "../src/database/prisma.service";
import { StorageService } from "../src/common/services/storage.service";
import { RekognitionService } from "../src/common/services/rekognition.service";
import { OtpService } from "../src/common/services/otp.service";
import { RateLimitService } from "../src/common/services/rate-limit.service";
import axios from "axios";
import { ForbiddenException, BadRequestException } from "@nestjs/common";

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const mockedAxios = axios as unknown as { get: jest.Mock };

const mockPrisma: any = {
  verificationSession: {
    updateMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  profile: {
    update: jest.fn(),
  },
  verificationArtifact: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
};

mockPrisma.$transaction = jest.fn((cb: (tx: typeof mockPrisma) => any) => cb(mockPrisma));

const mockStorage = {
  uploadTempSelfie: jest.fn(),
  deleteObject: jest.fn(),
};

const mockRekognition = {
  compareFaces: jest.fn(),
};

const mockOtpService = {
  generate: jest.fn(),
  verify: jest.fn(),
};

const mockRateLimit = {
  isRateLimited: jest.fn(),
  setWithExpiry: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
};

describe("VerificationService", () => {
  let service: VerificationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.SELFIE_HASH_SALT = "test-salt";
    mockedAxios.get.mockResolvedValue({ data: Buffer.alloc(8) } as any);
    mockPrisma.verificationSession.update.mockResolvedValue({});
    mockPrisma.profile.update.mockResolvedValue({});
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ load: [configuration] })],
      providers: [
        VerificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
        { provide: RekognitionService, useValue: mockRekognition },
        { provide: OtpService, useValue: mockOtpService },
        { provide: RateLimitService, useValue: mockRateLimit },
      ],
    }).compile();

    service = moduleRef.get(VerificationService);
  });

  it("starts a new session", async () => {
    const fakeSession = {
      id: "session-123",
      status: "pending",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
    mockPrisma.verificationSession.create.mockResolvedValue(fakeSession);

    const result = await service.startSession("user-1");
    expect(mockPrisma.verificationSession.create).toHaveBeenCalled();
    expect(result.sessionId).toBe(fakeSession.id);
    expect(result.steps).toEqual(["selfie", "otp"]);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "verification_started",
          userId: "user-1",
        }),
      })
    );
  });

  it("completes verification when selfie and OTP succeed", async () => {
    mockRateLimit.isRateLimited.mockResolvedValue(false);
    mockRekognition.compareFaces.mockResolvedValue({
      similarity: 85,
      matched: true,
      confidence: 92,
    });
    mockStorage.uploadTempSelfie.mockResolvedValue("temp/key.jpg");
    mockPrisma.verificationSession.findFirst.mockResolvedValueOnce({
      id: "session-1",
      userId: "user-1",
      status: "pending",
      expiresAt: new Date(Date.now() + 60000),
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      profilePhotoUrl: "https://cdn/profile/1.jpg",
      email: "user@example.com",
      phone: "+4912345",
      phoneVerifiedAt: null,
      emailVerifiedAt: null,
    });

    await service.uploadSelfie({
      userId: "user-1",
      sessionId: "session-1",
      captureFlag: true,
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake"),
      ip: "1.1.1.1",
    });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    mockPrisma.verificationSession.findFirst.mockResolvedValueOnce({
      id: "session-1",
      userId: "user-1",
      status: "selfie_ok",
      similarityScore: 0.7,
    });
    mockOtpService.verify.mockResolvedValue(true);

    const status = await service.verifyOtp({ userId: "user-1", sessionId: "session-1", code: "123456" });
    expect(status).toBe("completed");
    expect(mockPrisma.profile.update).toHaveBeenCalled();
    expect(mockPrisma.user.update).toHaveBeenCalled();
    expect(mockRateLimit.delete).toHaveBeenCalled();
    expect(mockStorage.deleteObject).toHaveBeenCalledWith("temp/key.jpg");
    const auditActions = mockPrisma.auditLog.create.mock.calls.map((call: any[]) => call[0]?.data?.action);
    expect(auditActions).toEqual(expect.arrayContaining(["selfie_verified", "verified"]));
  });

  it("throws when selfie does not match", async () => {
    mockRateLimit.isRateLimited.mockResolvedValue(false);
    mockRekognition.compareFaces.mockResolvedValue({
      similarity: 40,
      matched: false,
      confidence: 95,
    });
    mockStorage.uploadTempSelfie.mockResolvedValue("temp/key.jpg");
    mockPrisma.verificationSession.findFirst.mockResolvedValue({
      id: "session-2",
      userId: "user-1",
      status: "pending",
      expiresAt: new Date(Date.now() + 60000),
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      profilePhotoUrl: "https://cdn/profile/1.jpg",
    });

    await expect(
      service.uploadSelfie({
        userId: "user-1",
        sessionId: "session-2",
        captureFlag: true,
        mimeType: "image/jpeg",
        buffer: Buffer.from("fake"),
        ip: "1.1.1.1",
      })
    ).rejects.toThrow(ForbiddenException);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockRateLimit.setWithExpiry).toHaveBeenCalledWith("risk:selfie:1.1.1.1", "face_mismatch", 1800);
    const failureUpdateCall = mockPrisma.verificationSession.update.mock.calls.slice(-1)[0];
    const failureUpdate = failureUpdateCall ? failureUpdateCall[0] : null;
    expect(failureUpdate?.data?.failureReason).toBe("face_mismatch");
  });

  it("throws when liveness fails", async () => {
    mockRateLimit.isRateLimited.mockResolvedValue(false);
    mockRekognition.compareFaces.mockResolvedValue({
      similarity: 85,
      matched: true,
      confidence: 15,
    });
    mockStorage.uploadTempSelfie.mockResolvedValue("temp/key.jpg");
    mockPrisma.verificationSession.findFirst.mockResolvedValue({
      id: "session-3",
      userId: "user-1",
      status: "pending",
      expiresAt: new Date(Date.now() + 60000),
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      profilePhotoUrl: "https://cdn/profile/1.jpg",
    });

    await expect(
      service.uploadSelfie({
        userId: "user-1",
        sessionId: "session-3",
        captureFlag: true,
        mimeType: "image/jpeg",
        buffer: Buffer.from("fake"),
        ip: "1.1.1.1",
      })
    ).rejects.toThrow(new ForbiddenException("LIVENESS_FAILED"));

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockRateLimit.setWithExpiry).toHaveBeenCalledWith("risk:selfie:1.1.1.1", "liveness_failed", 1800);
    const livenessUpdateCall = mockPrisma.verificationSession.update.mock.calls.slice(-1)[0];
    const livenessUpdate = livenessUpdateCall ? livenessUpdateCall[0] : null;
    expect(livenessUpdate?.data?.failureReason).toBe("liveness_failed");
  });

  it("rate limits OTP after repeated failures", async () => {
    mockRateLimit.isRateLimited.mockResolvedValue(true);
    mockPrisma.verificationSession.findFirst.mockResolvedValue({
      id: "session-4",
      userId: "user-1",
      status: "selfie_ok",
      similarityScore: 0.7,
      expiresAt: new Date(Date.now() + 60000),
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      profilePhotoUrl: "https://cdn/profile/1.jpg",
      email: "user@example.com",
      phone: null,
      phoneVerifiedAt: null,
      emailVerifiedAt: null,
    });

    await expect(service.verifyOtp({ userId: "user-1", sessionId: "session-4", code: "111111" }))
      .rejects.toThrow(ForbiddenException);

    const cooldownActions = mockPrisma.auditLog.create.mock.calls.map((call: any[]) => call[0]?.data?.action);
    expect(cooldownActions).toContain("otp_cooldown");
  });

  it("throws OTP_INVALID and logs failure", async () => {
    mockRateLimit.isRateLimited.mockResolvedValue(false);
    mockOtpService.verify.mockResolvedValue(false);
    mockPrisma.verificationSession.findFirst.mockResolvedValue({
      id: "session-5",
      userId: "user-1",
      status: "selfie_ok",
      similarityScore: 0.7,
      expiresAt: new Date(Date.now() + 60000),
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      profilePhotoUrl: "https://cdn/profile/1.jpg",
      email: "user@example.com",
      phone: null,
    });

    await expect(service.verifyOtp({ userId: "user-1", sessionId: "session-5", code: "222222" }))
      .rejects.toThrow(BadRequestException);

    const otpActions = mockPrisma.auditLog.create.mock.calls.map((call: any[]) => call[0]?.data?.action);
    expect(otpActions).toContain("otp_failed");
  });
});
