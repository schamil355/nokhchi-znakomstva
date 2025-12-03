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
import { useLocalizedCopy } from "../localization/LocalizationProvider";

const BRAND_GREEN = "#0d6e4f";
const CARD_BORDER = "#e9ebf1";
const TRACK_BG = "#e5e6eb";
const HANDLE_SIZE = 28;
const MAX_DISTANCE_KM = 130;

const REGION_BASE: GeoRegion[] = ["chechnya", "russia", "europe", "other"];

type RegionCopy = Record<GeoRegion, { label: string; subtitle: string }>;

type CopyShape = {
  headerTitle: string;
  sectionBasic: string;
  sectionAge: string;
  sectionDistance: string;
  regionPickerTitle: string;
  cancel: string;
  regionOptions: RegionCopy;
  ageRangeLabel: (min: number, max: number) => string;
  distanceSummary: (min: number, max: number) => string;
  distanceBoundaryStart: (value: number) => string;
  distanceBoundaryEnd: (value: number) => string;
  autoExtend: string;
  apply: string;
};

const translations: Record<"en" | "de" | "fr" | "ru", CopyShape> = {
  en: {
    headerTitle: "Filters",
    sectionBasic: "Region",
    sectionAge: "Age",
    sectionDistance: "Distance",
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
    autoExtend: "Extend your distance when no local profiles remain.",
    apply: "Update",
  },
  de: {
    headerTitle: "Filter",
    sectionBasic: "Region",
    sectionAge: "Alter",
    sectionDistance: "Entfernung",
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
    autoExtend: "Erweitere deine Entfernung, wenn keine Profile in der Nähe mehr verfügbar sind.",
    apply: "Aktualisieren",
  },
  fr: {
    headerTitle: "Filtres",
    sectionBasic: "Région",
    sectionAge: "Âge",
    sectionDistance: "Distance",
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
    autoExtend: "Étends la distance quand il n'y a plus de profils proches.",
    apply: "Mettre à jour",
  },
  ru: {
    headerTitle: "Фильтры",
    sectionBasic: "Регион",
    sectionAge: "Возраст",
    sectionDistance: "Дистанция",
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
    autoExtend: "Расширять радиус, когда поблизости больше нет анкет.",
    apply: "Обновить",
  },
};

