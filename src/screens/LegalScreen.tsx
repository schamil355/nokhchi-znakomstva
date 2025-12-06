import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, Modal, Linking } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useLocalizedCopy, useLocale } from "../localization/LocalizationProvider";

const PRIVACY_URL = "https://islam429.github.io/privacy-terms/privacy.html";
const TERMS_URL = "https://islam429.github.io/privacy-terms/terms.html";

const PRIVACY_TEXT = `Datenschutzerklärung für die App "нохчи знакомства"

Verantwortlicher: Soul, Mirabellplatz 4, 5020 Salzburg, Österreich, E-Mail: нохчизнакомства@support.com

1. Geltung
Diese Erklärung gilt für die mobile App "Soul".

2. Verarbeitete Daten
- Konto/Profil: E-Mail/Telefon, Anzeigename, Geschlecht, Geburtsdatum/Alter, Intention, Interessen, Bio.
- Medien: Profilfotos und Selfies für Verifizierung (Speicherung in Supabase Storage).
- Standort: Gerätestandort/Region für Vorschläge.
- Geräte-/Nutzungsdaten: Push-Token, technische Logs, In-App-Ereignisse (z. B. app_open, view_profile, like, match, message_send) für Stabilität und Produktverbesserung.
- Kommunikation: Chats/Nachrichten.
- Verifizierung: Selfie-Abgleich mit Profilfoto (Serverless-Funktion "face-verify").

3. Zwecke
Matchmaking, Profil- und Fotoverwaltung, Standortbasierte Vorschläge, Push-Benachrichtigungen, Betrugs- und Missbrauchsvermeidung (inkl. Gesichtsabgleich), Fehleranalyse, Produktverbesserung, gesetzliche Pflichten.

4. Rechtsgrundlagen (DSGVO)
Art. 6 Abs. 1 lit. b (Nutzungsvertrag), lit. a (Einwilligungen: Push, Standort, Kamera/Fotos), lit. f (berechtigtes Interesse: Sicherheit, Stabilität), ggf. lit. c (rechtliche Pflichten).

5. Empfänger/Drittanbieter
- Supabase (Auth, Datenbank, Storage, Realtime, Functions/face-verify)
- Expo/Apple/Google Push Notification Services
- Sentry (Crash-Reports)
- Apple/Google App Stores für Zahlungen/Abos

6. Übermittlungen
Supabase-Services können außerhalb der EU gehostet werden; Schutz über Standardvertragsklauseln und technische Maßnahmen, soweit nötig.

7. Speicherdauer
Profildaten bis Konto-Löschung; Logs/Analytics nur solange erforderlich; Fotos bis Entfernung oder Konto-Löschung; gesetzliche Aufbewahrung bleibt unberührt.

8. Rechte
Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch gegen berechtigte Interessen, Widerruf von Einwilligungen, Beschwerde bei der Datenschutzbehörde (Österreich).

9. Erforderlichkeit/Automatisierte Entscheidungen
Bestimmte Daten sind für die Nutzung nötig (Account, Profilfoto, Standort für Umkreis). Keine vollautomatisierten Einzelentscheidungen nach Art. 22 DSGVO; Matching/Ranking basiert auf Profil- und Standortdaten.

10. Sicherheit
TLS-Transport, Zugriffsbeschränkungen, serverseitige Prüfungen; 100 % Sicherheit kann nicht garantiert werden.

11. Minderjährige
Nutzung ab 18 Jahren; Konten Minderjähriger werden gelöscht.

12. Kontakt
Datenschutzanfragen: нохчизнакомства@support.com`;

