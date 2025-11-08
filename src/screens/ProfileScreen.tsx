import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ActionSheetIOS,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Platform
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../state/authStore";
import { Profile, Photo } from "../types";
import { upsertProfile } from "../services/profileService";
import GuardedPhoto from "../components/GuardedPhoto";
import {
  deletePhoto as deletePhotoRemote,
  registerPhoto,
  updatePrivacySettings,
  uploadOriginalAsync,
  VisibilityMode,
  changeVisibility,
  revokeAllPermissions
} from "../services/photoService";

const ProfileScreen = () => {
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const setProfile = useAuthStore((state) => state.setProfile);

  const [bio, setBio] = useState(profile?.bio ?? "");
  const [interests, setInterests] = useState(profile?.interests.join(", ") ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>("blurred_until_match");
  const [isIncognito, setIsIncognito] = useState(Boolean(profile?.isIncognito));
  const [showDistance, setShowDistance] = useState(profile?.showDistance ?? true);
  const [showLastSeen, setShowLastSeen] = useState(profile?.showLastSeen ?? true);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio ?? "");
      setInterests(profile.interests.join(", "));
      setIsIncognito(Boolean(profile.isIncognito));
      setShowDistance(profile.showDistance ?? true);
      setShowLastSeen(profile.showLastSeen ?? true);
    }
  }, [profile?.id]);

  const visibilityOptions: { label: string; value: VisibilityMode }[] = useMemo(
    () => [
      { label: "Öffentlich", value: "public" },
      { label: "Nur Matches", value: "match_only" },
      { label: "Whitelist", value: "whitelist" },
      { label: "Blur bis Match", value: "blurred_until_match" }
    ],
    []
  );

  if (!session || !profile) {
    return (
      <View style={styles.center}>
        <Text>Lade dein Profil...</Text>
      </View>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await upsertProfile(session.user.id, {
        displayName: profile.displayName,
        birthday: profile.birthday,
        bio,
        gender: profile.gender,
        intention: profile.intention,
        interests: interests
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        photos: profile.photos
      });
      const privacyChanged =
        profile.isIncognito !== isIncognito ||
        profile.showDistance !== showDistance ||
        profile.showLastSeen !== showLastSeen;

      if (privacyChanged) {
        await updatePrivacySettings({
          is_incognito: isIncognito,
          show_distance: showDistance,
          show_last_seen: showLastSeen
        });
        updated.isIncognito = isIncognito;
        updated.showDistance = showDistance;
        updated.showLastSeen = showLastSeen;
      }
      setProfile(updated);
      Alert.alert("Gespeichert", "Dein Profil wurde aktualisiert.");
    } catch (error: any) {
      Alert.alert("Fehler", error.message ?? "Konnte Profil nicht speichern.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Berechtigung benötigt", "Bitte erlaube den Zugriff auf deine Fotos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    try {
      setIsUploading(true);
      const asset = result.assets[0];
      const storagePath = await uploadOriginalAsync(asset.uri, session.user.id);
      const { photoId } = await registerPhoto(storagePath, visibilityMode);
      const newPhoto: Photo = {
        id: String(photoId),
        assetId: photoId,
        visibilityMode,
        url: asset.uri,
        createdAt: new Date().toISOString()
      };
      setProfile({
        ...profile,
        photos: [...profile.photos, newPhoto]
      });
      Alert.alert("Gespeichert", "Foto wurde registriert.");
    } catch (error: any) {
      Alert.alert("Upload fehlgeschlagen", error.message ?? "Bitte versuche es später erneut.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photo: Photo) => {
    if (!photo.assetId) {
      Alert.alert("Hinweis", "Ältere Fotos können derzeit nur über den Support gelöscht werden.");
      return;
    }
    try {
      await deletePhotoRemote(photo.assetId);
      const updated: Profile = {
        ...profile,
        photos: profile.photos.filter((item) => item.id !== photo.id)
      };
      const saved = await upsertProfile(session.user.id, {
        displayName: updated.displayName,
        birthday: updated.birthday,
        bio: updated.bio,
        gender: updated.gender,
        intention: updated.intention,
        interests: updated.interests,
        photos: updated.photos
      });
      setProfile(saved);
    } catch (error: any) {
      Alert.alert("Fehler", error.message ?? "Foto konnte nicht gelöscht werden.");
    }
  };

  const resolveAssetId = (photo: Photo): number | null => {
    if (typeof photo.assetId === "number") {
      return photo.assetId;
    }
    const numeric = Number(photo.id);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const handleVisibilityChange = async (photo: Photo, mode: VisibilityMode) => {
    const assetId = resolveAssetId(photo);
    if (!assetId) {
      Alert.alert("Aktion nicht möglich", "Für dieses Foto liegt keine Asset-ID vor.");
      return;
    }
    try {
      await changeVisibility(assetId, mode);
      const updatedPhotos = profile.photos.map((entry) =>
        entry.id === photo.id ? { ...entry, visibilityMode: mode } : entry
      );
      setProfile({ ...profile, photos: updatedPhotos });
      Alert.alert("Aktualisiert", "Sichtbarkeit wurde geändert.");
    } catch (error: any) {
      Alert.alert("Fehler", error.message ?? "Sichtbarkeit konnte nicht geändert werden.");
    }
  };

  const handleRevokePermissions = async (photo: Photo) => {
    const assetId = resolveAssetId(photo);
    if (!assetId) {
      Alert.alert("Aktion nicht möglich", "Für dieses Foto liegt keine Asset-ID vor.");
      return;
    }
    try {
      await revokeAllPermissions(assetId);
      Alert.alert("Aktualisiert", "Alle Freigaben wurden entfernt.");
    } catch (error: any) {
      Alert.alert("Fehler", error.message ?? "Freigaben konnten nicht widerrufen werden.");
    }
  };

  const presentVisibilitySheet = (photo: Photo) => {
    const options = visibilityOptions.map((option) => option.label).concat("Abbrechen");
    const cancelButtonIndex = options.length - 1;
    const onSelect = (index: number) => {
      if (index === cancelButtonIndex) {
        return;
      }
      const mode = visibilityOptions[index]?.value;
      if (mode) {
        handleVisibilityChange(photo, mode);
      }
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex }, onSelect);
    } else {
      Alert.alert(
        "Sichtbarkeit",
        undefined,
        visibilityOptions.map((option, optionIndex) => ({
          text: option.label,
          onPress: () => onSelect(optionIndex)
        })).concat({ text: "Abbrechen", style: "cancel" })
      );
    }
  };

  const handlePhotoActions = (photo: Photo) => {
    const options = ["Sichtbarkeit ändern", "Freigaben widerrufen", "Foto löschen", "Abbrechen"];
    const cancelButtonIndex = options.length - 1;
    const onSelect = (index: number) => {
      switch (index) {
        case 0:
          presentVisibilitySheet(photo);
          break;
        case 1:
          handleRevokePermissions(photo);
          break;
        case 2:
          handleDeletePhoto(photo);
          break;
        default:
          break;
      }
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex }, onSelect);
    } else {
      Alert.alert(
        "Foto-Aktionen",
        undefined,
        options.map((option, index) => ({
          text: option,
          onPress: () => onSelect(index),
          style: index === cancelButtonIndex ? "cancel" : "default"
        }))
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>{profile.displayName}</Text>
      <Text style={styles.subheader}>Mitglied seit {new Date(profile.createdAt).toLocaleDateString()}</Text>
      <FlatList
        data={profile.photos}
        keyExtractor={(photo) => photo.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 12 }}
        renderItem={({ item }) => {
          const numericId = typeof item.assetId === "number" ? item.assetId : Number(item.id);
          const canUseGuarded = Number.isFinite(numericId);
          return (
            <View style={styles.photoItem}>
              {canUseGuarded ? (
                <GuardedPhoto photoId={numericId} style={styles.photo} />
              ) : item.url ? (
                <Image style={styles.photo} source={{ uri: item.url }} />
              ) : (
                <View style={[styles.photo, styles.placeholder]}>
                  <Text style={styles.placeholderText}>Kein Foto</Text>
                </View>
              )}
              <View style={styles.photoActions}>
                <Text style={styles.visibilityBadge}>{item.visibilityMode ?? "?"}</Text>
                <Pressable style={styles.photoMenu} onPress={() => handlePhotoActions(item)}>
                  <Text style={styles.photoMenuText}>•••</Text>
                </Pressable>
              </View>
              {!item.assetId ? (
                <Pressable style={styles.removeTag} onPress={() => handleDeletePhoto(item)}>
                  <Text style={styles.removeTagText}>Entfernen</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />
      <View style={styles.section}>
        <Text style={styles.label}>Sichtbarkeit neuer Fotos</Text>
        <View style={styles.visibilityRow}>
          {visibilityOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.visibilityChip, visibilityMode === option.value && styles.visibilityChipActive]}
              onPress={() => setVisibilityMode(option.value)}
            >
              <Text
                style={[
                  styles.visibilityChipText,
                  visibilityMode === option.value && styles.visibilityChipTextActive
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[styles.uploadButton, (isUploading || isSaving) && styles.saveButtonDisabled]}
          onPress={handleAddPhoto}
          disabled={isUploading || isSaving}
        >
          <Text style={styles.saveButtonText}>{isUploading ? "Wird hochgeladen..." : "Foto hinzufügen"}</Text>
        </Pressable>
      </View>
      <Text style={styles.label}>Bio</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        style={[styles.input, styles.multiline]}
        multiline
        numberOfLines={5}
        maxLength={300}
        placeholder="Erzähle etwas über dich..."
      />
      <Text style={styles.label}>Interessen</Text>
      <TextInput
        value={interests}
        onChangeText={setInterests}
        style={styles.input}
        placeholder="z.B. Reisen, Fitness, Musik"
      />
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Incognito-Modus</Text>
          <Switch value={isIncognito} onValueChange={setIsIncognito} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Distanz anzeigen</Text>
          <Switch value={showDistance} onValueChange={setShowDistance} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Zuletzt online anzeigen</Text>
          <Switch value={showLastSeen} onValueChange={setShowLastSeen} />
        </View>
      </View>
      <Pressable style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} onPress={handleSave} disabled={isSaving}>
        <Text style={styles.saveButtonText}>{isSaving ? "Speichern..." : "Profil speichern"}</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  header: {
    fontSize: 26,
    fontWeight: "700"
  },
  subheader: {
    fontSize: 14,
    color: "#777",
    marginBottom: 16
  },
  section: {
    marginTop: 16
  },
  photoItem: {
    width: 160,
    height: 200,
    borderRadius: 16,
    marginRight: 12,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center"
  },
  photo: {
    width: "100%",
    height: "100%"
  },
  removeTag: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  photoActions: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  visibilityBadge: {
    backgroundColor: "rgba(0,0,0,0.55)",
    color: "#fff",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    textTransform: "uppercase"
  },
  photoMenu: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)"
  },
  photoMenuText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0"
  },
  placeholderText: {
    color: "#777"
  },
  removeTagText: {
    color: "#fff",
    fontSize: 12
  },
  visibilityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  visibilityChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cfd8dc"
  },
  visibilityChipActive: {
    backgroundColor: "#2f5d62",
    borderColor: "#2f5d62"
  },
  visibilityChipText: {
    color: "#2f5d62",
    fontSize: 13,
    fontWeight: "500"
  },
  visibilityChipTextActive: {
    color: "#fff"
  },
  uploadButton: {
    marginTop: 12,
    backgroundColor: "#2f5d62",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center"
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 16,
    marginBottom: 8
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5"
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: "top"
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: "#2f5d62",
    paddingVertical: 14,
    borderRadius: 12
  },
  saveButtonDisabled: {
    opacity: 0.7
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600"
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8
  },
  switchLabel: {
    fontSize: 16,
    color: "#333"
  }
});

export default ProfileScreen;
