import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import SafeAreaView from "../components/SafeAreaView";
import { Ionicons } from "@expo/vector-icons";
import type * as LocationType from "expo-location";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import {
  useOnboardingStore,
  LocationPermissionStatus,
  OnboardingLocation
} from "../state/onboardingStore";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { GeoRegion, usePreferencesStore } from "../state/preferencesStore";
import { resolveGeoRegion } from "../lib/geo";
import { checkVpnStatus } from "../services/vpnService";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  pine: "#1c5d44",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};
const HERO = require("../../assets/onboarding/step5/female_male_avatar_step_5.png");
const Location =
  Platform.OS === "web"
    ? null
    : (require("expo-location") as typeof LocationType);

type Props = NativeStackScreenProps<any>;

const mapPermissionStatus = (status?: string | null): LocationPermissionStatus => {
  switch (status) {
    case "granted":
      return "granted";
    case "denied":
      return "denied";
    default:
      return "blocked";
  }
};

const toCountryCode = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    return null;
  }
  if (trimmed.length > 3) {
    return null;
  }
  return trimmed.slice(0, 2).toUpperCase();
};

const toRegionCode = (region?: GeoRegion | null) => {
  if (region === "chechnya") {
    return "CHECHNYA";
  }
  if (region === "russia") {
    return "RU";
  }
  return null;
};

const persistLocationToSupabase = async (location: OnboardingLocation, region?: GeoRegion | null) => {
  try {
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.user?.id || !location.latitude || !location.longitude) {
      return;
    }

    const payload = {
      latitude: location.latitude,
      longitude: location.longitude,
      country: toCountryCode(location.country) ?? null,
      region_code: toRegionCode(region),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("user_id", session.user.id)
      .select("id");

    if (error) {
      throw error;
    }

    if (!data?.length) {
      await supabase
        .from("profiles")
        .update(payload)
        .eq("id", session.user.id);
    }
  } catch (error) {
    console.warn("[Location] Persist failed", error);
  }
};

const translations = {
  en: {
    titleAccent: "Enable location,",
    title: "trusted connections might be nearby.",
    statusGranted: "Location enabled. We'll show you matches nearby.",
    statusDenied: "Location was denied. You can allow it in Settings anytime.",
    statusBlocked: "Location is blocked. Please open Settings to allow it.",
    statusUnavailable: "Location isn't available on this device.",
    activate: "Enable location",
    skip: "Later",
    settings: "Open settings",
    errorGeneric: "We couldn't determine your location. Please try again later.",
    vpnWarning: "VPN detected. Please turn it off to continue.",
    back: "Back",
    devTitle: "DEV",
    devStatus: "Status",
    devOpenMap: "Open map",
    permissionHint: "Requests location access"
  },
  de: {
    titleAccent: "Standort aktivieren,",
    title: "Dein Match könnte ganz nah bei dir sein.",
    statusGranted: "Standort wurde aktiviert. Wir zeigen dir passende Profile in deiner Nähe.",
    statusDenied: "Standort wurde abgelehnt. Du kannst ihn jederzeit in den Einstellungen aktivieren.",
    statusBlocked: "Standort ist blockiert. Bitte öffne die Einstellungen, um ihn freizugeben.",
    statusUnavailable: "Standort ist auf diesem Gerät nicht verfügbar.",
    activate: "Standort aktivieren",
    skip: "Später",
    settings: "Einstellungen öffnen",
    errorGeneric: "Standort konnte nicht ermittelt werden. Bitte versuche es später erneut.",
    vpnWarning: "VPN erkannt. Bitte schalte das VPN aus, um fortzufahren.",
    back: "Zurück",
    devTitle: "DEV",
    devStatus: "Status",
    devOpenMap: "Auf Karte öffnen",
    permissionHint: "Fordert den Standortzugriff an"
  },
  fr: {
    titleAccent: "Active la localisation,",
    title: "des connexions vérifiées sont peut-être proches.",
    statusGranted: "Localisation activée. Nous te montrons des profils proches.",
    statusDenied: "Localisation refusée. Tu peux l'autoriser à tout moment dans les réglages.",
    statusBlocked: "Localisation bloquée. Ouvre les réglages pour l'autoriser.",
    statusUnavailable: "Localisation indisponible sur cet appareil.",
    activate: "Activer la localisation",
    skip: "Plus tard",
    settings: "Ouvrir les réglages",
    errorGeneric: "Impossible de déterminer ta position. Réessaie plus tard.",
    vpnWarning: "VPN détecté. Désactive-le pour continuer.",
    back: "Retour",
    devTitle: "DEV",
    devStatus: "Statut",
    devOpenMap: "Ouvrir la carte",
    permissionHint: "Demande l'accès à la localisation"
  },
  ru: {
    titleAccent: "Включи геолокацию,",
    title: "проверенные связи могут быть совсем рядом с тобой.",
    statusGranted: "Локация включена. Мы покажем тебе анкеты поблизости.",
    statusDenied: "Локация отклонена. Ты можешь разрешить её в настройках.",
    statusBlocked: "Локация заблокирована. Открой настройки, чтобы разрешить.",
    statusUnavailable: "Локация недоступна на этом устройстве.",
    activate: "Включить локацию",
    skip: "Позже",
    settings: "Открыть настройки",
    errorGeneric: "Не удалось определить местоположение. Попробуй ещё раз позже.",
    vpnWarning: "Обнаружен VPN. Отключи его, чтобы продолжить.",
    back: "Назад",
    devTitle: "DEV",
    devStatus: "Статус",
    devOpenMap: "Открыть на карте",
    permissionHint: "Запрашивает доступ к геолокации"
  }
};