const TERMS_TEXT = `Allgemeine Geschäftsbedingungen (AGB) – App "нохчи знакомства"

1. Anbieter
Soul, Mirabellplatz 4, 5020 Salzburg, Österreich.

2. Vertragsgegenstand
Dating-/Matchmaking-App mit Profilen, Fotos, Standort-basierten Vorschlägen, Chat und Verifizierungsfunktionen.

3. Voraussetzungen
Mindestalter 18 Jahre; wahrheitsgemäße Angaben; funktionsfähiges Gerät/Internet; notwendige Berechtigungen (Kamera/Fotos, Standort, Push optional).

4. Pflichten der Nutzer
Keine Fake-Profile, keine Belästigung, keine rechtswidrigen oder diskriminierenden Inhalte; nur eigene Fotos/Selfies; keine Urheberrechtsverletzungen; keine Weitergabe von Inhalten Dritter ohne Zustimmung; Missbrauch melden.

5. Verifizierung/Fotos
Selfie-Abgleich mit Profilfoto kann verpflichtend sein; bei Nichtbestehen oder Missbrauch kann der Zugang eingeschränkt oder beendet werden.

6. Abonnements/In-App-Käufe
Monatliches, automatisch verlängerndes Abo. Preis/Laufzeit werden vor Kauf angezeigt. Abrechnung über Apple App Store / Google Play; deren Bedingungen gelten ergänzend. Kündigung über die Store-Konto-Einstellungen; begonnene Abrechnungszeiträume werden in der Regel nicht anteilig erstattet, soweit nicht zwingendes Recht etwas anderes vorsieht. Widerruf nach den Store-Regeln.

7. Verfügbarkeit
Angemessene Bemühungen um störungsfreien Betrieb; Wartung/Ausfälle möglich; kein Anspruch auf permanente Verfügbarkeit.

8. Inhalte/Moderation
Anbieter darf Inhalte prüfen, sperren oder entfernen sowie Konten kündigen/beschränken, wenn gegen AGB, Gesetze oder Schutzinteressen verstoßen wird.

9. Haftung
Vorsatz/grobe Fahrlässigkeit: unbeschränkt. Bei leichter Fahrlässigkeit: nur für Verletzung wesentlicher Pflichten, begrenzt auf vorhersehbaren, typischen Schaden. Keine Haftung für Nutzerinhalte oder Verbindungen außerhalb der App. Zwingende Haftung (Produkthaftung, Leben/Körper/Gesundheit) bleibt unberührt.

10. Laufzeit/Kündigung
Unbefristet; Konto kann jederzeit gelöscht werden. Anbieter kann ordentlich mit Frist oder außerordentlich bei Verstößen kündigen/sperren. Laufende Abos im Store kündigen.

11. Änderungen
AGB können angepasst werden; wesentliche Änderungen werden angezeigt. Fortgesetzte Nutzung nach Inkrafttreten gilt als Zustimmung, sofern kein Widerspruch erfolgt; bei Widerspruch kann das Konto beendet werden.

12. Recht/Gerichtsstand
Österreichisches Recht; zwingendes Verbraucherschutzrecht bleibt unberührt. Gerichtsstand nach gesetzlichen Regeln.

13. Kontakt
нохчизнакомства@support.com`;

const translations = {
  en: {
    header: "Info",
    privacy: "Privacy policy",
    terms: "Terms",
    close: "Close"
  },
  de: {
    header: "Info",
    privacy: "Datenschutzerklärung",
    terms: "AGB",
    close: "Schließen"
  },
  fr: {
    header: "Info",
    privacy: "Politique de confidentialité",
    terms: "Conditions",
    close: "Fermer"
  },
  ru: {
    header: "Инфо",
    privacy: "Политика конфиденциальности",
    terms: "Условия",
    close: "Закрыть"
  }
};

