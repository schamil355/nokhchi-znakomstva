import React, { PropsWithChildren, createContext, useContext, useMemo } from "react";
import { ColorSchemeName, useColorScheme } from "react-native";

type Palette = {
  background: string;
  surface: string;
  card: string;
  border: string;
  primary: string;
  primaryText: string;
  text: string;
  muted: string;
  accent: string;
  success: string;
  error: string;
  skeletonBase: string;
  skeletonHighlight: string;
};

type Theme = {
  colorScheme: ColorSchemeName;
  colors: Palette;
  spacing: (factor: number) => number;
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    heading: {
      fontSize: number;
      fontWeight: "700";
    };
    subtitle: {
      fontSize: number;
      color: string;
    };
    body: {
      fontSize: number;
      color: string;
    };
    small: {
      fontSize: number;
      color: string;
    };
  };
};

const lightPalette: Palette = {
  background: "#f7f7f8",
  surface: "#ffffff",
  card: "#ffffff",
  border: "#e5e7eb",
  primary: "#2563eb",
  primaryText: "#ffffff",
  text: "#1f2937",
  muted: "#6b7280",
  accent: "#9333ea",
  success: "#16a34a",
  error: "#dc2626",
  skeletonBase: "#e2e8f0",
  skeletonHighlight: "#f8fafc",
};

const darkPalette: Palette = {
  background: "#0f172a",
  surface: "#111827",
  card: "#1f2937",
  border: "#27303f",
  primary: "#3b82f6",
  primaryText: "#0f172a",
  text: "#f9fafb",
  muted: "#cbd5f5",
  accent: "#a855f7",
  success: "#22c55e",
  error: "#f87171",
  skeletonBase: "#1f2937",
  skeletonHighlight: "#374151",
};

const ThemeContext = createContext<Theme | undefined>(undefined);

export const ThemeProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const scheme = useColorScheme();

  const value = useMemo<Theme>(() => {
    const palette = scheme === "dark" ? darkPalette : lightPalette;
    return {
      colorScheme: scheme,
      colors: palette,
      spacing: (factor: number) => factor * 8,
      radius: {
        sm: 6,
        md: 12,
        lg: 18,
        xl: 24,
      },
      typography: {
        heading: {
          fontSize: 24,
          fontWeight: "700",
        },
        subtitle: {
          fontSize: 16,
          color: palette.muted,
        },
        body: {
          fontSize: 16,
          color: palette.text,
        },
        small: {
          fontSize: 14,
          color: palette.muted,
        },
      },
    };
  }, [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): Theme => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
};
