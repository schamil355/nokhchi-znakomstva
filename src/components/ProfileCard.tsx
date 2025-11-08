import React, { useEffect } from "react";
import { Image, StyleSheet, Text, View, Pressable } from "react-native";
import { Profile } from "../types";
import GuardedPhoto from "./GuardedPhoto";
import { track } from "../lib/analytics";

type ProfileCardProps = {
  profile: Profile;
  onLike: () => void;
  onSkip: () => void;
  onView?: (profile: Profile) => void;
};

const ProfileCard = ({ profile, onLike, onSkip, onView }: ProfileCardProps) => {
  const mainPhoto = profile.photos[0];
  const assetId = typeof mainPhoto?.assetId === "number" ? mainPhoto.assetId : Number(mainPhoto?.id);
  const hasAsset = Number.isFinite(assetId);
  const photoUrl = mainPhoto?.url;

  useEffect(() => {
    onView?.(profile);
    void track("view_profile", { targetId: profile.userId });
  }, [onView, profile, profile.userId]);

  return (
    <View style={styles.card}>
      {hasAsset ? (
        <GuardedPhoto photoId={assetId as number} style={styles.photo} />
      ) : photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={[styles.photo, styles.placeholder]}>
          <Text style={styles.placeholderText}>Kein Foto</Text>
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.name}>{profile.displayName}</Text>
        <Text style={styles.bio}>{profile.bio}</Text>
        <Text style={styles.interests}>#{profile.interests.join(" #")}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={[styles.actionButton, styles.passButton]} onPress={onSkip}>
          <Text style={styles.actionText}>Überspringen</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.likeButton]} onPress={onLike}>
          <Text style={[styles.actionText, styles.likeText]}>Like</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3
  },
  photo: {
    width: "100%",
    height: 360,
    borderRadius: 12
  },
  placeholder: {
    backgroundColor: "#f2f2f2",
    alignItems: "center",
    justifyContent: "center"
  },
  placeholderText: {
    color: "#999",
    fontSize: 14
  },
  content: {
    gap: 4
  },
  name: {
    fontSize: 20,
    fontWeight: "700"
  },
  bio: {
    fontSize: 15,
    color: "#555"
  },
  interests: {
    fontSize: 13,
    color: "#888"
  },
  actions: {
    flexDirection: "row",
    gap: 12
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  passButton: {
    borderWidth: 1,
    borderColor: "#b1b1b1"
  },
  likeButton: {
    backgroundColor: "#2f5d62"
  },
  actionText: {
    fontWeight: "600",
    color: "#333"
  },
  likeText: {
    color: "#fff"
  }
});

export default ProfileCard;