type IpCountryInfo = {
  name: string | null;
  code: string | null;
};

const fetchIpCountry = async (): Promise<IpCountryInfo> => {
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) {
      return { name: null, code: null };
    }
    const data = await response.json();
    return {
      name: data?.country_name ?? null,
      code: data?.country_code ? String(data.country_code).toUpperCase() : null
    };
  } catch (error) {
    console.warn("[Location] ip lookup failed", error);
    return { name: null, code: null };
  }
};

const fetchGeoCountryFromCoords = async (latitude: number, longitude: number): Promise<IpCountryInfo> => {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (!response.ok) {
      return { name: null, code: null };
    }
    const data = await response.json();
    return {
      name: data?.countryName ?? null,
      code: data?.countryCode ? String(data.countryCode).toUpperCase() : null
    };
  } catch (error) {
    console.warn("[Location] reverse geocode failed", error);
    return { name: null, code: null };
  }
};

const getWebPosition = (): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject({ code: "unavailable" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );
  });
};

const mapWebErrorStatus = (error: unknown): LocationPermissionStatus => {
  const code = typeof error === "object" && error ? (error as any).code : null;
  if (code === 1) {
    return "denied";
  }
  if (code === 2 || code === 3) {
    return "unavailable";
  }
  if (code === "unavailable") {
    return "unavailable";
  }
  return "blocked";
};

