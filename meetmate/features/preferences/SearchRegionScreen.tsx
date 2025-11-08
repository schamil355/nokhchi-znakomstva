import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSearchPrefs, SearchRegionMode } from "./useSearchPrefs";
import { useToast } from "../../components/ToastProvider";
import { useTranslation } from "../../lib/i18n";

const OPTIONS: Array<{ value: SearchRegionMode; translationKey: string }> = [
  { value: "NEARBY", translationKey: "prefs.region.nearby" },
  { value: "CHECHNYA", translationKey: "prefs.region.chechnya" },
  { value: "EUROPE", translationKey: "prefs.region.europe" },
  { value: "RUSSIA", translationKey: "prefs.region.russia" },
];

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const CHECHNYA_CENTER = { latitude: 43.317, longitude: 45.694 };
const CHECHNYA_RADIUS_KM = 160;
const EUROPE_COUNTRIES: Array<"FR" | "DE" | "AT" | "BE" | "NO"> = [
  "FR",
  "DE",
  "AT",
  "BE",
  "NO",
];
const RUSSIA_CITIES = ["moscow", "saintPetersburg", "kazan", "novosibirsk"] as const;

type Params = {
  from?: string;
};

const SearchRegionScreen = (): JSX.Element => {
  const { prefs, isLoading, update, isUpdating } = useSearchPrefs();
  const [selection, setSelection] = useState<SearchRegionMode>("NEARBY");
  const { t } = useTranslation();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useLocalSearchParams<Params>();

  useEffect(() => {
    if (prefs) {
      setSelection(prefs.regionMode);
    }
  }, [prefs]);

  const loading = isLoading && !prefs;

  const optionItems = useMemo(
    () =>
      OPTIONS.map((option) => {
        const isActive = selection === option.value;
        return (
          <Pressable
            key={option.value}
            testID={`prefs-region-option-${option.value.toLowerCase()}`}
            onPress={() => setSelection(option.value)}
            style={[styles.option, isActive && styles.optionActive]}
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
          >
            <View style={[styles.radioOuter, isActive && styles.radioOuterActive]}>
              {isActive ? <View style={styles.radioInner} /> : null}
            </View>
            <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
              {t(option.translationKey)}
            </Text>
          </Pressable>
        );
      }),
    [selection, t],
  );

  const handleSave = async () => {
    try {
      await update({ regionMode: selection });
      showToast(t("prefs.region.saved"), "success");
      const from = params.from;
      if (from === "onboarding") {
        router.replace("/discovery");
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/discovery");
      }
    } catch (error: any) {
      showToast(error?.message ?? t("errors.generic"), "error");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("prefs.region.title")}</Text>
      <View style={styles.segmented} accessibilityRole="radiogroup">
        {optionItems}
      </View>
      <RegionPreview mode={selection} />
      <Pressable
        testID="prefs-region-save"
        style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>{t("common.save")}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 24,
    backgroundColor: "#f7f7f8",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  segmented: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionActive: {
    borderColor: "#2563eb",
    backgroundColor: "rgba(37, 99, 235, 0.08)",
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#cbd5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioOuterActive: {
    borderColor: "#2563eb",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563eb",
  },
  optionLabel: {
    fontSize: 16,
    color: "#1e293b",
    flexShrink: 1,
  },
  optionLabelActive: {
    fontWeight: "600",
    color: "#0f172a",
  },
  previewCard: {
    borderRadius: 18,
    backgroundColor: "#fff",
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },
  previewBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  previewBadge: {
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#2563eb1a",
  },
  previewBadgeText: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  previewFallback: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },
  previewFallbackText: {
    color: "#4b5563",
  },
  saveButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

type RegionPreviewProps = {
  mode: SearchRegionMode;
};

const RegionPreview = ({ mode }: RegionPreviewProps) => {
  if (mode === "CHECHNYA") {
    return <ChechnyaPreview />;
  }
  if (mode === "EUROPE") {
    return <EuropePreview />;
  }
  if (mode === "RUSSIA") {
    return <RussiaPreview />;
  }
  return <NearbyPreview />;
};

const ChechnyaPreview = () => {
  const { t } = useTranslation();
  const mapUrl = useMemo(() => {
    if (!MAPBOX_TOKEN) {
      return null;
    }
    const coordinates = generateCircleCoordinates(
      CHECHNYA_CENTER,
      CHECHNYA_RADIUS_KM,
      48,
    );
    const geojson = JSON.stringify({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [coordinates.map((point) => [point.longitude, point.latitude])],
      },
      properties: {},
    });
    const encoded = encodeURIComponent(geojson);
    return `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/geojson(${encoded})/${CHECHNYA_CENTER.longitude},${CHECHNYA_CENTER.latitude},7/600x360@2x?access_token=${MAPBOX_TOKEN}`;
  }, []);

  return (
    <View style={styles.previewCard} testID="prefs-region-preview-chechnya">
      <Text style={styles.previewTitle}>{t("prefs.region.chechnya")}</Text>
      {mapUrl ? (
        <Image source={{ uri: mapUrl }} style={styles.previewImage} resizeMode="cover" />
      ) : (
        <View style={styles.previewFallback}>
          <Text style={styles.previewFallbackText}>
            Grozny ±160 km. Setze `EXPO_PUBLIC_MAPBOX_TOKEN`, um eine Karten-Vorschau zu
            aktivieren.
          </Text>
        </View>
      )}
    </View>
  );
};

