import { useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname } from "expo-router";
import { useToast } from "../../components/ToastProvider";
import { useTranslation } from "../../lib/i18n";
import { useSessionStore } from "../../store/sessionStore";
import { useProfileCompletion } from "../auth/onboarding";
import { isCooldownActive, useVerificationStore } from "./store";
import {
  fetchVerificationStatus,
  sendOtp,
  startVerification,
  uploadSelfie,
  verifyOtp,
} from "./api";

export const useVerificationFlow = () => {
  const { session } = useSessionStore((state) => ({ session: state.session }));
  const accessToken = session?.access_token ?? null;
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const {
    sessionId,
    status,
    similarity,
    selfieAttempts,
    otpAttempts,
    cooldownUntil,
    errorMessage,
    setSession,
    markSelfieSuccess,
    incrementSelfieAttempts,
    incrementOtpAttempts,
    markOtpComplete,
    reset,
  } = useVerificationStore();

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("AUTH_REQUIRED");
      return startVerification(accessToken);
    },
    onSuccess: (payload) => {
      setSession(payload.sessionId);
      router.push("/verification/selfie");
    },
    onError: (error: any) => {
      showToast(error?.message ?? t("verification.errors.verificationFailed"), "error");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (uri: string) => {
      if (!accessToken || !sessionId) throw new Error("AUTH_REQUIRED");
      return uploadSelfie(accessToken, { sessionId, captureFlag: true, uri });
    },
    onSuccess: (payload) => {
      markSelfieSuccess(payload.similarity);
      router.push("/verification/otp");
    },
    onError: (error: any) => {
      const message = error?.message ?? "Selfie upload failed";
      incrementSelfieAttempts(message);
      showToast(t("verification.errors.verificationFailed"), "error");
    },
  });

  const otpMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken || !sessionId) throw new Error("AUTH_REQUIRED");
      return sendOtp(accessToken, { sessionId });
    },
    onError: (error: any) => {
      incrementOtpAttempts(error?.message);
      showToast(error?.message ?? t("verification.errors.verificationFailed"), "error");
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!accessToken || !sessionId) throw new Error("AUTH_REQUIRED");
      return verifyOtp(accessToken, { sessionId, code });
    },
    onSuccess: async () => {
      markOtpComplete();
      showToast(t("verification.success"), "success");
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      }
      router.replace("/profile");
    },
    onError: (error: any) => {
      incrementOtpAttempts(error?.message);
      showToast(t("verification.errors.otpInvalid"), "error");
    },
  });

  const refreshStatus = useCallback(async () => {
    if (!accessToken || !sessionId) return;
    try {
      const status = await fetchVerificationStatus(accessToken, sessionId);
      if (status.status === "completed") {
        markOtpComplete();
        if (userId) {
          await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
        }
      }
    } catch (error) {
      // ignore polling errors
    }
  }, [accessToken, sessionId, markOtpComplete, queryClient, userId]);

  return {
    startVerification: () => startMutation.mutate(),
    submitSelfie: (uri: string) => uploadMutation.mutate(uri),
    sendOtp: () => otpMutation.mutate(),
    verifyOtp: (code: string) => verifyOtpMutation.mutate(code),
    reset,
    status,
    sessionId,
    similarity,
    selfieAttempts,
    otpAttempts,
    cooldownUntil,
    errorMessage,
    isStarting: startMutation.isPending,
    isUploading: uploadMutation.isPending,
    isSendingOtp: otpMutation.isPending,
    isVerifyingOtp: verifyOtpMutation.isPending,
    isCooldown: isCooldownActive(cooldownUntil),
    refreshStatus,
  };
};

export const useRequireVerification = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { needsVerification } = useProfileCompletion();

  useEffect(() => {
    if (needsVerification && pathname && !pathname.startsWith("/verification")) {
      router.replace("/verification/consent");
    }
  }, [needsVerification, pathname, router]);
};
