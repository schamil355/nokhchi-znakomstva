import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import NetInfo from "@react-native-community/netinfo";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useAuthStore } from "../state/authStore";

const ensureProfileExists = async (supabase: ReturnType<typeof getSupabaseClient>, userId: string) => {
  const { data: profileRow } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (profileRow?.id) {
    return true;
  }
  const { error: upsertError } = await supabase.from("profiles").upsert({
    id: userId,
    user_id: userId,
    created_at: new Date().toISOString()
  });
  if (upsertError) {
    console.warn("Push registration: failed to upsert profile row", upsertError.message ?? upsertError);
    return false;
  }
  return true;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // On iOS use banner/list (no alert); on Android keep alert.
    shouldShowAlert: Platform.OS !== "ios",
    shouldShowBanner: Platform.OS === "ios",
    shouldShowList: Platform.OS === "ios",
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export const registerPushNotifications = async () => {
  try {
    if (!Device.isDevice) {
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Push permission denied");
      return;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      // manifest2 exists in EAS build/runtime; fall back to manifest for dev.
      (Constants as any).manifest2?.extra?.eas?.projectId ??
      (Constants as any).manifest?.extra?.eas?.projectId;

    let token;
    try {
      token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
      console.log("[Push] Expo token fetched", token?.data);
    } catch (tokenError) {
      console.warn("Failed to fetch Expo push token", tokenError);
      return;
    }

    if (!token?.data) {
      return;
    }

    const auth = useAuthStore.getState();
    if (!auth.session) {
      return;
    }

    const supabase = getSupabaseClient();

    const hasProfile = await ensureProfileExists(supabase, auth.session.user.id);
    if (!hasProfile) {
      return;
    }

    const platform = Platform.OS;
    if (platform !== "ios" && platform !== "android") {
      console.warn(`Push registration skipped for unsupported platform: ${platform}`);
      return;
    }

    // Avoid noisy errors when offline or misconfigured
    const netInfo = await NetInfo.fetch();
    const offline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
    if (offline) {
      console.warn("Push registration skipped: no network connectivity");
      return;
    }

    const supabaseUrl =
      Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
    const supabaseAnonKey =
      Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("Push registration skipped: Supabase credentials missing");
      return;
    }

    const suffix = token.data ? token.data.slice(-6) : "unknown";
    try {
      await supabase.from("devices").delete().eq("token", token.data);
      const { error } = await supabase.from("devices").upsert(
        {
          user_id: auth.session.user.id,
          token: token.data,
          platform,
          provider: "expo",
          updated_at: new Date().toISOString(),
          project_id: projectId ?? null
        },
        {
          onConflict: "token"
        }
      );

      if (error) {
        const message = error.message ?? String(error);
        if (message.includes("Network request failed") || message.includes("AbortError")) {
          console.warn(`Push token deferred (...${suffix}) due to network issue`);
          return;
        }
        console.warn(`Failed to register push token (...${suffix})`, message);
      }
    } catch (error: any) {
      const message = error?.message ?? String(error);
      if (message.includes("Network request failed") || message.includes("AbortError")) {
        console.warn(`Push token deferred (...${suffix}) due to network issue`);
        return;
      }
      console.warn(`Failed to register push token (...${suffix})`, message);
    }
  } catch (error) {
    console.warn("registerPushNotifications failed", error);
  }
};
