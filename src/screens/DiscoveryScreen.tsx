import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useDiscoveryFeed } from "../hooks/useDiscoveryFeed";
import { sendLike, skipProfile } from "../services/discoveryService";
import { useAuthStore } from "../state/authStore";
import { usePreferencesStore } from "../state/preferencesStore";
import { Profile } from "../types";
import ProfileCard from "../components/ProfileCard";
import EmptyFeed from "../components/EmptyFeed";

const DiscoveryScreen = () => {
  const { data: profiles = [], isLoading, refetch, isRefetching } = useDiscoveryFeed();
  const session = useAuthStore((state) => state.session);
  const filters = usePreferencesStore((state) => state.filters);
  const setFilters = usePreferencesStore((state) => state.setFilters);
  const resetFilters = usePreferencesStore((state) => state.resetFilters);
  const [index, setIndex] = useState(0);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [profiles.length]);

  const currentProfile: Profile | undefined = profiles[index];

  const next = () => {
    setIndex((prev) => (prev + 1 < profiles.length ? prev + 1 : prev));
  };

  const handleLike = async () => {
    if (!session || !currentProfile || processing) {
      return;
    }
    setProcessing(true);
    try {
      const result = await sendLike(session.user.id, currentProfile.userId);
      if (result.match) {
        Alert.alert(
          "Neues Match!",
          "Jemand hat dich auch gemocht. Ihr könnt jetzt chatten.",
          [
            {
              text: "Cool",
              style: "default"
            }
          ]
        );
      }
      next();
    } catch (error: any) {
      Alert.alert("Fehler", error.message ?? "Konnte Like nicht senden.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSkip = async () => {
    if (!session || !currentProfile || processing) {
      return;
    }
    setProcessing(true);
    try {
      await skipProfile(session.user.id, currentProfile.userId);
      next();
    } catch (error: any) {
      Alert.alert("Fehler", error.message ?? "Konnte Profil nicht überspringen.");
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading && !profiles.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleIncreaseRadius = useCallback(() => {
    const nextRadius = Math.min(filters.distanceKm + 25, 500);
    setFilters({ distanceKm: nextRadius });
    refetch();
  }, [filters.distanceKm, refetch, setFilters]);

  const handleResetFilters = useCallback(() => {
    resetFilters();
    refetch();
  }, [refetch, resetFilters]);

  const handleInviteFriends = useCallback(() => {
    Alert.alert("Freunde einladen", "Dieses Feature ist bald verfügbar.");
  }, []);

  if (!currentProfile) {
    return (
      <EmptyFeed
        onIncreaseRadius={handleIncreaseRadius}
        onResetFilters={handleResetFilters}
        onRetry={refetch}
        onInviteFriends={handleInviteFriends}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <ProfileCard profile={currentProfile} onLike={handleLike} onSkip={handleSkip} />
    </ScrollView>
  );
};

  const styles = StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24
    }
  });

export default DiscoveryScreen;
