import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import ProfileForm from "../../../features/profile/ProfileForm";
import {
  fetchProfileForUser,
  profileToFormValues,
  upsertProfile,
  ProfileFormValues,
} from "../../../features/profile";
import { useSessionStore } from "../../../store/sessionStore";
import { useTranslation } from "../../../lib/i18n";

const CreateProfileScreen = (): JSX.Element => {
  const user = useSessionStore((state) => state.user);
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialValues, setInitialValues] = useState<ProfileFormValues | undefined>();
  const { t } = useTranslation();

  useEffect(() => {
    if (!user) {
      return;
    }
    fetchProfileForUser(user.id)
      .then((profile) => {
        if (profile) {
          setInitialValues(profileToFormValues(profile));
          router.replace("/profile");
        }
      })
      .finally(() => setChecking(false));
  }, [router, user]);

  const handleSubmit = async (values: ProfileFormValues) => {
    if (!user) {
      return;
    }
    setSaving(true);
    try {
      await upsertProfile(user.id, values);
      router.replace("/preferences/search-region?from=onboarding");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>{t("errors.notLoggedIn")}</Text>
      </View>
    );
  }

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ProfileForm
      userId={user.id}
      initialValues={initialValues}
      loading={saving}
      submitLabel={t("profile.form.submitCreate")}
      onSubmit={handleSubmit}
    />
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default CreateProfileScreen;
