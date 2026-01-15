import "dotenv/config";

export default ({ config }) => ({
  ...config,
  name: "Нохчи Знакомства",
  slug: "meetmate-clean",
  runtimeVersion: "1.0.0",
  ios: {
    ...(config.ios ?? {}),
    bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_ID ?? "com.zelimkhan.meetmate-clean",
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      CFBundleDisplayName: "Нохчи Знакомства",
      NSCameraUsageDescription: "Доступ к камере нужен, чтобы сделать или обновить твои профильные фото.",
      NSFaceIDUsageDescription: "Доступ к Face ID нужен, чтобы быстро входить в приложение и подтверждать действия.",
      NSPhotoLibraryUsageDescription: "Доступ к фотогалерее нужен, чтобы загружать и выбирать твои фото для профиля.",
      NSPhotoLibraryAddUsageDescription: "Разреши сохранять фото, чтобы мы могли сохранять твои профильные снимки в галерее.",
      NSLocationWhenInUseUsageDescription: "Доступ к геолокации нужен, чтобы показывать профили поблизости и работать \"Невидимка рядом\".",
      NSMicrophoneUsageDescription: "Доступ к микрофону нужен для записи голосовых сообщений."
    }
  },
  android: {
    ...(config.android ?? {}),
    package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE ?? "com.zelimkhan.meetmateclean",
    appName: "Нохчи Знакомства"
  },
  web: {
    ...(config.web ?? {}),
    name: "Нохчи Знакомства",
    shortName: "Нохчи",
    themeColor: "#0b1f16",
    backgroundColor: "#0b1f16",
    display: "standalone",
    startUrl: "/?source=pwa"
  },
  splash: {
    image: "./assets/icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  extra: {
    ...(config.extra ?? {}),
    eas: {
      ...(config.extra?.eas ?? {}),
      projectId: "8d41929c-2173-4a52-a275-9d09896a2b0c"
    },
    emailRedirectUrl: process.env.EXPO_PUBLIC_EMAIL_REDIRECT_URL,
    EXPO_PROJECT_ID: process.env.EXPO_PROJECT_ID,
    EXPO_PUBLIC_STORAGE_PUBLIC: process.env.EXPO_PUBLIC_STORAGE_PUBLIC,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_VERIFY_PROVIDER: process.env.EXPO_PUBLIC_VERIFY_PROVIDER,
    EXPO_PUBLIC_VERIFY_ENDPOINT: process.env.EXPO_PUBLIC_VERIFY_ENDPOINT,
    EXPO_PUBLIC_EXPO_PUSH_ACCESS_TOKEN: process.env.EXPO_PUBLIC_EXPO_PUSH_ACCESS_TOKEN,
    EXPO_PUBLIC_WEB_PUSH_VAPID_KEY: process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_KEY
  }
});
