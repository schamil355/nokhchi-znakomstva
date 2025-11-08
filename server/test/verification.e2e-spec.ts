import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { VerificationController } from "../src/verification/verification.controller";
import { VerificationService } from "../src/verification/verification.service";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";

const mockVerificationService = {
  startSession: jest.fn().mockResolvedValue({
    sessionId: "session-123",
    steps: ["selfie", "otp"],
    expiresAt: new Date().toISOString(),
  }),
  uploadSelfie: jest.fn(),
  sendOtp: jest.fn(),
  verifyOtp: jest.fn(),
  getStatus: jest.fn(),
  overrideVerification: jest.fn(),
};

class MockAuthGuard {
  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = { id: "user-1", role: "user" };
    return true;
  }
}

describe("VerificationController (integration)", () => {
  let app: INestApplication;
  let controller: VerificationController;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [VerificationController],
      providers: [
        { provide: VerificationService, useValue: mockVerificationService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    controller = app.get(VerificationController);
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /v1/verification/start", async () => {
    const req: any = { user: { id: "user-1", role: "user" } };
    const res = await controller.start(req);
    expect(res.sessionId).toBe("session-123");
    expect(res.steps).toEqual(["selfie", "otp"]);
  });
});
