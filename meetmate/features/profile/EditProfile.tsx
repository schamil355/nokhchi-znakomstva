import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Localization from "expo-localization";
import {
  AVAILABLE_INTERESTS,
  COUNTRY_CODES,
  GENDERS,
  ORIENTATION_OPTIONS,
  profileFormSchema,
  ProfileFormValues,
} from "./";
import { uploadProfilePhoto, removeProfilePhoto } from "./service";
import { ProfilePhoto } from "../../types";
import { requestLocation } from "../../lib/location";
import { useTranslation } from "../../lib/i18n";

type EditProfileFormProps = {
  userId: string;
  initialValues?: Partial<ProfileFormValues>;
  loading?: boolean;
  submitLabel: string;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
  onCancel?: () => void;
};

type CountryCode = (typeof COUNTRY_CODES)[number];

const SUPPORTED_COUNTRIES = COUNTRY_CODES;

const isSupportedCountry = (value?: string | null): value is CountryCode =>
  Boolean(value && SUPPORTED_COUNTRIES.includes(value as CountryCode));

const resolveInitialCountry = (value?: string | null): CountryCode => {
  if (isSupportedCountry(value)) {
    return value as CountryCode;
  }
  const deviceCountry = Localization.region?.toUpperCase();
  if (isSupportedCountry(deviceCountry)) {
    return deviceCountry as CountryCode;
  }
  return SUPPORTED_COUNTRIES[0];
};

const DEFAULT_FORM: ProfileFormValues = {
  displayName: "",
  bio: "",
  birthdate: "",
  gender: GENDERS[0],
  orientation: ORIENTATION_OPTIONS[0],
  interests: [],
  photos: [],
  location: null,
  country: resolveInitialCountry(undefined),
};

