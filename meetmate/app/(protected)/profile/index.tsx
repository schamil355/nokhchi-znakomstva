import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { fetchProfileForUser } from "../../../features/profile";
import { Profile } from "../../../types";
import { useSessionStore } from "../../../store/sessionStore";
import { useTranslation } from "../../../lib/i18n";
import VerifiedBadge from "../../../components/VerifiedBadge";

const MyProfileScreen = (): JSX.Element => {
  const user = useSessionStore((state) => state.user);
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user) {
        return () => {
          active = false;
        };
      }
      setLoading(true);
      fetchProfileForUser(user.id)
        .then((nextProfile) => {
          if (active) {
            setProfile(nextProfile);
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
      return () => {
        active = false;
      };
    }, [user]),
  );

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>{t("errors.notLoggedIn")}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoText}>{t("profile.screen.noProfile")}</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/profile/create")}
        >
          <Text style={styles.primaryButtonText}>{t("profile.screen.create")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <Text style={styles.displayName}>{profile.displayName}</Text>
          {profile.verifiedBadge ? <VerifiedBadge /> : null}
        </View>
        <Text style={styles.meta}>
          {t(`profile.gender.${profile.gender}`)} ·{" "}
          {t(`profile.orientation.${profile.orientation}`)}
        </Text>
      </View>
      <Text style={styles.sectionTitle}>{t("profile.screen.about")}</Text>
      <Text style={styles.bio}>
        {profile.bio || t("profile.screen.descriptionFallback")}
      </Text>

      <Text style={styles.sectionTitle}>{t("profile.screen.photos")}</Text>
      <View style={styles.photoGrid}>
        {profile.photos.map((photo) => (
          <Image key={photo.path} source={{ uri: photo.url }} style={styles.photo} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t("profile.screen.interests")}</Text>
      <View style={styles.chipRow}>
        {profile.interests.map((interest) => (
          <View key={interest} style={styles.chip}>
            <Text style={styles.chipText}>
              {t(`profile.interests.${interest}`, { defaultValue: interest })}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t("profile.screen.location")}</Text>
      <Text style={styles.meta}>
        {profile.location
          ? t("profile.form.locationCoordinates", {
              lat: profile.location.latitude.toFixed(3),
              lng: profile.location.longitude.toFixed(3),
            })
          : t("profile.form.locationUnset")}
      </Text>

      <Pressable
        style={styles.primaryButton}
        onPress={() => router.push("/profile/edit")}
      >
        <Text style={styles.primaryButtonText}>{t("profile.screen.edit")}</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => router.push("/settings")}>
        <Text style={styles.secondaryButtonText}>{t("settings.open")}</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
    backgroundColor: "#f7f7f8",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f7f7f8",
  },
  infoText: {
    fontSize: 16,
    marginBottom: 16,
    color: "#4b5563",
    textAlign: "center",
  },
  header: {
    alignItems: "flex-start",
    gap: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  displayName: {
    fontSize: 28,
    fontWeight: "700",
  },
  meta: {
    color: "#6b7280",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  bio: {
    lineHeight: 20,
    color: "#1f2933",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  photo: {
    width: 110,
    height: 140,
    borderRadius: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#2563eb33",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  chipText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2563eb",
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default MyProfileScreen;
