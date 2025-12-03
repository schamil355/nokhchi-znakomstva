import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabaseClient";

export type PushStatus = "granted" | "provisional" | "denied" | "blocked" | "unavailable";

const resolveProjectId = () => {
  return (
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ||
    (Constants as any)?.manifest2?.extra?.eas?.projectId ||
    (Constants as any)?.manifest?.extra?.eas?.projectId ||
    (Constants.expoConfig?.extra?.EXPO_PROJECT_ID as string | undefined) ||
    process.env.EXPO_PROJECT_ID ||
    undefined
  );
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchPushToken = async (): Promise<{ status: PushStatus; token?: string }> => {
  if (!Device.isDevice) {
    return { status: "unavailable" };
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermissions.status;

  if (existingPermissions.status !== Notifications.PermissionStatus.GRANTED) {
    const requested = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true }
    });
    finalStatus = requested.status;
  }

  const isGranted =
    finalStatus === Notifications.PermissionStatus.GRANTED ||
    finalStatus === Notifications.PermissionStatus.PROVISIONAL;

  if (!isGranted) {
    let fallback: PushStatus = "blocked";
    if (
      finalStatus === Notifications.PermissionStatus.DENIED ||
      finalStatus === Notifications.PermissionStatus.UNDETERMINED
    ) {
      fallback = "denied";
    }
    return { status: fallback as PushStatus };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX
    });
  }

  if (__DEV__) {
    console.log("[Push] EXPO_PROJECT_ID", resolveProjectId());
  }

  let tokenResult: Notifications.ExpoPushToken | null = null;
  const projectId = resolveProjectId();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      tokenResult = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
      break;
    } catch (error: any) {
      const message = error?.message ?? String(error);
      const isLast = attempt === 2;
      const isNetwork = message.includes("connect error") || message.includes("503") || message.includes("Network");
      console.warn(`[Push] Expo token fetch failed (try ${attempt + 1}/3)`, message);
      if (isLast || !isNetwork) {
        // give up
        tokenResult = null;
        break;
      }
      await delay(600 * (attempt + 1));
    }
  }

  if (__DEV__ && tokenResult?.data) {
    console.log("[Push] Expo token", tokenResult.data);
  }

  if (!tokenResult?.data) {
    return { status: "unavailable" };
  }

  const normalizedStatus: PushStatus =
    finalStatus === Notifications.PermissionStatus.PROVISIONAL ? "provisional" : "granted";

  return { status: normalizedStatus, token: tokenResult.data };
};

export const sendTokenToBackend = async (token: string, provider: "expo" | "fcm" = "expo") => {
  const supabase = getSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    console.warn("Cannot register push token without an authenticated session.");
    return;
  }

  const payload = {
    user_id: session.user.id,
    token,
    provider,
    platform: Platform.OS,
    updated_at: new Date().toISOString(),
    project_id: resolveProjectId() ?? null
  };

  const { error } = await supabase.from("devices").upsert(payload, {
    onConflict: "user_id,token"
  });

  if (error) {
    throw error;
  }
};

export const verifyDeviceRow = async (
  supabase: SupabaseClient,
  userId: string,
  token: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from("devices")
    .select("user_id, token, provider, platform, updated_at")
    .eq("user_id", userId)
    .eq("token", token)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return Boolean(data);
};

export const sendExpoTestPush = async () => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("enqueue_test_push");
  if (error) {
    throw error;
  }
  return { enqueued: true };
};