const LEGAL_CONTENT: Record<string, { privacy: string; terms: string }> = {
  en: {
    privacy: `Privacy Policy – App "Soul"

Controller: Soul, Mirabellplatz 4, 5020 Salzburg, Austria, E-Mail: нохчизнакомства@support.com

We collect: account/profile data (email/phone, display name, gender, birthday/age, intention, interests, bio), photos/selfies (for verification), location (for matches), device/push token, usage events (app_open, view_profile, like, match, message_send), chats/messages, and selfie-to-profile verification via serverless ("face-verify").
Purpose: matchmaking, profile/photo management, location-based suggestions, push notifications, fraud/abuse prevention (incl. facial match), diagnostics/product improvement, legal obligations.
Legal bases (GDPR): Art.6(1)(b) contract; Art.6(1)(a) consents (push, location, camera/photos); Art.6(1)(f) legitimate interests (security/stability); Art.6(1)(c) legal duties.
Processors/services: Supabase (auth/db/storage/realtime/functions), Expo/Apple/Google push, Sentry (crash), App Store/Google Play for payments.
Transfers: Supabase may process outside EU; protected by SCCs/technical measures.
Retention: profile data until account deletion; logs/analytics only as needed; photos until removal or account deletion; statutory retention unaffected.
Rights: access, rectification, erasure, restriction, portability, objection to legitimate interests, withdraw consent, complain to the Austrian DPA.
Minors: 18+ only; underage accounts are removed.
Contact: нохчизнакомства@support.com`,
    terms: `Terms (AGB) – App "Soul"

1. Provider: Soul, Mirabellplatz 4, 5020 Salzburg, Austria.
2. Service: dating/matchmaking app with profiles, photos, location-based suggestions, chat, verification.
3. Requirements: 18+, truthful data, device+internet, permissions (camera/photos, location, optional push).
4. User duties: no fake/abusive/illegal content; only own photos; respect IP; report misuse.
5. Verification: selfie vs profile may be required; failure/misuse can limit access.
6. Subscriptions: monthly auto-renew; price/term shown in-store; billing via App Store/Google Play; cancel in store settings; partial refunds generally not provided unless required by law; withdrawal per store rules.
7. Availability: reasonable efforts; downtime possible; no guarantee of uninterrupted service.
8. Moderation: provider may review/remove content or restrict/terminate accounts on violations.
9. Liability: intent/gross negligence unlimited; slight negligence limited to essential duties and typical damages; no liability for user content/external interactions; mandatory liability (product liability, life/body/health) remains.
10. Termination: open-ended; users can delete accounts anytime; provider may terminate regularly or for cause; subscriptions must be canceled in the store.
11. Changes: important changes communicated; continued use = acceptance; if you object, account may be closed.
12. Law: Austrian law; mandatory consumer law remains; venue per statutory rules.
13. Contact: нохчизнакомства@support.com`
  },
  de: {
    privacy: PRIVACY_TEXT,
    terms: TERMS_TEXT
  },
  fr: {
    privacy: `Politique de confidentialité – App "Soul"

Responsable : Soul, Mirabellplatz 4, 5020 Salzburg, Autriche, E-mail : нохчизнакомства@support.com

Données : compte/profil (e-mail/téléphone, nom affiché, genre, date de naissance/âge, intention, centres d’intérêt, bio), photos/selfies (vérification), localisation (suggestions), appareil/token push, événements d’usage (app_open, view_profile, like, match, message_send), chats, vérification selfie/profil (fonction serverless "face-verify").
Finalités : mise en relation, gestion profil/photos, suggestions basées sur la localisation, notifications push, prévention fraude/abus (incl. vérif. faciale), diagnostics/optimisation, obligations légales.
Bases (RGPD) : art.6(1)(b) contrat ; art.6(1)(a) consentements (push, localisation, appareil photo/photos) ; art.6(1)(f) intérêt légitime (sécurité/stabilité) ; art.6(1)(c) obligations légales.
Prestataires : Supabase (auth/bdd/storage/realtime/functions), Expo/Apple/Google push, Sentry (crash), App Store/Google Play (paiements).
Transferts : Supabase peut traiter hors UE ; protégés par clauses contractuelles types/mesures techniques.
Conservation : jusqu’à suppression du compte ; logs/analytics tant que nécessaire ; photos jusqu’à suppression ou clôture ; obligations légales inchangées.
Droits : accès, rectification, effacement, limitation, portabilité, opposition aux intérêts légitimes, retrait des consentements, plainte auprès de l’autorité autrichienne.
Mineurs : 18+ seulement ; comptes mineurs supprimés.
Contact : нохчизнакомства@support.com`,
    terms: `Conditions – App "Soul"

1. Fournisseur : Soul, Mirabellplatz 4, 5020 Salzburg, Autriche.
2. Service : application de rencontre avec profils, photos, suggestions par localisation, chat, vérification.
3. Conditions : 18+, données exactes, appareil + internet, autorisations (caméra/photos, localisation, push optionnel).
4. Devoirs : pas de faux profils, contenus illégaux ou offensants ; photos personnelles ; respect de la propriété intellectuelle ; signaler les abus.
5. Vérification : selfie vs photo de profil peut être requis ; échec/abus peut limiter l’accès.
6. Abonnements : mensuel avec reconduction auto ; prix/durée affichés dans le store ; facturation via App Store/Google Play ; résiliation dans les réglages du store ; pas de remboursement partiel sauf obligation légale ; droit de rétractation selon règles du store.
7. Disponibilité : efforts raisonnables ; interruptions possibles ; pas de garantie de service ininterrompu.
8. Modération : le fournisseur peut revoir/supprimer du contenu ou restreindre/fermer des comptes en cas de violation.
9. Responsabilité : intention/faute lourde illimitée ; faute légère limitée aux obligations essentielles et aux dommages typiques ; pas de responsabilité pour contenus/interactions externes ; responsabilité obligatoire (produits, vie/corps/santé) inchangée.
10. Résiliation : durée indéterminée ; suppression possible à tout moment ; résiliation ordinaire ou pour motif ; abonnements à résilier dans le store.
11. Modifications : changements importants annoncés ; l’usage continu vaut acceptation ; en cas d’objection, le compte peut être fermé.
12. Droit : droit autrichien ; droit consommateur impératif préservé ; juridiction selon la loi.
13. Contact : нохчизнакомства@support.com`
  },
  ru: {
    privacy: `Политика конфиденциальности – приложение "Soul"

Оператор: Soul, Mirabellplatz 4, 5020 Зальцбург, Австрия, E-mail: нохчизнакомства@support.com

Данные: аккаунт/профиль (email/телефон, имя, пол, дата рождения/возраст, намерения, интересы, био), фото/селфи (верификация), локация (подбор анкет), устройство/push-токен, события использования (app_open, view_profile, like, match, message_send), чаты, сверка селфи с фото профиля (serverless "face-verify").
Цели: дейтинг, управление профилем/фото, подсказки по локации, push-уведомления, борьба с мошенничеством/абьюзом (в т.ч. сверка лица), диагностика/улучшения, юр. обязанности.
Правовые основания (GDPR): ст.6(1)(b) договор; ст.6(1)(a) согласия (push, гео, камера/фото); ст.6(1)(f) законный интерес (безопасность/стабильность); ст.6(1)(c) юр. обязательства.
Сервисы: Supabase (auth/db/storage/realtime/functions), Expo/Apple/Google push, Sentry (crash), App Store/Google Play (платежи).
Передачи: Supabase может обрабатывать вне ЕС; защита через стандартные договорные положения и техн. меры.
Хранение: до удаления аккаунта; логи/аналитика — по необходимости; фото — до удаления или удаления аккаунта; законные сроки сохраняются.
Права: доступ, исправление, удаление, ограничение, переносимость, возражение против законных интересов, отзыв согласий, жалоба в австрийский надзор.
Несовершеннолетние: 18+; аккаунты младше удаляются.
Контакт: нохчизнакомства@support.com`,
    terms: `Условия (AGB) – приложение "Soul"

1. Провайдер: Soul, Mirabellplatz 4, 5020 Зальцбург, Австрия.
2. Сервис: дейтинг/матчмейкинг с профилями, фото, подсказками по локации, чатом и верификацией.
3. Требования: 18+, правдивые данные, устройство+интернет, разрешения (камера/фото, гео, push опционально).
4. Обязанности: без фейков/оскорблений/незаконного; только свои фото; уважать авторские права; сообщать о злоупотреблениях.
5. Верификация: сравнение селфи и фото профиля может быть обязательным; при отказе/злоупотреблении доступ ограничивается.
6. Подписки: ежемесячно с автопродлением; цена/срок в сторе; оплата через App Store/Google Play; отмена в настройках стора; обычно без частичных возвратов, если не требует закон; право на отзыв — по правилам стора.
7. Доступность: разумные усилия; возможны перерывы; нет гарантии бесперебойной работы.
8. Модерация: провайдер может проверять/удалять контент или ограничивать/закрывать аккаунты при нарушениях.
9. Ответственность: умысел/грубая небрежность — без ограничений; легкая — только за основные обязанности и типичный ущерб; нет ответственности за пользовательский контент/внешние контакты; обязательная ответственность (продукты, жизнь/здоровье) сохраняется.
10. Прекращение: бессрочно; пользователь может удалить аккаунт; провайдер — с уведомлением или при нарушениях; подписки отменяются в сторе.
11. Изменения: важные изменения сообщаются; продолжение использования = согласие; при возражении аккаунт может быть закрыт.
12. Право: австрийское право; обязательные нормы для потребителей сохраняются; подсудность по закону.
13. Контакт: нохчизнакомства@support.com`
  }
};

