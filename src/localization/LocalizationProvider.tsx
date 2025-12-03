import React, { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { getLocales } from "expo-localization";

// Allow any locale; components fall back to English if no matching copy exists.
export type SupportedLocale = string;

type LocalizationContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  ready: boolean;
};

const LocalizationContext = createContext<LocalizationContextValue>({
  locale: "en",
  setLocale: () => undefined,
  ready: true
});

let currentLocale: SupportedLocale = "en";

export const determineLocaleFromDevice = (): SupportedLocale => {
  const locales = getLocales();
  const primary = locales?.[0];
  const code = primary?.languageCode?.toLowerCase();
  const tag = primary?.languageTag?.toLowerCase();
  if (code) return code;
  if (tag) return tag.split("-")[0] ?? "en";
  return "en";
};

export const getCurrentLocale = (): SupportedLocale => currentLocale;

type ProviderProps = {
  children: ReactNode;
};

export const LocalizationProvider = ({ children }: ProviderProps) => {
  const [locale, setLocale] = useState<SupportedLocale>(determineLocaleFromDevice());

  // Keep a lightweight reference for non-React modules (services).
  currentLocale = locale;

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      ready: true
    }),
    [locale]
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
};

export const useLocale = () => useContext(LocalizationContext);

export const useLocalizedCopy = <T,>(dictionary: Record<SupportedLocale, T>): T => {
  const { locale } = useLocale();
  const fallback = (dictionary as any)?.en ?? Object.values(dictionary ?? {})[0];
  return ((dictionary as any) ?? {})[locale] ?? fallback;
};
