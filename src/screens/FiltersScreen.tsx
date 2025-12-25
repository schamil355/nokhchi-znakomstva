import React from "react";
import {
  ActionSheetIOS,
  Alert,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { GeoRegion, usePreferencesStore } from "../state/preferencesStore";
import { useAuthStore } from "../state/authStore";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";
import { updatePrivacySettings } from "../services/photoService";
import * as Location from "expo-location";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  gold: "#d9c08f",
  sand: "#f2e7d7",
  mist: "rgba(255,255,255,0.08)"
};
const TRACK_BG = "rgba(255,255,255,0.18)";
const HANDLE_SIZE = 28;
const MAX_DISTANCE_KM = 130;

const REGION_BASE: GeoRegion[] = ["chechnya", "russia", "europe", "other"];

type RegionCopy = Record<GeoRegion, { label: string; subtitle: string }>;

type CopyShape = {
  headerTitle: string;
  sectionBasic: string;
  sectionAge: string;
  sectionPrivacy: string;
  regionPickerTitle: string;
  cancel: string;
  regionOptions: RegionCopy;
  ageRangeLabel: (min: number, max: number) => string;
  distanceSummary: (min: number, max: number) => string;
  distanceBoundaryStart: (value: number) => string;
  distanceBoundaryEnd: (value: number) => string;
  apply: string;
  privacyTitle: string;
  privacySubtitle: string;
  radiusLabel: (value: number) => string;
};

const translations: Record<"en" | "de" | "fr" | "ru", CopyShape> = {
  en: {
    headerTitle: "Filters",
    sectionBasic: "Region",
    sectionAge: "Age",
    sectionPrivacy: "Privacy",
    regionPickerTitle: "Choose region",
    cancel: "Cancel",
    regionOptions: {
      chechnya: { label: "Chechnya", subtitle: "Find matches across Chechnya" },
      russia: { label: "Russia", subtitle: "Find matches across Russia" },
      europe: { label: "Europe", subtitle: "Find matches across Europe" },
      other: { label: "Somewhere else", subtitle: "Match worldwide outside Europe & Russia" }
    },
    ageRangeLabel: (min, max) => `Between ${min} - ${max}`,
    distanceSummary: (min, max) => `From ${min} km - Up to ${max} km`,
    distanceBoundaryStart: (value) => `From ${value} km`,
    distanceBoundaryEnd: (value) => `Up to ${value} km`,
    apply: "Update",
    privacyTitle: "Invisible nearby",
    privacySubtitle: "Protect your privacy in small towns—pick a radius so neighbors/friends don't see you.",
    radiusLabel: (value) => `Radius: ${value} km`
  },
  de: {
    headerTitle: "Filter",
    sectionBasic: "Region",
    sectionAge: "Alter",
    sectionPrivacy: "Privatsphäre",
    regionPickerTitle: "Region wählen",
    cancel: "Abbrechen",
    regionOptions: {
      chechnya: { label: "Tschetschenien", subtitle: "Finde Matches in Tschetschenien" },
      russia: { label: "Russland", subtitle: "Finde Matches in Russland" },
      europe: { label: "Europa", subtitle: "Finde Matches in Europa" },
      other: { label: "Wo anders", subtitle: "Finde Matches außerhalb Europas & Russland" }
    },
    ageRangeLabel: (min, max) => `Zwischen ${min} - ${max}`,
    distanceSummary: (min, max) => `Ab ${min} km - Bis ${max} km`,
    distanceBoundaryStart: (value) => `Ab ${value} km`,
    distanceBoundaryEnd: (value) => `Bis ${value} km`,
    apply: "Aktualisieren",
    privacyTitle: "Unsichtbar in der Nähe",
    privacySubtitle: "Schutz der Privatsphäre in kleinen Orten – wähle deinen Radius, damit Nachbarn/Freunde dich nicht sehen.",
    radiusLabel: (value) => `Radius: ${value} km`
  },
  fr: {
    headerTitle: "Filtres",
    sectionBasic: "Région",
    sectionAge: "Âge",
    sectionPrivacy: "Confidentialité",
    regionPickerTitle: "Choisis la région",
    cancel: "Annuler",
    regionOptions: {
      chechnya: { label: "Tchétchénie", subtitle: "Rencontres en Tchétchénie" },
      russia: { label: "Russie", subtitle: "Rencontres en Russie" },
      europe: { label: "Europe", subtitle: "Rencontres en Europe" },
      other: { label: "Autre", subtitle: "Rencontres partout hors Europe & Russie" }
    },
    ageRangeLabel: (min, max) => `Entre ${min} - ${max}`,
    distanceSummary: (min, max) => `De ${min} km - Jusqu'à ${max} km`,
    distanceBoundaryStart: (value) => `Dès ${value} km`,
    distanceBoundaryEnd: (value) => `Jusqu'à ${value} km`,
    apply: "Mettre à jour",
    privacyTitle: "Invisible à proximité",
    privacySubtitle: "Protège ta vie privée dans les petits lieux — choisis un rayon pour rester invisible aux voisins/amis.",
    radiusLabel: (value) => `Rayon : ${value} km`
  },
  ru: {
    headerTitle: "Фильтры",
    sectionBasic: "Регион",
    sectionAge: "Возраст",
    sectionPrivacy: "Конфиденциальность",
    regionPickerTitle: "Выбери регион",
    cancel: "Отмена",
    regionOptions: {
      chechnya: { label: "Чечня", subtitle: "Ищи анкеты в Чечне" },
      russia: { label: "Россия", subtitle: "Ищи анкеты по всей России" },
      europe: { label: "Европа", subtitle: "Ищи анкеты по всей Европе" },
      other: { label: "Где угодно", subtitle: "Ищи во всём мире вне Европы и России" }
    },
    ageRangeLabel: (min, max) => `От ${min} до ${max}`,
    distanceSummary: (min, max) => `От ${min} км — До ${max} км`,
    distanceBoundaryStart: (value) => `От ${value} км`,
    distanceBoundaryEnd: (value) => `До ${value} км`,
    apply: "Обновить",
    privacyTitle: "Невидимка рядом",
    privacySubtitle: "Защити приватность в маленьких городах — выбери радиус, чтобы соседи и друзья не видели тебя.",
    radiusLabel: (value) => `Радиус: ${value} км`
  },
};

const FiltersScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const copy = useLocalizedCopy(translations);
  const queryClient = useQueryClient();
  const regionOptions = React.useMemo(
    () =>
      REGION_BASE.map((value) => ({
        value,
        label: copy.regionOptions[value].label,
        subtitle: copy.regionOptions[value].subtitle,
      })),
    [copy]
  );
  const profile = useAuthStore((state) => state.profile);
  const setProfile = useAuthStore((state) => state.setProfile);
  const filters = usePreferencesStore((state) => state.filters);
  const setFilters = usePreferencesStore((state) => state.setFilters);

  const [ageRange, setAgeRange] = React.useState<[number, number]>(filters.ageRange);
  const [distanceRange, setDistanceRange] = React.useState<[number, number]>([
    filters.minDistanceKm,
    Math.min(filters.distanceKm, MAX_DISTANCE_KM)
  ]);
  const [hideNearby, setHideNearby] = React.useState(Boolean(profile?.hideNearby));
  const [savingIncognito, setSavingIncognito] = React.useState(false);
  const [locationError, setLocationError] = React.useState<string | null>(null);
  const [region, setRegion] = React.useState<GeoRegion>(filters.region);
  const [searchDisabled, setSearchDisabled] = React.useState(false);

  React.useEffect(() => {
    setAgeRange(filters.ageRange);
    setDistanceRange([filters.minDistanceKm, Math.min(filters.distanceKm, MAX_DISTANCE_KM)]);
    setRegion(filters.region);
  }, [filters.ageRange, filters.minDistanceKm, filters.distanceKm, filters.region]);

  React.useEffect(() => {
    setHideNearby(Boolean(profile?.hideNearby));
  }, [profile?.hideNearby]);

  React.useEffect(() => {
    setSearchDisabled(region !== "chechnya");
  }, [region]);

  const isModal = Boolean(route?.params?.isModal);
  const contentBottomSpacing = React.useMemo(
    () => (isModal ? 60 + Math.max(insets.bottom, 0) : 48),
    [insets.bottom, isModal]
  );
  const contentTopSpacing = React.useMemo(() => (isModal ? 64 : 12), [isModal]);
  const footerBottomSpacing = React.useMemo(
    () => Math.max(insets.bottom + 8, 20),
    [insets.bottom]
  );

  const acquireLocation = React.useCallback(async () => {
    setLocationError(null);
    const existing = await Location.getForegroundPermissionsAsync();
    let status = existing.status;
    if (status !== Location.PermissionStatus.GRANTED) {
      const requested = await Location.requestForegroundPermissionsAsync();
      status = requested.status;
    }
    if (status !== Location.PermissionStatus.GRANTED) {
      setLocationError(
        status === Location.PermissionStatus.DENIED
          ? "Standortberechtigung benötigt. Bitte in den Systemeinstellungen erlauben."
          : "Standortberechtigung blockiert. Bitte in den Systemeinstellungen aktivieren."
      );
      return null;
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
  }, []);

  const handleApply = async () => {
    if (hideNearby && profile?.userId) {
      setSavingIncognito(true);
      const coords = await acquireLocation();
      if (!coords) {
        setSavingIncognito(false);
        setHideNearby(false);
        return;
      }
      try {
        const radiusToPersist = distanceRange[1];
        await updatePrivacySettings({
          hide_nearby: true,
          hide_nearby_radius: radiusToPersist,
          latitude: coords.latitude,
          longitude: coords.longitude
        });
        setProfile({
          ...profile,
          hideNearby: true,
          hideNearbyRadius: radiusToPersist,
          latitude: coords.latitude,
          longitude: coords.longitude
        });
      } catch (error: any) {
        setSavingIncognito(false);
        Alert.alert(copy.cancel, error?.message ?? "Konnte Privatsphäre nicht speichern.");
        setHideNearby(false);
        return;
      }
      setSavingIncognito(false);
    }
    const upperDistance = Math.min(distanceRange[1], MAX_DISTANCE_KM);
    setFilters({
      ageRange,
      minDistanceKm: distanceRange[0],
      distanceKm: upperDistance,
      region
    });
    queryClient.invalidateQueries({ queryKey: ["discovery"] });
    queryClient.invalidateQueries({ queryKey: ["recent-profiles"] });
    const parentNav: any = (navigation as any).getParent?.() ?? navigation;
    const rootNav: any = parentNav?.getParent?.() ?? parentNav;
    if (isModal && navigation.canGoBack()) {
      navigation.goBack();
      rootNav?.navigate?.("Main", { screen: "Discovery" });
      return;
    }
    if (navigation.navigate) {
      navigation.navigate("Discovery" as never);
    } else {
      rootNav?.navigate?.("Main", { screen: "Discovery" });
    }
  };

  const showRegionPicker = () => {
    const labels = regionOptions.map((option) => option.label);
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...labels, copy.cancel],
          cancelButtonIndex: labels.length,
          title: copy.regionPickerTitle
        },
        (index) => {
          if (index >= 0 && index < regionOptions.length) {
            setRegion(regionOptions[index].value);
          }
        }
      );
      return;
    }
    Alert.alert(
      copy.regionPickerTitle,
      undefined,
      regionOptions.map((option) => ({
        text: option.label,
        onPress: () => setRegion(option.value)
      })).concat({ text: copy.cancel, style: "cancel" })
    );
  };

  const activeRegion = regionOptions.find((option) => option.value === region) ?? regionOptions[0];

  return (
    <LinearGradient colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]} locations={[0, 0.55, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: contentBottomSpacing, paddingTop: contentTopSpacing }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>{copy.sectionBasic}</Text>
          <Pressable style={styles.card} onPress={showRegionPicker}>
            <View style={styles.cardRow}>
              <View style={styles.iconBubble}>
                <Ionicons name="location-outline" size={20} color={PALETTE.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{activeRegion.label}</Text>
                <Text style={styles.cardSubtitle}>{activeRegion.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(242,231,215,0.6)" />
            </View>
          </Pressable>

          <Text style={styles.sectionLabel}>{copy.sectionAge}</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{copy.ageRangeLabel(ageRange[0], ageRange[1])}</Text>
            <View style={styles.sliderWrapper}>
              <RangeSlider min={18} max={80} values={ageRange} onChange={setAgeRange} />
            </View>
          </View>

        <Text style={styles.sectionLabel}>{copy.sectionPrivacy}</Text>
        <View style={[styles.card, searchDisabled && styles.cardDisabled]}>
            <View style={styles.privacyHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{copy.privacyTitle}</Text>
                <Text style={styles.cardSubtitle}>{copy.privacySubtitle}</Text>
              </View>
            <Switch
              value={hideNearby}
              onValueChange={async (next) => {
                if (next) {
                  Alert.alert("Bald verfügbar", "Die Funktion ist in Vorbereitung.");
                  setHideNearby(false);
                  return;
                }
                if (!profile?.userId) {
                  return;
                }
                const prev = hideNearby;
                setHideNearby(next);
                setSavingIncognito(true);
                try {
                  const coords = await acquireLocation();
                  if (!coords) {
                    setHideNearby(false);
                    setSavingIncognito(false);
                    return;
                  }
                  const radiusToPersist = distanceRange[1];
                  await updatePrivacySettings({
                    hide_nearby: next,
                    hide_nearby_radius: radiusToPersist,
                    latitude: coords.latitude,
                    longitude: coords.longitude
                  });
                  setProfile(
                    profile
                      ? {
                          ...profile,
                          hideNearby: next,
                          hideNearbyRadius: radiusToPersist,
                          latitude: coords.latitude,
                          longitude: coords.longitude
                        }
                      : profile
                  );
                } catch (error: any) {
                  setHideNearby(prev);
                  Alert.alert(copy.cancel, error?.message ?? "Konnte Privatsphäre nicht speichern.");
                } finally {
                  setSavingIncognito(false);
                }
              }}
              disabled={savingIncognito}
              trackColor={{ true: PALETTE.gold, false: "rgba(255,255,255,0.25)" }}
              thumbColor="#ffffff"
            />
          </View>
          {locationError ? <Text style={styles.locationHint}>{locationError}</Text> : null}
          <Text style={styles.radiusLabel}>{copy.radiusLabel(distanceRange[1])}</Text>
          <View style={[styles.sliderWrapper, searchDisabled && styles.disabledOverlay]} pointerEvents={searchDisabled ? "none" : "auto"}>
            <RangeSlider
              min={0}
              max={MAX_DISTANCE_KM}
              step={1}
              values={distanceRange}
              onChange={(next) => setDistanceRange(([min]) => [min, next[1]])}
              hideMinHandle
            />
          </View>
        </View>
        </ScrollView>
        <SafeAreaView
        edges={["left", "right", "bottom"]}
        style={[styles.footerSafe, { paddingBottom: footerBottomSpacing }]}
      >
        <Pressable style={styles.applyButton} onPress={handleApply}>
          <LinearGradient
            colors={[PALETTE.gold, "#8b6c2a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.applyButtonInner}
            >
              <Text style={styles.applyButtonText}>{copy.apply}</Text>
            </LinearGradient>
          </Pressable>
        </SafeAreaView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const RangeSlider = ({
  min,
  max,
  values,
  onChange,
  step = 1,
  hideMinHandle = false,
  hideRangeLabels = false
}: {
  min: number;
  max: number;
  values: [number, number];
  onChange: (next: [number, number]) => void;
  step?: number;
  hideMinHandle?: boolean;
  hideRangeLabels?: boolean;
}) => {
  const [width, setWidth] = React.useState(0);
  const valuesRef = React.useRef(values);
  const startRef = React.useRef<[number, number]>(values);
  const onChangeRef = React.useRef(onChange);
  const queuedChangeRef = React.useRef<[number, number] | null>(null);
  const frameRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  React.useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    },
    []
  );

  const scheduleChange = React.useCallback((next: [number, number]) => {
    valuesRef.current = next;
    queuedChangeRef.current = next;
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        if (queuedChangeRef.current) {
          const latest = queuedChangeRef.current;
          queuedChangeRef.current = null;
          onChangeRef.current(latest);
        }
      });
    }
  }, []);

  const flushPendingChange = React.useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (queuedChangeRef.current) {
      const latest = queuedChangeRef.current;
      queuedChangeRef.current = null;
      onChangeRef.current(latest);
    }
  }, []);

  const valueToPosition = (value: number) => {
    if (!width) {
      return 0;
    }
    return ((value - min) / (max - min)) * width;
  };

  const createPanResponder = React.useCallback(
    (handle: "min" | "max") =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          const current = valuesRef.current;
          const baseMin = hideMinHandle ? min : current[0];
          startRef.current = [baseMin, current[1]];
        },
        onPanResponderMove: (_, gestureState) => {
          if (!width) {
            return;
          }
          const [startMin, startMax] = startRef.current;
          const deltaValue = (gestureState.dx / width) * (max - min);
          if (handle === "min") {
            let next = startMin + deltaValue;
            next = Math.round(next / step) * step;
            const limit = valuesRef.current[1] - step;
            next = Math.min(Math.max(next, min), limit);
            if (next !== valuesRef.current[0]) {
              const nextValues: [number, number] = [next, valuesRef.current[1]];
              valuesRef.current = nextValues;
              scheduleChange(nextValues);
            }
          } else {
            const baseMin = hideMinHandle ? min : valuesRef.current[0];
            let next = startMax + deltaValue;
            next = Math.round(next / step) * step;
            const limit = hideMinHandle ? baseMin : baseMin + step;
            next = Math.max(Math.min(next, max), limit);
            if (next !== valuesRef.current[1]) {
              const nextValues: [number, number] = [baseMin, next];
              valuesRef.current = nextValues;
              scheduleChange(nextValues);
            }
          }
        },
        onPanResponderRelease: flushPendingChange,
        onPanResponderTerminate: flushPendingChange
      }),
    [flushPendingChange, hideMinHandle, max, min, scheduleChange, step, width]
  );

  const minResponder = React.useMemo(() => createPanResponder("min"), [createPanResponder]);
  const maxResponder = React.useMemo(() => createPanResponder("max"), [createPanResponder]);

  const minX = hideMinHandle ? 0 : valueToPosition(values[0]);
  const maxX = valueToPosition(values[1]);

  return (
    <View style={styles.sliderTrack} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.sliderBase} />
      <View style={[styles.sliderActive, { left: minX, width: Math.max(0, maxX - minX) }]} />
      {!hideMinHandle && (
        <View style={[styles.sliderHandle, { left: Math.max(0, minX - HANDLE_SIZE / 2) }]} {...minResponder.panHandlers} />
      )}
      <View style={[styles.sliderHandle, { left: Math.max(0, maxX - HANDLE_SIZE / 2) }]} {...maxResponder.panHandlers} />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2933"
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 14
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: PALETTE.sand,
    marginBottom: 6
  },
  card: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.35)",
    padding: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  privacyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: PALETTE.sand
  },
  cardSubtitle: {
    fontSize: 14,
    color: "rgba(242,231,215,0.65)",
    marginTop: 4
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center"
  },
  sliderWrapper: {
    paddingTop: 4
  },
  cardDisabled: {
    opacity: 0.45
  },
  disabledOverlay: {
    opacity: 0.5
  },
  rangeLabels: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  rangeLabel: {
    fontSize: 13,
    color: "rgba(242,231,215,0.65)",
    fontWeight: "500"
  },
  radiusLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: PALETTE.sand,
    marginTop: 8
  },
  locationHint: {
    marginTop: 8,
    color: "rgba(242,231,215,0.8)",
    fontSize: 13,
    lineHeight: 18
  },
  sliderTrack: {
    height: 36,
    justifyContent: "center"
  },
  sliderBase: {
    height: 6,
    borderRadius: 999,
    backgroundColor: TRACK_BG
  },
  sliderActive: {
    position: "absolute",
    height: 6,
    borderRadius: 999,
    backgroundColor: PALETTE.gold
  },
  sliderHandle: {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: PALETTE.gold,
    borderWidth: 2,
    borderColor: PALETTE.deep,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(217,192,143,0.25)"
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  toggleText: {
    flex: 1,
    fontSize: 14,
    color: "rgba(242,231,215,0.8)",
    lineHeight: 20
  },
  footerSafe: {
    paddingHorizontal: 24,
    paddingBottom: 0,
    backgroundColor: "transparent"
  },
  applyButton: {
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1.2,
    borderColor: "rgba(217,192,143,0.5)"
  },
  applyButtonInner: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff"
  }
});

export default FiltersScreen;