const EuropePreview = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.previewCard} testID="prefs-region-preview-europe">
      <Text style={styles.previewTitle}>{t("prefs.region.europe")}</Text>
      <View style={styles.previewBadgeRow}>
        {EUROPE_COUNTRIES.map((code) => (
          <View key={code} style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>
              {t(`profile.countries.${code}`, { defaultValue: code })}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.previewFallbackText}>{t("prefs.region.saved")}</Text>
    </View>
  );
};

const RussiaPreview = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.previewCard} testID="prefs-region-preview-russia">
      <Text style={styles.previewTitle}>{t("prefs.region.russia")}</Text>
      <View style={styles.previewBadgeRow}>
        {RUSSIA_CITIES.map((city) => (
          <View key={city} style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>
              {t(`prefs.region.russiaCities.${city}`)}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.previewFallbackText}>
        {t("prefs.region.russiaDescription")}
      </Text>
    </View>
  );
};

const NearbyPreview = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.previewCard} testID="prefs-region-preview-nearby">
      <Text style={styles.previewTitle}>{t("prefs.region.nearby")}</Text>
      <Text style={styles.previewFallbackText}>
        {t("discovery.locationRequiredDescription")}
      </Text>
    </View>
  );
};

type CoordinatePoint = {
  latitude: number;
  longitude: number;
};

const generateCircleCoordinates = (
  center: CoordinatePoint,
  radiusKm: number,
  segments = 48,
): CoordinatePoint[] => {
  const points: CoordinatePoint[] = [];
  const earthRadiusKm = 6371;
  const latRad = (center.latitude * Math.PI) / 180;
  const lonRad = (center.longitude * Math.PI) / 180;
  const angularDistance = radiusKm / earthRadiusKm;

  for (let i = 0; i <= segments; i++) {
    const bearing = (2 * Math.PI * i) / segments;
    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const sinAngular = Math.sin(angularDistance);
    const cosAngular = Math.cos(angularDistance);

    const pointLat = Math.asin(
      sinLat * cosAngular + cosLat * sinAngular * Math.cos(bearing),
    );
    const pointLon =
      lonRad +
      Math.atan2(
        Math.sin(bearing) * sinAngular * cosLat,
        cosAngular - sinLat * Math.sin(pointLat),
      );

    points.push({
      latitude: (pointLat * 180) / Math.PI,
      longitude: (((pointLon * 180) / Math.PI + 540) % 360) - 180,
    });
  }

  return points;
};

export default SearchRegionScreen;
