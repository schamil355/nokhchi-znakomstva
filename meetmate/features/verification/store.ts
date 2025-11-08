import { create } from "zustand";

export type VerificationStatus =
  | "idle"
  | "pending"
  | "selfie_ok"
  | "otp_ok"
  | "completed"
  | "failed";

const MAX_SELFIE_ATTEMPTS = 3;
const MAX_OTP_ATTEMPTS = 3;
const COOLDOWN_MINUTES = 5;

export type VerificationState = {
  sessionId: string | null;
  status: VerificationStatus;
  similarity?: number;
  selfieAttempts: number;
  otpAttempts: number;
  cooldownUntil?: number;
  errorMessage?: string | null;
  setSession: (sessionId: string) => void;
  markSelfieSuccess: (similarity: number) => void;
  incrementSelfieAttempts: (message?: string) => void;
  incrementOtpAttempts: (message?: string) => void;
  markOtpComplete: () => void;
  reset: () => void;
};

export const useVerificationStore = create<VerificationState>((set) => ({
  sessionId: null,
  status: "idle",
  selfieAttempts: 0,
  otpAttempts: 0,
  similarity: undefined,
  cooldownUntil: undefined,
  errorMessage: undefined,
  setSession: (sessionId) =>
    set({
      sessionId,
      status: "pending",
      similarity: undefined,
      selfieAttempts: 0,
      otpAttempts: 0,
      cooldownUntil: undefined,
      errorMessage: undefined,
    }),
  markSelfieSuccess: (similarity) =>
    set({
      status: "selfie_ok",
      similarity,
      errorMessage: undefined,
    }),
  incrementSelfieAttempts: (message) =>
    set((state) => {
      const attempts = state.selfieAttempts + 1;
      const cooldownUntil =
        attempts >= MAX_SELFIE_ATTEMPTS
          ? Date.now() + COOLDOWN_MINUTES * 60 * 1000
          : state.cooldownUntil;
      return {
        selfieAttempts: attempts,
        status: attempts >= MAX_SELFIE_ATTEMPTS ? "failed" : state.status,
        cooldownUntil,
        errorMessage: message ?? state.errorMessage,
      };
    }),
  incrementOtpAttempts: (message) =>
    set((state) => {
      const attempts = state.otpAttempts + 1;
      const cooldownUntil =
        attempts >= MAX_OTP_ATTEMPTS
          ? Date.now() + COOLDOWN_MINUTES * 60 * 1000
          : state.cooldownUntil;
      return {
        otpAttempts: attempts,
        status: attempts >= MAX_OTP_ATTEMPTS ? "failed" : state.status,
        cooldownUntil,
        errorMessage: message ?? state.errorMessage,
      };
    }),
  markOtpComplete: () =>
    set({
      status: "completed",
      errorMessage: undefined,
    }),
  reset: () =>
    set({
      sessionId: null,
      status: "idle",
      similarity: undefined,
      selfieAttempts: 0,
      otpAttempts: 0,
      cooldownUntil: undefined,
      errorMessage: undefined,
    }),
}));

export const isCooldownActive = (cooldownUntil?: number) => {
  if (!cooldownUntil) {
    return false;
  }
  return Date.now() < cooldownUntil;
};