const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const copy = useLocalizedCopy(translations);
  const regionOptions = React.useMemo(
    () =>
      REGION_BASE.map((value) => ({
        value,
        label: copy.regionOptions[value].label,
        subtitle: copy.regionOptions[value].subtitle,
      })),
    [copy]
  );
  const filters = usePreferencesStore((state) => state.filters);
  const setFilters = usePreferencesStore((state) => state.setFilters);

  const [ageRange, setAgeRange] = React.useState<[number, number]>(filters.ageRange);
  const [distanceRange, setDistanceRange] = React.useState<[number, number]>([
    filters.minDistanceKm,
    Math.min(filters.distanceKm, MAX_DISTANCE_KM)
  ]);
  const [autoExtend, setAutoExtend] = React.useState(filters.autoExtendDistance);
  const [region, setRegion] = React.useState<GeoRegion>(filters.region);
  const [searchDisabled, setSearchDisabled] = React.useState(false);

  React.useEffect(() => {
    setAgeRange(filters.ageRange);
    setDistanceRange([filters.minDistanceKm, Math.min(filters.distanceKm, MAX_DISTANCE_KM)]);
    setAutoExtend(filters.autoExtendDistance);
    setRegion(filters.region);
  }, [filters.ageRange, filters.minDistanceKm, filters.distanceKm, filters.autoExtendDistance, filters.region]);

  React.useEffect(() => {
    setSearchDisabled(region !== "chechnya");
  }, [region]);

  const isModal = Boolean(route?.params?.isModal);
  const contentBottomSpacing = React.useMemo(
    () => (isModal ? 80 + Math.max(insets.bottom, 0) : styles.content.paddingBottom),
    [insets.bottom, isModal]
  );
  const contentTopSpacing = React.useMemo(() => (isModal ? 64 : 12), [isModal]);
  const footerBottomSpacing = React.useMemo(
    () => (isModal ? Math.max(insets.bottom, 12) : Math.max(insets.bottom - 28, 0)),
    [insets.bottom, isModal]
  );

  const handleApply = () => {
    const upperDistance = Math.min(distanceRange[1], MAX_DISTANCE_KM);
    setFilters({
      ageRange,
      minDistanceKm: distanceRange[0],
      distanceKm: upperDistance,
      autoExtendDistance: autoExtend,
      region
    });
    if (isModal && navigation.canGoBack()) {
      navigation.goBack();
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
              <Ionicons name="location-outline" size={20} color={BRAND_GREEN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{activeRegion.label}</Text>
              <Text style={styles.cardSubtitle}>{activeRegion.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#a1a7b1" />
          </View>
        </Pressable>

        <Text style={styles.sectionLabel}>{copy.sectionAge}</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{copy.ageRangeLabel(ageRange[0], ageRange[1])}</Text>
          <View style={styles.sliderWrapper}>
            <RangeSlider min={18} max={80} values={ageRange} onChange={setAgeRange} />
          </View>
        </View>

        <Text style={styles.sectionLabel}>{copy.sectionDistance}</Text>
        <View style={[styles.card, searchDisabled && styles.cardDisabled]}>
          <Text style={styles.cardTitle}>{copy.distanceSummary(distanceRange[0], distanceRange[1])}</Text>
          <View style={[styles.sliderWrapper, searchDisabled && styles.disabledOverlay]} pointerEvents={searchDisabled ? "none" : "auto"}>
            <RangeSlider min={0} max={MAX_DISTANCE_KM} step={5} values={distanceRange} onChange={setDistanceRange} />
            <View style={styles.rangeLabels}>
              <Text style={styles.rangeLabel}>{copy.distanceBoundaryStart(distanceRange[0])}</Text>
              <Text style={styles.rangeLabel}>{copy.distanceBoundaryEnd(distanceRange[1])}</Text>
            </View>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>{copy.autoExtend}</Text>
            <Switch
              value={autoExtend}
              onValueChange={setAutoExtend}
              trackColor={{ true: BRAND_GREEN, false: "#d5d7dc" }}
              thumbColor="#fff"
            />
          </View>
        </View>

      </ScrollView>
      <SafeAreaView
        edges={["left", "right"]}
        style={[styles.footerSafe, { paddingBottom: footerBottomSpacing }]}
      >
        <Pressable style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyButtonText}>{copy.apply}</Text>
        </Pressable>
      </SafeAreaView>
    </SafeAreaView>
  );
};

const RangeSlider = ({
  min,
  max,
  values,
  onChange,
  step = 1
}: {
  min: number;
  max: number;
  values: [number, number];
  onChange: (next: [number, number]) => void;
  step?: number;
}) => {
  const [width, setWidth] = React.useState(0);
  const valuesRef = React.useRef(values);
  const startRef = React.useRef<[number, number]>(values);

  React.useEffect(() => {
    valuesRef.current = values;
  }, [values]);

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
          startRef.current = valuesRef.current;
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
              onChange(nextValues);
            }
          } else {
            let next = startMax + deltaValue;
            next = Math.round(next / step) * step;
            const limit = valuesRef.current[0] + step;
            next = Math.max(Math.min(next, max), limit);
            if (next !== valuesRef.current[1]) {
              const nextValues: [number, number] = [valuesRef.current[0], next];
              valuesRef.current = nextValues;
              onChange(nextValues);
            }
          }
        }
      }),
    [max, min, onChange, step, width]
  );

  const minResponder = React.useMemo(() => createPanResponder("min"), [createPanResponder]);
  const maxResponder = React.useMemo(() => createPanResponder("max"), [createPanResponder]);

  const minX = valueToPosition(values[0]);
  const maxX = valueToPosition(values[1]);

  return (
    <View style={styles.sliderTrack} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.sliderBase} />
      <View style={[styles.sliderActive, { left: minX, width: Math.max(0, maxX - minX) }]} />
      <View style={[styles.sliderHandle, { left: Math.max(0, minX - HANDLE_SIZE / 2) }]} {...minResponder.panHandlers} />
      <View style={[styles.sliderHandle, { left: Math.max(0, maxX - HANDLE_SIZE / 2) }]} {...maxResponder.panHandlers} />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff"
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
    fontWeight: "600",
    color: "#4a4f58"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 20,
    gap: 16
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#2b2d35"
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#8a909c",
    marginTop: 4
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eef4f1",
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
    color: "#7b808c",
    fontWeight: "500"
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
    backgroundColor: BRAND_GREEN
  },
  sliderHandle: {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: BRAND_GREEN,
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 3,
    shadowColor: "#0f172a",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }
  },
  cardDivider: {
    height: 1,
    backgroundColor: CARD_BORDER
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
    color: "#5b5f6b",
    lineHeight: 20
  },
  footerSafe: {
    paddingHorizontal: 24,
    paddingBottom: 0,
    backgroundColor: "#fff"
  },
  applyButton: {
    backgroundColor: BRAND_GREEN,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center"
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff"
  }
});

export default SettingsScreen;