const EditProfileForm = ({
  userId,
  initialValues,
  loading = false,
  submitLabel,
  onSubmit,
  onCancel,
}: EditProfileFormProps) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<ProfileFormValues>(() => ({
    ...DEFAULT_FORM,
    ...initialValues,
    interests: initialValues?.interests ?? [],
    photos: initialValues?.photos ?? [],
    location: initialValues?.location ?? null,
    country: resolveInitialCountry(initialValues?.country),
  }));
  const [errors, setErrors] = useState<
    Record<keyof ProfileFormValues | "global", string>
  >({} as any);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const handleChange = (key: keyof ProfileFormValues, value: any) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleInterest = (interest: string) => {
    setForm((prev) => {
      const exists = prev.interests.includes(interest);
      return {
        ...prev,
        interests: exists
          ? prev.interests.filter((item) => item !== interest)
          : [...prev.interests, interest],
      };
    });
  };

  const handleAddPhoto = async (source: "camera" | "library") => {
    try {
      setErrors((prev) => ({ ...prev, photos: "" }));
      setPhotoLoading(true);
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          throw new Error(t("profile.errors.cameraPermission"));
        }
        const result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
        });
        if (result.canceled || !result.assets.length) {
          return;
        }
        const asset = result.assets[0];
        const uploaded = await uploadProfilePhoto(userId, asset.uri);
        setForm((prev) => ({
          ...prev,
          photos: [...prev.photos, uploaded],
        }));
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          throw new Error(t("profile.errors.libraryPermission"));
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: false,
          quality: 0.85,
        });
        if (result.canceled || !result.assets.length) {
          return;
        }
        const asset = result.assets[0];
        const uploaded = await uploadProfilePhoto(userId, asset.uri);
        setForm((prev) => ({
          ...prev,
          photos: [...prev.photos, uploaded],
        }));
      }
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        photos: error?.message ?? t("profile.errors.photoUpload"),
      }));
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = async (photo: ProfilePhoto) => {
    try {
      setPhotoLoading(true);
      await removeProfilePhoto(photo.path);
      setForm((prev) => ({
        ...prev,
        photos: prev.photos.filter((item) => item.path !== photo.path),
      }));
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        photos: error?.message ?? t("profile.errors.photoRemove"),
      }));
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleUseLocation = async () => {
    try {
      setLocationLoading(true);
      const position = await requestLocation();
      if (!position) {
        throw new Error(t("profile.errors.locationFail"));
      }
      handleChange("location", position);
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        global: error?.message ?? t("profile.errors.locationFail"),
      }));
    } finally {
      setLocationLoading(false);
    }
  };

  const formattedLocation = useMemo(() => {
    if (!form.location) {
      return t("profile.form.locationUnset");
    }
    return t("profile.form.locationCoordinates", {
      lat: form.location.latitude.toFixed(3),
      lng: form.location.longitude.toFixed(3),
    });
  }, [form.location, t]);

  const handleSubmit = async () => {
    setErrors({} as any);
    const result = profileFormSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const nextErrors: any = {};
      Object.entries(fieldErrors).forEach(([key, value]) => {
        if (value && value[0]) {
          nextErrors[key] = t(value[0]);
        }
      });
      setErrors(nextErrors);
      return;
    }

    try {
      await onSubmit(result.data);
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        global: error?.message ?? t("profile.errors.submitFailed"),
      }));
    }
  };

  const addDummyPhoto = () => {
    setForm((prev) => ({
      ...prev,
      photos: [
        ...prev.photos,
        {
          path: `dummy-${Date.now()}`,
          url: "https://placekitten.com/400/400",
        },
      ],
    }));
  };

  const applyDummyLocation = () => {
    setForm((prev) => ({
      ...prev,
      location: { latitude: 52.52, longitude: 13.405 },
    }));
  };

  return (
    <ScrollView contentContainerStyle={styles.container} testID="profile-form">
      <Text style={styles.headline}>{t("profile.form.heading")}</Text>
      <TextInput
        testID="profile-form-displayName"
        style={[styles.input, errors.displayName && styles.inputError]}
        placeholder={t("profile.form.displayNamePlaceholder")}
        value={form.displayName}
        onChangeText={(text) => handleChange("displayName", text)}
      />
      {errors.displayName ? <Text style={styles.error}>{errors.displayName}</Text> : null}

      <TextInput
        testID="profile-form-birthdate"
        style={[styles.input, errors.birthdate && styles.inputError]}
        placeholder={t("profile.form.birthdatePlaceholder")}
        value={form.birthdate}
        onChangeText={(text) => handleChange("birthdate", text)}
      />
      {errors.birthdate ? <Text style={styles.error}>{errors.birthdate}</Text> : null}

      <Text style={styles.sectionTitle}>{t("profile.form.genderLabel")}</Text>
      <View style={styles.chipRow}>
        {GENDERS.map((gender) => (
          <Pressable
            key={gender}
            style={[styles.chip, form.gender === gender && styles.chipActive]}
            onPress={() => handleChange("gender", gender)}
          >
            <Text
              style={[styles.chipText, form.gender === gender && styles.chipTextActive]}
            >
              {t(`profile.gender.${gender}`)}
            </Text>
          </Pressable>
        ))}
      </View>
      {errors.gender ? <Text style={styles.error}>{errors.gender}</Text> : null}

      <Text style={styles.sectionTitle}>{t("profile.form.orientationLabel")}</Text>
      <View style={styles.chipRow}>
        {ORIENTATION_OPTIONS.map((option) => (
          <Pressable
            key={option}
            style={[styles.chip, form.orientation === option && styles.chipActive]}
            onPress={() => handleChange("orientation", option)}
          >
            <Text
              style={[
                styles.chipText,
                form.orientation === option && styles.chipTextActive,
              ]}
            >
              {t(`profile.orientation.${option}`)}
            </Text>
          </Pressable>
        ))}
      </View>
      {errors.orientation ? <Text style={styles.error}>{errors.orientation}</Text> : null}

      <Text style={styles.sectionTitle}>{t("profile.form.countryLabel")}</Text>
      <CountryPicker
        options={SUPPORTED_COUNTRIES}
        value={form.country}
        onChange={(code) => handleChange("country", code)}
        error={Boolean(errors.country)}
      />
      {errors.country ? <Text style={styles.error}>{errors.country}</Text> : null}
      <Text style={styles.hint}>{t("profile.country_hint")}</Text>

      <Text style={styles.sectionTitle}>{t("profile.form.bioLabel")}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder={t("profile.form.bioPlaceholder")}
        value={form.bio ?? ""}
        onChangeText={(text) => handleChange("bio", text)}
        multiline
        numberOfLines={4}
      />
      {errors.bio ? <Text style={styles.error}>{errors.bio}</Text> : null}

      <Text style={styles.sectionTitle}>{t("profile.form.interestsLabel")}</Text>
      <View style={styles.chipRow}>
        {AVAILABLE_INTERESTS.map((interest) => {
          const active = form.interests.includes(interest);
          return (
            <Pressable
              key={interest}
              testID={`profile-form-interest-${interest}`}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleInterest(interest)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(`profile.interests.${interest}`, { defaultValue: interest })}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {errors.interests ? <Text style={styles.error}>{errors.interests}</Text> : null}

      <Text style={styles.sectionTitle}>{t("profile.form.photosLabel")}</Text>
      <View style={styles.photoRow}>
        {form.photos.map((photo) => (
          <View key={photo.path} style={styles.photoItem}>
            <Image source={{ uri: photo.url }} style={styles.photo} />
            <Pressable
              style={styles.removePhotoButton}
              onPress={() => handleRemovePhoto(photo)}
            >
              <Text style={styles.removePhotoText}>{t("profile.form.photoRemove")}</Text>
            </Pressable>
          </View>
        ))}
        <Pressable
          style={styles.addPhotoButton}
          onPress={() => handleAddPhoto("library")}
        >
          <Text style={styles.addPhotoText}>{t("profile.form.photoChoose")}</Text>
        </Pressable>
        <Pressable style={styles.addPhotoButton} onPress={() => handleAddPhoto("camera")}>
          <Text style={styles.addPhotoText}>{t("profile.form.photoCapture")}</Text>
        </Pressable>
      </View>
      {photoLoading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
      {errors.photos ? <Text style={styles.error}>{errors.photos}</Text> : null}

      <Text style={styles.sectionTitle}>{t("profile.form.locationLabel")}</Text>
      <View style={styles.locationRow}>
        <Text style={styles.locationText}>{formattedLocation}</Text>
        <Pressable
          style={[styles.locationButton, locationLoading && styles.disabled]}
          onPress={handleUseLocation}
          testID="profile-form-location"
        >
          {locationLoading ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            <Text style={styles.locationButtonText}>
              {t("profile.form.locationButton")}
            </Text>
          )}
        </Pressable>
      </View>

      {__DEV__ ? (
        <View style={styles.devHelperRow}>
          <Pressable
            style={styles.devButton}
            onPress={addDummyPhoto}
            testID="profile-form-add-dummy-photo"
          >
            <Text style={styles.devButtonText}>{t("profile.form.devPhoto")}</Text>
          </Pressable>
          <Pressable
            style={styles.devButton}
            onPress={applyDummyLocation}
            testID="profile-form-dummy-location"
          >
            <Text style={styles.devButtonText}>{t("profile.form.devLocation")}</Text>
          </Pressable>
        </View>
      ) : null}

      {errors.global ? (
        <Text style={[styles.error, styles.globalError]}>{errors.global}</Text>
      ) : null}

      <Pressable
        style={[styles.submitButton, loading && styles.disabled]}
        disabled={loading}
        onPress={handleSubmit}
        testID="profile-form-submit"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>{submitLabel}</Text>
        )}
      </Pressable>

      {onCancel ? (
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>{t("common.cancel")}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
};

type CountryPickerProps = {
  value: CountryCode;
  options: readonly CountryCode[];
  onChange: (value: CountryCode) => void;
  error?: boolean;
};

const CountryPicker = ({ value, onChange, options, error }: CountryPickerProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const items = useMemo(
    () =>
      options.map((code) => ({
        code,
        label: t(`profile.countries.${code}`, { defaultValue: code }),
      })),
    [options, t],
  );

  const selected = items.find((item) => item.code === value) ?? items[0];

  const handleSelect = (code: CountryCode) => {
    onChange(code);
    setOpen(false);
  };

  return (
    <View style={styles.countryContainer}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("profile.form.countryLabel")}
        style={[styles.countryTrigger, error && styles.inputError]}
        onPress={() => setOpen((prev) => !prev)}
        testID="profile-form-country"
      >
        <Text style={styles.countryTriggerText}>{selected?.label ?? value}</Text>
      </Pressable>
      {open ? (
        <View style={styles.countryDropdown}>
          {items.map((item) => {
            const isActive = item.code === value;
            return (
              <Pressable
                key={item.code}
                style={[styles.countryOption, isActive && styles.countryOptionActive]}
                onPress={() => handleSelect(item.code)}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.countryOptionText,
                    isActive && styles.countryOptionTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "#f7f7f8",
  },
  headline: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: "600",
    fontSize: 16,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  hint: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  error: {
    color: "#b91c1c",
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipActive: {
    backgroundColor: "#2563eb33",
    borderColor: "#2563eb",
  },
  chipText: {
    color: "#1f2933",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  chipTextActive: {
    color: "#1f2933",
  },
  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  photoItem: {
    width: 110,
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#e5e7eb",
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  removePhotoButton: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 6,
  },
  removePhotoText: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
  },
  addPhotoButton: {
    width: 110,
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  addPhotoText: {
    color: "#2563eb",
    fontWeight: "600",
    textAlign: "center",
  },
  countryContainer: {
    marginBottom: 8,
  },
  countryTrigger: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  countryTriggerText: {
    color: "#1f2933",
    fontWeight: "500",
  },
  countryDropdown: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  countryOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  countryOptionActive: {
    backgroundColor: "#2563eb1a",
  },
  countryOptionText: {
    color: "#1f2933",
    fontSize: 15,
  },
  countryOptionTextActive: {
    color: "#1e3a8a",
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  locationText: {
    flex: 1,
    color: "#1f2933",
  },
  locationButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#2563eb",
    borderRadius: 12,
  },
  locationButtonText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  devHelperRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  devButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#a855f7",
    paddingVertical: 10,
    alignItems: "center",
  },
  devButtonText: {
    color: "#9333ea",
    fontWeight: "600",
  },
  globalError: {
    marginTop: 12,
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    marginTop: 16,
    alignItems: "center",
  },
  cancelText: {
    color: "#6b7280",
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.6,
  },
});

export default EditProfileForm;
export { CountryPicker };