const LegalScreen = ({ route }: { route?: any }) => {
  const copy = useLocalizedCopy(translations);
  const { locale } = useLocale();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const initialTarget: "privacy" | "terms" | undefined = route?.params?.screen;
  const [showPrivacy, setShowPrivacy] = useState(initialTarget === "privacy");
  const [showTerms, setShowTerms] = useState(initialTarget === "terms");

  const legalText = LEGAL_CONTENT[locale] ?? LEGAL_CONTENT.en;

  const rows: { label: string; onPress: () => void }[] = [
    { label: copy.privacy, onPress: () => setShowPrivacy(true) },
    { label: copy.terms, onPress: () => setShowTerms(true) },
    { label: "Privacy (Web)", onPress: () => Linking.openURL(PRIVACY_URL) },
    { label: "Terms (Web)", onPress: () => Linking.openURL(TERMS_URL) }
  ];

  const closeModal = () => {
    // Wenn aus einem direkten Ziel (z. B. Registrierung) aufgerufen, sofort zurück navigieren,
    // damit kein leerer Screen zwischenrendern kann.
    if (initialTarget) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate("Welcome" as never);
      }
      return;
    }
    setShowPrivacy(false);
    setShowTerms(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {!initialTarget && (
        <>
          <View style={[styles.header, { paddingTop: Math.max(insets.top - 32, 0) }]}>
            <Pressable
              style={styles.headerButton}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate("Profile" as never);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={copy.close}
            >
              <Ionicons name="close" size={22} color="#1f2933" />
            </Pressable>
            <Text style={styles.headerTitle}>{copy.header}</Text>
            <View style={styles.headerButton} />
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 24, 32) }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              {rows.map((row, index) => (
                <Pressable
                  key={row.label}
                  style={[styles.row, index < rows.length - 1 && styles.rowDivider]}
                  onPress={row.onPress}
                >
                  <Text style={styles.rowText}>{row.label}</Text>
                  <Ionicons name="open-outline" size={18} color="#9aa0aa" />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      <Modal visible={showPrivacy} animationType="slide" onRequestClose={() => setShowPrivacy(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 32 }]}>
            <Pressable style={styles.headerButton} onPress={closeModal}>
              <Ionicons name="close" size={22} color="#1f2933" />
            </Pressable>
            <Text style={styles.modalTitle}>{copy.privacy}</Text>
            <View style={styles.headerButton} />
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator>
            <Text style={styles.modalBody}>{legalText.privacy}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showTerms} animationType="slide" onRequestClose={() => setShowTerms(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 32 }]}>
            <Pressable style={styles.headerButton} onPress={closeModal}>
              <Ionicons name="close" size={22} color="#1f2933" />
            </Pressable>
            <Text style={styles.modalTitle}>{copy.terms}</Text>
            <View style={styles.headerButton} />
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator>
            <Text style={styles.modalBody}>{legalText.terms}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff"
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2933"
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 16
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4e6eb",
    overflow: "hidden"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderColor: "#e4e6eb"
  },
  rowText: {
    fontSize: 16,
    color: "#2b2d35",
    fontWeight: "500"
  },
  modalSafe: {
    flex: 1,
    backgroundColor: "#fff"
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#e4e6eb"
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2933"
  },
  modalScroll: {
    flex: 1
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 32
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1f2933",
    includeFontPadding: false
  }
});

export default LegalScreen;
