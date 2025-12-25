import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};

const LikesSimpleScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <LinearGradient colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]} locations={[0, 0.55, 1]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.content}>
          <View style={styles.titlePill}>
            <Text style={styles.titleText}>Mochten dich</Text>
          </View>
          <Pressable style={styles.cta} onPress={() => navigation.navigate("PremiumUpsell")}>
            <LinearGradient
              colors={[PALETTE.gold, "#8b6c2a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaInner}
            >
              <Text style={styles.ctaText}>Sieh, wer dich geliket hat</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default LikesSimpleScreen;

const styles = StyleSheet.create({
  gradient: {
    flex: 1
  },
  safeArea: {
    backgroundColor: "transparent",
    flex: 1
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    justifyContent: "space-between",
    gap: 16
  },
  titlePill: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PALETTE.gold,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.04)"
  },
  titleText: {
    color: PALETTE.sand,
    fontSize: 20,
    fontWeight: "700"
  },
  cta: {
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1.2,
    borderColor: PALETTE.gold,
    marginBottom: 18,
    backgroundColor: "transparent"
  },
  ctaInner: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "100%"
  },
  ctaText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16
  }
});