const OnboardingLocationScreen = ({ navigation }: Props) => {
  const copy = useLocalizedCopy(translations);
  const selectedGender = useOnboardingStore((state) => state.selectedGender);
  const name = useOnboardingStore((state) => state.name);
  const dob = useOnboardingStore((state) => state.dob);
  const setLocation = useOnboardingStore((state) => state.setLocation);
  const locationState = useOnboardingStore((state) => state.location);

  const [status, setStatus] = useState<LocationPermissionStatus>("idle");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const lastReverseGeocodeRef = useRef<{ latitude: number; longitude: number; timestamp: number } | null>(null);

  const ensureNoVpn = async () => {
    try {
      const result = await checkVpnStatus();
      if (result?.blocked) {
        setMessage(copy.vpnWarning);
        return false;
      }
      return true;
    } catch (error) {
      console.warn("[Location] VPN check failed", error);
      return true;
    }
  };

  useEffect(() => {
    if (!selectedGender) {
      navigation.replace("OnboardingGender");
      return;
    }
    if (!name.trim()) {
      navigation.replace("OnboardingName");
      return;
    }
    if (!dob) {
      navigation.replace("OnboardingBirthday");
    }
  }, [dob, name, navigation, selectedGender]);

  useEffect(() => {
    setStatus(locationState.status);
    if (locationState.latitude && locationState.longitude) {
      setCoords({ latitude: locationState.latitude, longitude: locationState.longitude });
    }
  }, [locationState]);

  const statusCopy = useMemo(() => {
    switch (status) {
      case "granted":
        return copy.statusGranted;
      case "denied":
        return copy.statusDenied;
      case "blocked":
        return copy.statusBlocked;
      case "unavailable":
        return copy.statusUnavailable;
      default:
        return null;
    }
  }, [copy.statusBlocked, copy.statusDenied, copy.statusGranted, copy.statusUnavailable, status]);

  const handleActivateLocation = async () => {
    setLoading(true);
    setMessage(null);
    let gpsCountryCode: string | null = null;
    try {
      if (Platform.OS === "web") {
        try {
          const position = await getWebPosition();
          const latitude = position.latitude;
          const longitude = position.longitude;
          const nextLocation: OnboardingLocation = {
            status: "granted",
            latitude,
            longitude,
            country: null,
            countryName: null
          };

          const ipCountry = await fetchIpCountry();
          const gpsCountry = await fetchGeoCountryFromCoords(latitude, longitude);
          if (gpsCountry.code) {
            nextLocation.country = gpsCountry.code;
          }
          if (gpsCountry.name) {
            nextLocation.countryName = gpsCountry.name;
          }
          if (!nextLocation.country && ipCountry.code) {
            nextLocation.country = ipCountry.code;
          }
          if (!nextLocation.countryName && ipCountry.name) {
            nextLocation.countryName = ipCountry.name;
          }

          const normalizedGpsCountry = gpsCountry.name?.toLowerCase() ?? null;
          const normalizedIpCountry = ipCountry.name?.toLowerCase() ?? null;
          const normalizedGpsIso = gpsCountry.code ?? null;
          const normalizedIpIso = ipCountry.code ?? null;
          const hasIsoMismatch =
            Boolean(normalizedGpsIso && normalizedIpIso && normalizedGpsIso !== normalizedIpIso);
          const hasFallbackMismatch =
            Boolean(
              (!normalizedGpsIso || !normalizedIpIso) &&
                normalizedGpsCountry &&
                normalizedIpCountry &&
                normalizedGpsCountry !== normalizedIpCountry
            );
          if (hasIsoMismatch || hasFallbackMismatch) {
            console.warn("[Location] Country mismatch detected", {
              gpsCountry: normalizedGpsCountry,
              ipCountry: normalizedIpCountry,
              gpsIso: normalizedGpsIso,
              ipIso: normalizedIpIso
            });
          }

          if (!(await ensureNoVpn())) {
            return;
          }

          const derivedRegion = resolveGeoRegion({
            countryName: nextLocation.countryName ?? ipCountry.name,
            countryCode: nextLocation.country ?? ipCountry.code,
            latitude,
            longitude
          });
          usePreferencesStore.getState().setFilters({ region: derivedRegion });

          setStatus("granted");
          setLocation(nextLocation);
          setCoords({ latitude, longitude });
          await persistLocationToSupabase(nextLocation, derivedRegion);
          navigation.navigate("OnboardingPhotos");
          return;
        } catch (webError) {
          const mapped = mapWebErrorStatus(webError);
          setStatus(mapped);
          setLocation({ status: mapped, latitude: null, longitude: null, country: null, countryName: null });
          if (mapped === "denied") {
            setMessage(copy.statusDenied);
          } else if (mapped === "blocked") {
            setMessage(copy.statusBlocked);
          } else {
            setMessage(copy.statusUnavailable);
          }
          return;
        }
      }

      if (!Location) {
        throw new Error("location-unavailable");
      }
      const existing = await Location.getForegroundPermissionsAsync();
      let finalStatus = existing.status;

      if (finalStatus !== "granted") {
        const requested = await Location.requestForegroundPermissionsAsync();
        finalStatus = requested.status;
      }

      const mapped = mapPermissionStatus(finalStatus);
      setStatus(mapped);

      if (mapped !== "granted") {
        setLocation({ status: mapped, latitude: null, longitude: null, country: null, countryName: null });
        if (mapped === "denied") {
          setMessage(copy.statusDenied);
        } else if (mapped === "blocked") {
          setMessage(copy.statusBlocked);
        }
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy?.Balanced ?? 3
      });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const nextLocation: OnboardingLocation = {
        status: "granted",
        latitude,
        longitude,
        country: null,
        countryName: null
      };

      const shouldReverseLookup = (() => {
        const previous = lastReverseGeocodeRef.current;
        if (!previous) {
          return true;
        }
        const deltaLat = Math.abs(previous.latitude - latitude);
        const deltaLng = Math.abs(previous.longitude - longitude);
        const timeElapsed = Date.now() - previous.timestamp;
        const distanceThreshold = 0.01; // ~1km
        const timeThreshold = 60_000; // 1 minute
        return deltaLat > distanceThreshold || deltaLng > distanceThreshold || timeElapsed > timeThreshold;
      })();

      if (shouldReverseLookup) {
        try {
          const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (place) {
            nextLocation.countryName = place.country ?? null;
            gpsCountryCode = place.isoCountryCode ? place.isoCountryCode.toUpperCase() : null;
            if (gpsCountryCode) {
              nextLocation.country = gpsCountryCode;
            }
          }
          lastReverseGeocodeRef.current = { latitude, longitude, timestamp: Date.now() };
        } catch (error) {
          console.warn("[Location] reverse geocode failed", error);
        }
      }

      const ipCountry = await fetchIpCountry();
      if (!nextLocation.country && ipCountry.code) {
        nextLocation.country = ipCountry.code;
      }
      if (!nextLocation.countryName && ipCountry.name) {
        nextLocation.countryName = ipCountry.name;
      }

      const normalizedGpsCountry = nextLocation.countryName?.toLowerCase() ?? null;
      const normalizedIpCountry = ipCountry.name?.toLowerCase() ?? null;
      const normalizedGpsIso = nextLocation.country ?? gpsCountryCode ?? null;
      const normalizedIpIso = ipCountry.code ?? null;
      const hasIsoMismatch =
        Boolean(normalizedGpsIso && normalizedIpIso && normalizedGpsIso !== normalizedIpIso);
      const hasFallbackMismatch =
        Boolean(
          (!normalizedGpsIso || !normalizedIpIso) &&
            normalizedGpsCountry &&
            normalizedIpCountry &&
            normalizedGpsCountry !== normalizedIpCountry
        );
      if (hasIsoMismatch || hasFallbackMismatch) {
        console.warn("[Location] Country mismatch detected", {
          gpsCountry: normalizedGpsCountry,
          ipCountry: normalizedIpCountry,
          gpsIso: normalizedGpsIso,
          ipIso: normalizedIpIso
        });
      }

      if (!(await ensureNoVpn())) {
        return;
      }

      const derivedRegion = resolveGeoRegion({
        countryName: nextLocation.countryName ?? ipCountry.name,
        countryCode: nextLocation.country ?? ipCountry.code,
        latitude,
        longitude
      });
      usePreferencesStore.getState().setFilters({ region: derivedRegion });

      setLocation(nextLocation);
      setCoords({ latitude, longitude });
      await persistLocationToSupabase(nextLocation, derivedRegion);
      navigation.navigate("OnboardingPhotos");
    } catch (error) {
      console.error("[Location] activation error", error);
      setStatus("unavailable");
      setLocation({ status: "unavailable", latitude: null, longitude: null, country: null, countryName: null });
      setMessage(copy.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const showSettingsCta =
    Platform.OS !== "web" && (status === "denied" || status === "blocked" || status === "unavailable");

  const handleOpenSettings = () => {
    if (Platform.OS === "web") {
      return;
    }
    Linking.openSettings().catch(() => undefined);
  };

  return (
    <LinearGradient
      colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel={copy.back}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            >
              <Ionicons name="chevron-back" size={24} color={PALETTE.gold} />
            </Pressable>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
          </View>

          <View style={styles.hero}>
            <Image source={HERO} style={styles.heroImage} resizeMode="contain" />
            <Text style={styles.heroTitleAccent}>{copy.titleAccent}</Text>
            <Text style={styles.heroTitle}>{copy.title}</Text>
          </View>

          {statusCopy && (
            <Text style={styles.statusMessage} accessibilityLiveRegion="polite">
              {statusCopy}
            </Text>
          )}

          {message && (
            <Text style={styles.statusMessage} accessibilityLiveRegion="polite">
              {message}
            </Text>
          )}

          {showSettingsCta && (
            <Pressable
              onPress={handleOpenSettings}
              accessibilityRole="button"
              accessibilityLabel={copy.settings}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsButtonPressed]}
            >
              <Text style={styles.settingsButtonText}>{copy.settings}</Text>
            </Pressable>
          )}

          {__DEV__ && (
            <View style={styles.devBox}>
              <Text style={styles.devTitle}>{copy.devTitle}</Text>
              <Text style={styles.devSubtitle}>
                {copy.devStatus}: {status}
              </Text>
              {coords && (
                <Pressable
                  onPress={() =>
                    Linking.openURL(`https://maps.google.com/?q=${coords.latitude},${coords.longitude}`)
                  }
                >
                  <Text style={styles.devLink}>
                    {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)} ({copy.devOpenMap})
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={handleActivateLocation}
            disabled={loading}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
            accessibilityHint={copy.permissionHint}
            style={({ pressed }) => [
              styles.primaryButton,
              loading && styles.primaryButtonDisabled,
              pressed && !loading && styles.primaryButtonPressed
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <LinearGradient
                colors={[PALETTE.gold, "#8b6c2a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryInner}
              >
                <Text style={styles.primaryButtonText}>{copy.activate}</Text>
              </LinearGradient>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent"
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: "transparent"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: PALETTE.gold,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  backButtonPressed: {
    opacity: 0.7
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999
  },
  progressFill: {
    width: "80%",
    height: "100%",
    backgroundColor: PALETTE.gold,
    borderRadius: 999
  },
  hero: {
    marginTop: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  heroTitleAccent: {
    fontSize: 28,
    fontWeight: "700",
    color: PALETTE.gold,
    textAlign: "center"
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: PALETTE.sand,
    textAlign: "center",
    marginTop: 4
  },
  heroImage: {
    width: 220,
    height: 220,
    marginTop: 8
  },
  statusMessage: {
    marginTop: 24,
    textAlign: "center",
    color: "rgba(242,231,215,0.8)"
  },
  settingsButton: {
    alignSelf: "center",
    marginTop: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PALETTE.gold,
    paddingHorizontal: 20,
    paddingVertical: 10
  },
  settingsButtonPressed: {
    opacity: 0.85
  },
  settingsButtonText: {
    color: PALETTE.sand,
    fontWeight: "600"
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.select({ ios: 32, default: 24 }),
    backgroundColor: "transparent"
  },
  primaryButton: {
    backgroundColor: "transparent",
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: PALETTE.gold,
    overflow: "hidden",
    marginBottom: 12
  },
  primaryInner: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    width: "100%"
  },
  primaryButtonPressed: {
    opacity: 0.85
  },
  primaryButtonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  },
  skipText: {
    textAlign: "center",
    color: "rgba(242,231,215,0.8)",
    fontWeight: "500"
  },
  devBox: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.35)",
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    gap: 4
  },
  devTitle: {
    fontWeight: "700",
    color: PALETTE.sand
  },
  devSubtitle: {
    fontSize: 13,
    color: "rgba(242,231,215,0.85)"
  },
  devLink: {
    color: PALETTE.gold,
    marginTop: 4
  }
});

export default OnboardingLocationScreen;
