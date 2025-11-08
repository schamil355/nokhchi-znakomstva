import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import * as Localization from "expo-localization";
import { signUpSchema, signUpWithEmail } from "../../features/auth";
import type { z } from "zod";
import { useTranslation } from "../../lib/i18n";
import { requestLocation } from "../../lib/location";
import { getSupabase } from "../../lib/supabase";

type SignUpForm = z.infer<typeof signUpSchema>;

const CHECHNYA_CENTER = { latitude: 43.317, longitude: 45.694 };
const CHECHNYA_RADIUS_KM = 130;
const EUROPE_COUNTRIES = [
  "AD",
  "AL",
  "AT",
  "AX",
  "BA",
  "BE",
  "BG",
  "BY",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FO",
  "FR",
  "GB",
  "GG",
  "GI",
  "GR",
  "HR",
  "HU",
  "IE",
  "IM",
  "IS",
  "IT",
  "JE",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MD",
  "ME",
  "MK",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "RS",
  "SE",
  "SI",
  "SK",
  "SM",
  "UA",
  "VA",
  "XK",
];

const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;
const haversineDistanceKm = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) => {
  const earthRadiusKm = 6371;
  const dLat = degreesToRadians(b.latitude - a.latitude);
  const dLon = degreesToRadians(b.longitude - a.longitude);
  const lat1 = degreesToRadians(a.latitude);
  const lat2 = degreesToRadians(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const c = sinLat * sinLat + sinLon * sinLon * Math.cos(lat1) * Math.cos(lat2);
  const d = 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));

  return earthRadiusKm * d;
};

const toGeoPoint = (coords: { latitude: number; longitude: number }) =>
  `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`;

const normalizeCountry = (value?: string | null) => {
  if (!value) return "XX";
  return value.trim().slice(0, 2).toUpperCase();
};

const determineRegionMode = (
  country: string,
  coords: { latitude: number; longitude: number },
) => {
  if (country === "RU") {
    const distance = haversineDistanceKm(coords, CHECHNYA_CENTER);
    if (distance <= CHECHNYA_RADIUS_KM) {
      return "CHECHNYA";
    }
    return "RUSSIA";
  }
  if (EUROPE_COUNTRIES.includes(country)) {
    return "EUROPE";
  }
  return "NEARBY";
};

const SignUpScreen = (): JSX.Element => {
  const [form, setForm] = useState<SignUpForm>({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleChange = (key: keyof SignUpForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    setErrors({});
    setMessage(null);
    const result = signUpSchema.safeParse(form);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      const flat = result.error.flatten().fieldErrors;
      Object.entries(flat).forEach(([field, messages]) => {
        if (messages && messages[0]) {
          nextErrors[field] = t(messages[0]);
        }
      });
      setErrors(nextErrors);
      return;
    }

    try {
      setLoading(true);
      const location = await requestLocation();

      if (!location) {
        setMessage(t("auth.signUp.locationRequiredMessage"));
        Alert.alert(
          t("auth.signUp.locationRequiredTitle"),
          t("auth.signUp.locationRequiredMessage"),
        );
        return;
      }

      const user = await signUpWithEmail(result.data);

      if (!user?.id) {
        setMessage(t("auth.signUp.error"));
        return;
      }

      const supabase = getSupabase();
      const deviceCountry = normalizeCountry(
        Localization.region ?? Localization.isoCountryCodes?.[0],
      );
      const regionMode = determineRegionMode(deviceCountry, location);

      await supabase.from("profiles").upsert(
        {
          id: user.id,
          user_id: user.id,
          display_name: result.data.displayName,
          location: toGeoPoint(location),
          country: deviceCountry !== "XX" ? deviceCountry : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      await supabase
        .from("search_prefs")
        .upsert({ user_id: user.id, region_mode: regionMode }, { onConflict: "user_id" });

      setMessage(t("auth.signUp.success"));
    } catch (error: any) {
      setMessage(error?.message ?? t("auth.signUp.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container} testID="signUp-screen">
      <Text style={styles.title}>{t("auth.signUp.title")}</Text>
      <TextInput
        testID="signUp-displayName"
        style={[styles.input, errors.displayName && styles.inputError]}
        placeholder={t("auth.signUp.displayNamePlaceholder")}
        value={form.displayName}
        onChangeText={(text) => handleChange("displayName", text)}
      />
      {errors.displayName ? <Text style={styles.error}>{errors.displayName}</Text> : null}

      <TextInput
        testID="signUp-email"
        style={[styles.input, errors.email && styles.inputError]}
        placeholder={t("common.email")}
        autoCapitalize="none"
        keyboardType="email-address"
        value={form.email}
        onChangeText={(text) => handleChange("email", text)}
      />
      {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

      <TextInput
        testID="signUp-password"
        style={[styles.input, errors.password && styles.inputError]}
        placeholder={t("common.password")}
        secureTextEntry
        value={form.password}
        onChangeText={(text) => handleChange("password", text)}
      />
      {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}

      <TextInput
        testID="signUp-confirmPassword"
        style={[styles.input, errors.confirmPassword && styles.inputError]}
        placeholder={t("common.confirmPassword")}
        secureTextEntry
        value={form.confirmPassword}
        onChangeText={(text) => handleChange("confirmPassword", text)}
      />
      {errors.confirmPassword ? (
        <Text style={styles.error}>{errors.confirmPassword}</Text>
      ) : null}

      <Pressable
        testID="signUp-submit"
        style={[styles.primaryButton, loading && styles.disabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>{t("auth.signUp.submit")}</Text>
        )}
      </Pressable>

      <View style={styles.links}>
        <Link href="/sign-in" style={styles.linkText}>
          {t("auth.signUp.goToSignIn")}
        </Link>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#f7f7f8",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    fontSize: 16,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  error: {
    color: "#b91c1c",
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  disabled: {
    opacity: 0.7,
  },
  links: {
    marginTop: 20,
    alignItems: "center",
  },
  linkText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  message: {
    marginTop: 16,
    textAlign: "center",
    color: "#1f2933",
  },
});

export default SignUpScreen;
