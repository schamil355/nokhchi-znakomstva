# App Store Assets & Submission Notes

## App-Beschreibung (Deutsch)

**Titel:** meetmate – Genuine Verbindungen in deiner Nähe

**Kurzbeschreibung:**
Finde Matches, die wirklich zu dir passen. meetmate kombiniert verifizierte Profile, smarte Vorschläge und sichere Kommunikation.

**Langbeschreibung:**
Triff Menschen, die deine Interessen teilen – mit meetmate, der modernen Dating-App für echte Verbindungen.

- **Smarte Vorschläge:** Unsere Matching-Heuristik gewichtet Distanz, Aktivität und gemeinsame Interessen.
- **Profil-Highlights:** Teile Fotos, Bio und Interessen, um dich authentisch zu zeigen.
- **Swipe & Match:** Entdecke täglich neue Vorschläge, like oder super-like und starte Gespräche.
- **Sicher chatten:** Melde, blockiere oder teile verdächtige Inhalte – unser Moderationsteam reagiert schnell.
- **Push-Benachrichtigungen:** Bleib informiert, wenn neue Matches oder Nachrichten eintreffen.

meetmate setzt auf Datenschutz und Transparenz: Profile lassen sich jederzeit bearbeiten oder löschen, alle Kommunikation erfolgt verschlüsselt.

## App Description (English)

**Title:** meetmate – Real Connections Near You

**Subtitle:** Smart matches and safe messaging for meaningful dating.

**Long Description:**
meetmate helps you discover people who truly fit your vibe.

- **Intelligent Discovery:** Personalized recommendations based on distance, recency, shared interests and feedback.
- **Rich Profiles:** Showcase your story with photos, prompts and interests.
- **Swipe & Match:** Explore daily suggestions, send likes or super likes and start chatting instantly.
- **Safe by Design:** Report or block profiles, detect unwanted content and rely on responsive moderation.
- **Stay Notified:** Push notifications highlight new matches and messages so you never miss a moment.

meetmate respects your privacy – edit or delete your data anytime, encrypted messaging included.

## Keywords

- Dating, Match, Liebe, Beziehung, Freundschaft, Singles, Chat, Sicherheit, Nearby, Swipe

## Altersfreigabe (Hinweise)

- Nutzer*innen generieren Inhalte (Profile, Chat-Nachrichten).
- Melde- und Blockierfunktionen vorhanden.
- Moderationsteam prüft gemeldete Inhalte.
- Offizielle Altersfreigabe: 18+ empfohlen (kein Zugang für Minderjährige vorgesehen).

## Privacy Nutrition Label (Template)

**Daten, die mit dem Nutzer verknüpft werden:**

| Kategorie | Datenpunkte | Zweck |
| --- | --- | --- |
| Kontaktinfo | E-Mail-Adresse | Authentifizierung, Support |
| Benutzerinhalt | Fotos, Profilangaben, Chatnachrichten | Profilanzeige, Matching, Kommunikation |
| Standort | Stadt / Geopunkt (optional) | Vorschläge in der Nähe |
| Nutzungsdaten | Likes, Matches, Interaktionen | Matching-Heuristik, Missbrauchserkennung |
| Kennungen | Supabase User-ID, Device Push Token | Accountverwaltung, Push-Benachrichtigungen |

**Nicht erhobene Daten:** Finanzdaten, Gesundheitsdaten, Browser-Historie.

**Datenweitergabe:** Keine Weitergabe an Drittvermarkter; Nutzung innerhalb von meetmate Services (Supabase, RevenueCat, Expo Push).

## Support- & Privacy-Links (Placeholder)

- Support URL: https://meetmate.example.com/support
- Privacy Policy: https://meetmate.example.com/privacy

## Review-Checkliste (Dating-spezifisch)

1. **Melden & Blockieren:** Funktion klar erreichbar (Profil/Chat/Discovery) und dokumentiert.
2. **Moderation:** Team / automatisierte Prüfungen + Edge-Funktion `abuse-check` zur doppelten Absicherung.
3. **Account-Löschung in App:** Möglich über Privacy-Center (Datenexport & Löschung via Supabase Function `privacy`).
4. **Transparente Paywall:** Regionale Handhabung (`paywall_mode`), keine externen Links auf iOS, klare Texte im PaywallScreen.
5. **Rechtliche Links:** Impressum/Privacy im Privacy Center; App-Listing verweist auf Support & Privacy URLs.
