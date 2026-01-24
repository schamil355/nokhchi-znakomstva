import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import SafeAreaView from "../components/SafeAreaView";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuthStore } from "../state/authStore";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  base: "#0b1a12",
  gold: "#d9c08f",
  sand: "#f2e7d7",
  border: "rgba(217,192,143,0.35)"
};

const PartnerApplySuccessScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const session = useAuthStore((state) => state.session);

  const title = route.params?.title ?? "Thanks!";
  const message = route.params?.message ?? "We received your request and will contact you shortly.";

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.reset({
      index: 0,
      routes: [{ name: session ? "Main" : "Auth" }]
    });
  };

  return (
    <LinearGradient
      colors={[PALETTE.deep, PALETTE.forest, PALETTE.base]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>
          <Pressable style={styles.button} onPress={handleClose}>
            <LinearGradient
              colors={[PALETTE.gold, "#8b6c2a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonInner}
            >
              <Text style={styles.buttonText}>OK</Text>
            </LinearGradient>
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
  gradient: {
    flex: 1
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 18
  },
  card: {
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 24,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: PALETTE.sand,
    marginBottom: 8
  },
  message: {
    color: "rgba(242,231,215,0.85)",
    fontSize: 16,
    lineHeight: 22
  },
  button: {
    borderRadius: 28,
    overflow: "hidden"
  },
  buttonInner: {
    paddingVertical: 14,
    alignItems: "center"
  },
  buttonText: {
    color: "#1a1a1a",
    fontWeight: "700"
  }
});

export default PartnerApplySuccessScreen;
