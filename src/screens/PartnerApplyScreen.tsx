import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import SafeAreaView from "../components/SafeAreaView";
import { useLocalizedCopy, useLocale } from "../localization/LocalizationProvider";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuthStore } from "../state/authStore";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  base: "#0b1a12",
  gold: "#d9c08f",
  sand: "#f2e7d7",
  card: "rgba(11,31,22,0.85)",
  border: "rgba(217,192,143,0.35)"
};

type PlanOption = {
  id: "starter" | "pro" | "enterprise" | "unsure";
  name: string;
  description: string;
};

type Copy = {
  title: string;
  subtitle: string;
  back: string;
  planLabel: string;
  planOptions: PlanOption[];
  companyLabel: string;
  companyPlaceholder: string;
  contactLabel: string;
  contactPlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  cityLabel: string;
  cityPlaceholder: string;
  volumeLabel: string;
  volumePlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successMessage: string;
  errorTitle: string;
  errorMessage: string;
  requiredMessage: string;
  invalidEmail: string;
};

const translations: Record<"en" | "de" | "fr" | "ru", Copy> = {
  en: {
    title: "Partner application",
    subtitle: "Tell us about your business and we will get back within 24-48h.",
    back: "Back",
    planLabel: "Package preference",
    planOptions: [
      { id: "starter", name: "Starter", description: "20% commission per order" },
      { id: "pro", name: "Pro", description: "15% commission + featured" },
      { id: "enterprise", name: "Enterprise", description: "10% + exclusivity" },
      { id: "unsure", name: "Not sure yet", description: "Let's discuss" }
    ],
    companyLabel: "Company name",
    companyPlaceholder: "Your business",
    contactLabel: "Contact person",
    contactPlaceholder: "Full name",
    emailLabel: "Email",
    emailPlaceholder: "name@company.com",
    phoneLabel: "Phone (optional)",
    phonePlaceholder: "+49 170 123456",
    cityLabel: "City / delivery area",
    cityPlaceholder: "City",
    volumeLabel: "Monthly order volume (optional)",
    volumePlaceholder: "e.g. 30 orders",
    notesLabel: "Notes (optional)",
    notesPlaceholder: "Anything we should know",
    submit: "Submit application",
    submitting: "Sending...",
    successTitle: "Thanks!",
    successMessage: "We received your request and will contact you shortly.",
    errorTitle: "Submission failed",
    errorMessage: "Please try again.",
    requiredMessage: "Please fill in all required fields.",
    invalidEmail: "Please enter a valid email address."
  },
  de: {
    title: "Partner-Anfrage",
    subtitle: "Sag uns kurz etwas ueber dein Geschaeft. Wir melden uns in 24-48h.",
    back: "Zurueck",
    planLabel: "Paketwunsch",
    planOptions: [
      { id: "starter", name: "Starter", description: "20% Provision pro Order" },
      { id: "pro", name: "Pro", description: "15% Provision + Featured" },
      { id: "enterprise", name: "Enterprise", description: "10% + Exklusiv" },
      { id: "unsure", name: "Noch unsicher", description: "Wir beraten dich" }
    ],
    companyLabel: "Firmenname",
    companyPlaceholder: "Dein Unternehmen",
    contactLabel: "Ansprechpartner",
    contactPlaceholder: "Vor- und Nachname",
    emailLabel: "E-Mail",
    emailPlaceholder: "name@firma.de",
    phoneLabel: "Telefon (optional)",
    phonePlaceholder: "+49 170 123456",
    cityLabel: "Stadt / Liefergebiet",
    cityPlaceholder: "Stadt",
    volumeLabel: "Monatliches Volumen (optional)",
    volumePlaceholder: "z. B. 30 Orders",
    notesLabel: "Notizen (optional)",
    notesPlaceholder: "Weitere Infos",
    submit: "Anfrage senden",
    submitting: "Senden...",
    successTitle: "Danke!",
    successMessage: "Wir haben deine Anfrage erhalten und melden uns zeitnah.",
    errorTitle: "Fehler",
    errorMessage: "Bitte versuche es erneut.",
    requiredMessage: "Bitte alle Pflichtfelder ausfuellen.",
    invalidEmail: "Bitte eine gueltige E-Mail eingeben."
  },
  fr: {
    title: "Demande partenaire",
    subtitle: "Parlez-nous de votre activite. Reponse sous 24-48h.",
    back: "Retour",
    planLabel: "Offre souhaitee",
    planOptions: [
      { id: "starter", name: "Starter", description: "20% de commission" },
      { id: "pro", name: "Pro", description: "15% + mise en avant" },
      { id: "enterprise", name: "Enterprise", description: "10% + exclusivite" },
      { id: "unsure", name: "Pas encore sur", description: "On en discute" }
    ],
    companyLabel: "Societe",
    companyPlaceholder: "Votre entreprise",
    contactLabel: "Contact",
    contactPlaceholder: "Nom complet",
    emailLabel: "Email",
    emailPlaceholder: "nom@entreprise.com",
    phoneLabel: "Telephone (optionnel)",
    phonePlaceholder: "+33 6 12 34 56",
    cityLabel: "Ville / zone",
    cityPlaceholder: "Ville",
    volumeLabel: "Volume mensuel (optionnel)",
    volumePlaceholder: "ex. 30 commandes",
    notesLabel: "Notes (optionnel)",
    notesPlaceholder: "Informations supplementaires",
    submit: "Envoyer",
    submitting: "Envoi...",
    successTitle: "Merci !",
    successMessage: "Nous avons bien recu votre demande.",
    errorTitle: "Erreur",
    errorMessage: "Veuillez reessayer.",
    requiredMessage: "Merci de renseigner les champs obligatoires.",
    invalidEmail: "Merci d'entrer un email valide."
  },
  ru: {
    title: "Partner application",
    subtitle: "Tell us about your business and we will get back within 24-48h.",
    back: "Back",
    planLabel: "Package preference",
    planOptions: [
      { id: "starter", name: "Starter", description: "20% commission per order" },
      { id: "pro", name: "Pro", description: "15% commission + featured" },
      { id: "enterprise", name: "Enterprise", description: "10% + exclusivity" },
      { id: "unsure", name: "Not sure yet", description: "Let's discuss" }
    ],
    companyLabel: "Company name",
    companyPlaceholder: "Your business",
    contactLabel: "Contact person",
    contactPlaceholder: "Full name",
    emailLabel: "Email",
    emailPlaceholder: "name@company.com",
    phoneLabel: "Phone (optional)",
    phonePlaceholder: "+49 170 123456",
    cityLabel: "City / delivery area",
    cityPlaceholder: "City",
    volumeLabel: "Monthly order volume (optional)",
    volumePlaceholder: "e.g. 30 orders",
    notesLabel: "Notes (optional)",
    notesPlaceholder: "Anything we should know",
    submit: "Submit application",
    submitting: "Sending...",
    successTitle: "Thanks!",
    successMessage: "We received your request and will contact you shortly.",
    errorTitle: "Submission failed",
    errorMessage: "Please try again.",
    requiredMessage: "Please fill in all required fields.",
    invalidEmail: "Please enter a valid email address."
  }
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PartnerApplyScreen = () => {
  const copy = useLocalizedCopy(translations);
  const { locale } = useLocale();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const session = useAuthStore((state) => state.session);

  const initialPlan = (route.params?.plan as PlanOption["id"] | undefined) ?? "starter";

  const [selectedPlan, setSelectedPlan] = useState<PlanOption["id"]>(initialPlan);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [volume, setVolume] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const planOptions = useMemo(() => copy.planOptions, [copy.planOptions]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.reset({
      index: 0,
      routes: [{ name: session ? "Main" : "Auth" }]
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setFormError(null);
    if (!companyName.trim() || !contactName.trim() || !city.trim() || !email.trim()) {
      setFormError(copy.requiredMessage);
      Alert.alert(copy.errorTitle, copy.requiredMessage);
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setFormError(copy.invalidEmail);
      Alert.alert(copy.errorTitle, copy.invalidEmail);
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("partner_leads").insert(
        {
          company_name: companyName.trim(),
          contact_name: contactName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          city: city.trim(),
          monthly_volume: volume.trim() || null,
          package_interest: selectedPlan,
          notes: notes.trim() || null,
          locale,
          source: "web"
        },
        { returning: "minimal" }
      );

      if (error) {
        throw error;
      }

      navigation.navigate("PartnerSuccess", {
        title: copy.successTitle,
        message: copy.successMessage
      });
    } catch (error) {
      console.warn("[partner] submit failed", error);
      setFormError(copy.errorMessage);
      Alert.alert(copy.errorTitle, copy.errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", android: undefined })}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
          >
            <Pressable style={styles.backBtn} onPress={handleBack} accessibilityRole="button">
              <Ionicons name="chevron-back" size={22} color={PALETTE.gold} />
              <Text style={styles.backText}>{copy.back}</Text>
            </Pressable>

            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>

            <View style={styles.card}>
              <Text style={styles.label}>{copy.planLabel}</Text>
              <View style={styles.planOptions}>
                {planOptions.map((plan) => {
                  const active = plan.id === selectedPlan;
                  return (
                    <Pressable
                      key={plan.id}
                      style={[styles.planChip, active && styles.planChipActive]}
                      onPress={() => setSelectedPlan(plan.id)}
                    >
                      <Text style={[styles.planChipTitle, active && styles.planChipTitleActive]}>
                        {plan.name}
                      </Text>
                      <Text style={[styles.planChipDesc, active && styles.planChipDescActive]}>
                        {plan.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{copy.companyLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={copy.companyPlaceholder}
                  placeholderTextColor="rgba(242,231,215,0.65)"
                  value={companyName}
                  onChangeText={setCompanyName}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{copy.contactLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={copy.contactPlaceholder}
                  placeholderTextColor="rgba(242,231,215,0.65)"
                  value={contactName}
                  onChangeText={setContactName}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{copy.emailLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={copy.emailPlaceholder}
                  placeholderTextColor="rgba(242,231,215,0.65)"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{copy.phoneLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={copy.phonePlaceholder}
                  placeholderTextColor="rgba(242,231,215,0.65)"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{copy.cityLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={copy.cityPlaceholder}
                  placeholderTextColor="rgba(242,231,215,0.65)"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{copy.volumeLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={copy.volumePlaceholder}
                  placeholderTextColor="rgba(242,231,215,0.65)"
                  value={volume}
                  onChangeText={setVolume}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{copy.notesLabel}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={copy.notesPlaceholder}
                  placeholderTextColor="rgba(242,231,215,0.65)"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              </View>
            </View>

            <Pressable
              style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={[PALETTE.gold, "#8b6c2a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonInner}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{copy.submit}</Text>
                )}
              </LinearGradient>
            </Pressable>
            {formError && <Text style={styles.formError}>{formError}</Text>}
          </ScrollView>
        </KeyboardAvoidingView>
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
    flex: 1
  },
  content: {
    padding: 24,
    gap: 16,
    paddingBottom: 40
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  backText: {
    color: PALETTE.gold,
    fontWeight: "600"
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: PALETTE.sand
  },
  subtitle: {
    color: "rgba(242,231,215,0.8)",
    fontSize: 16
  },
  card: {
    backgroundColor: PALETTE.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: PALETTE.border,
    gap: 14
  },
  label: {
    color: PALETTE.sand,
    fontWeight: "600",
    marginBottom: 6
  },
  planOptions: {
    gap: 10
  },
  planChip: {
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.35)",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.04)"
  },
  planChipActive: {
    borderColor: PALETTE.gold,
    backgroundColor: "rgba(217,192,143,0.2)"
  },
  planChipTitle: {
    color: PALETTE.sand,
    fontWeight: "700"
  },
  planChipTitleActive: {
    color: "#ffffff"
  },
  planChipDesc: {
    color: "rgba(242,231,215,0.75)",
    marginTop: 4
  },
  planChipDescActive: {
    color: "rgba(255,255,255,0.85)"
  },
  inputGroup: {
    gap: 6
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.2,
    borderColor: "rgba(217,192,143,0.5)",
    color: PALETTE.sand,
    fontSize: 16
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top"
  },
  primaryButton: {
    borderRadius: 28,
    overflow: "hidden",
    marginTop: 6
  },
  primaryButtonInner: {
    paddingVertical: 14,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  primaryButtonDisabled: {
    opacity: 0.7
  },
  formError: {
    color: "#f2b4ae",
    fontSize: 14,
    textAlign: "center"
  }
});

export default PartnerApplyScreen;
