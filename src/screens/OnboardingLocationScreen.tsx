import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  useOnboardingStore,
  LocationPermissionStatus,
  OnboardingLocation
} from "../state/onboardingStore";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { usePreferencesStore } from "../state/preferencesStore";
import { resolveGeoRegion } from "../lib/geo";

const ACCENT_COLOR = "#0d6e4f";
const HERO = require("../../assets/onboarding/step5/female_male_avatar_step_5.png");

type Props = NativeStackScreenProps<any>;

const mapPermissionStatus = (status: Location.PermissionStatus): LocationPermissionStatus => {
  switch (status) {
    case Location.PermissionStatus.GRANTED:
      return "granted";
    case Location.PermissionStatus.DENIED:
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

const persistLocationToSupabase = async (location: OnboardingLocation) => {
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
    title: "love might be just around the corner.",
    statusGranted: "Location enabled. We'll show you matches nearby.",
    statusDenied: "Location was denied. You can allow it in Settings anytime.",
    statusBlocked: "Location is blocked. Please open Settings to allow it.",
    statusUnavailable: "Location isn't available on this device.",
    activate: "Enable location",
    skip: "Later",
    settings: "Open settings",
    errorGeneric: "We couldn't determine your location. Please try again later.",
    vpnWarning: "VPN detected. Please disable your VPN to continue with location verification.",
    back: "Back",
    devTitle: "DEV",
    devStatus: "Status",
    devOpenMap: "Open map",
    permissionHint: "Requests location access"
  },
  de: {
    titleAccent: "Standort aktivieren,",
    title: "dein perfektes Match könnte ganz nah bei dir sein.",
    statusGranted: "Standort wurde aktiviert. Wir zeigen dir passende Profile in deiner Nähe.",
    statusDenied: "Standort wurde abgelehnt. Du kannst ihn jederzeit in den Einstellungen aktivieren.",
    statusBlocked: "Standort ist blockiert. Bitte öffne die Einstellungen, um ihn freizugeben.",
    statusUnavailable: "Standort ist auf diesem Gerät nicht verfügbar.",
    activate: "Standort aktivieren",
    skip: "Später",
    settings: "Einstellungen öffnen",
    errorGeneric: "Standort konnte nicht ermittelt werden. Bitte versuche es später erneut.",
    vpnWarning: "VPN erkannt. Bitte deaktiviere deine VPN, um mit der Standortprüfung fortzufahren.",
    back: "Zurück",
    devTitle: "DEV",
    devStatus: "Status",
    devOpenMap: "Auf Karte öffnen",
    permissionHint: "Fordert den Standortzugriff an"
  },
  fr: {
    titleAccent: "Active la localisation,",
    title: "l'amour est peut-être juste à côté.",
    statusGranted: "Localisation activée. Nous te montrons des profils proches.",
    statusDenied: "Localisation refusée. Tu peux l'autoriser à tout moment dans les réglages.",
    statusBlocked: "Localisation bloquée. Ouvre les réglages pour l'autoriser.",
    statusUnavailable: "Localisation indisponible sur cet appareil.",
    activate: "Activer la localisation",
    skip: "Plus tard",
    settings: "Ouvrir les réglages",
    errorGeneric: "Impossible de déterminer ta position. Réessaie plus tard.",
    vpnWarning: "VPN détecté. Désactive ton VPN pour poursuivre la vérification de localisation.",
    back: "Retour",
    devTitle: "DEV",
    devStatus: "Statut",
    devOpenMap: "Ouvrir la carte",
    permissionHint: "Demande l'accès à la localisation"
  },
  ru: {
    titleAccent: "Включи геолокацию,",
    title: "любовь может быть совсем рядом.",
    statusGranted: "Локация включена. Мы покажем тебе анкеты поблизости.",
    statusDenied: "Локация отклонена. Ты можешь разрешить её в настройках.",
    statusBlocked: "Локация заблокирована. Открой настройки, чтобы разрешить.",
    statusUnavailable: "Локация недоступна на этом устройстве.",
    activate: "Включить локацию",
    skip: "Позже",
    settings: "Открыть настройки",
    errorGeneric: "Не удалось определить местоположение. Попробуй ещё раз позже.",
    vpnWarning: "Обнаружен VPN. Отключи VPN, чтобы продолжить с проверкой местоположения.",
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
      const existing = await Location.getForegroundPermissionsAsync();
      let finalStatus = existing.status;

      if (finalStatus !== Location.PermissionStatus.GRANTED) {
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
        accuracy: Location.Accuracy.Balanced
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
        setMessage(copy.vpnWarning);
        Alert.alert(copy.vpnWarning);
        setLoading(false);
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
      await persistLocationToSupabase(nextLocation);
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
    status === "denied" || status === "blocked" || status === "unavailable";

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={copy.back}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <Ionicons name="chevron-back" size={24} color="#1f1f1f" />
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>

        <Image source={HERO} style={styles.hero} resizeMode="contain" />

        <View style={styles.titleBlock}>
          <Text style={styles.titleAccent}>{copy.titleAccent}</Text>
          <Text style={styles.title}>{copy.title}</Text>
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
            <Text>
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
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>{copy.activate}</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff"
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: "#ffffff"
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
    borderColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff"
  },
  backButtonPressed: {
    opacity: 0.7
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#f1f1f1",
    borderRadius: 999
  },
  progressFill: {
    width: "95%",
    height: "100%",
    backgroundColor: ACCENT_COLOR,
    borderRadius: 999
  },
  hero: {
    width: 220,
    height: 220,
    alignSelf: "center",
    marginBottom: 16
  },
  titleBlock: {
    alignItems: "center",
    marginBottom: 16
  },
  titleAccent: {
    fontSize: 28,
    fontWeight: "700",
    color: ACCENT_COLOR,
    textAlign: "center"
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    color: "#121212",
    textAlign: "center",
    marginTop: 4
  },
  statusMessage: {
    textAlign: "center",
    color: "#4a4a4a",
    marginBottom: 12
  },
  settingsButton: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: ACCENT_COLOR,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 16
  },
  settingsButtonPressed: {
    opacity: 0.85
  },
  settingsButtonText: {
    color: ACCENT_COLOR,
    fontWeight: "600"
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.select({ ios: 32, default: 24 }),
    backgroundColor: "#ffffff"
  },
  primaryButton: {
    backgroundColor: ACCENT_COLOR,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
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
    color: "#4a4a4a",
    fontWeight: "500"
  },
  devBox: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1e1da",
    padding: 12,
    backgroundColor: "#f4f7f5",
    gap: 4
  },
  devTitle: {
    fontWeight: "700",
    color: ACCENT_COLOR
  },
  devLink: {
    color: ACCENT_COLOR,
    marginTop: 4
  }
});

export default OnboardingLocationScreen;
