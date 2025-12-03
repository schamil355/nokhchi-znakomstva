export default () => ({
  verification: {
    sessionTTLMinutes: parseInt(process.env.VERIFICATION_SESSION_TTL ?? "30", 10),
    tempImageTtlMinutes: parseInt(process.env.VERIFICATION_IMAGE_TTL ?? "15", 10),
    requiredOnSignup: (process.env.VERIFICATION_REQUIRED_ON_SIGNUP ?? "true") === "true",
  },
  s3: {
    bucket: process.env.SELFIE_BUCKET ?? "",
    region: process.env.AWS_REGION ?? "eu-central-1",
    kmsKeyId: process.env.SELFIE_KMS_KEY_ID ?? undefined,
    tempPrefix: process.env.SELFIE_TEMP_PREFIX ?? "temp/verification",
  },
  rekognition: {
    region: process.env.REKOGNITION_REGION ?? "eu-central-1",
    endpoint: process.env.REKOGNITION_ENDPOINT,
    similarityThreshold: parseFloat(process.env.REKOGNITION_SIMILARITY_THRESHOLD ?? "80"),
  },
  otp: {
    expirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS ?? "300", 10),
    resendCooldownSeconds: parseInt(process.env.OTP_RESEND_SECONDS ?? "60", 10),
  },
  security: {
    selfieHashSalt: process.env.SELFIE_HASH_SALT ?? "",
  },
  push: {
    quietHours: process.env.QUIET_HOURS ?? null,
    expoAccessToken: process.env.EXPO_PUSH_ACCESS_TOKEN ?? "",
    batchSize: parseInt(process.env.PUSH_BATCH_SIZE ?? "50", 10),
    maxAttempts: parseInt(process.env.PUSH_MAX_ATTEMPTS ?? "5", 10),
    allowedProjectIds: (process.env.EXPO_ALLOWED_PROJECT_IDS ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  },
});
