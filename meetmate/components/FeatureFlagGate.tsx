import React, { PropsWithChildren } from "react";
import { View, StyleSheet, Text } from "react-native";
import { useFeatureFlag } from "../lib/featureFlags";
import { useTranslation } from "../lib/i18n";

type FeatureFlagGateProps = PropsWithChildren<{
  flag: "paywall_rollout";
}>;

const FeatureFlagGate = ({ flag, children }: FeatureFlagGateProps) => {
  const isEnabled = useFeatureFlag(flag);
  const { t } = useTranslation();

  if (!isEnabled) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{t("featureFlags.disabled")}</Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  message: {
    textAlign: "center",
  },
});

export default FeatureFlagGate;
