# App Store Assets & Submission Notes

## App-Beschreibung (Deutsch)

**Titel:** Noxchiin – Verifizierte Community-Verbindungen

**Kurzbeschreibung:**
Verifizierte Community-Einführungen mit Privacy-First-Fotos und sicherem Chat.

**Langbeschreibung:**
Noxchiin ist eine Community-App für verifizierte Verbindungen innerhalb der tschetschenischen Gemeinschaft.

- **Verifizierte Profile:** Selfie-Scan bestätigt echte Identitäten.
- **Privacy-First Fotos:** Fotos bleiben verborgen/blurred bis zur Verbindung oder per Whitelist.
- **Regionale Einführungen:** Vorschläge basieren auf Region und Aktivität.
- **Sicherer Austausch:** Melden, blockieren, Moderation & Schutzfunktionen.

Noxchiin setzt auf Datenschutz und Transparenz: Profile lassen sich jederzeit bearbeiten oder löschen, Kommunikation ist geschützt.

## App Description (English)

**Title:** Noxchiin – Verified Community Connections

**Subtitle:** Trust-first introductions with verification and privacy-by-default.

**Long Description:**
Noxchiin is a community app for verified connections within the Chechen diaspora.

- **Verified profiles:** Selfie verification confirms identity.
- **Privacy-first photos:** Photos stay blurred/locked until connection or whitelist access.
- **Regional introductions:** Suggestions based on region and activity.
- **Safety & moderation:** Report, block, and proactive protection.

Noxchiin respects privacy and transparency: edit or delete your data anytime; secure messaging included.

## Keywords

- Community, Vertrauen, Verifizierung, Kontakte, Begegnung, Beziehung, Chat, Sicherheit, Nearby, Intro

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
| Benutzerinhalt | Fotos, Profilangaben, Chatnachrichten | Profilanzeige, Einführung, Kommunikation |
| Standort | Stadt / Geopunkt (optional) | Vorschläge in der Nähe |
| Nutzungsdaten | Interaktionen, Einführungen, Nachrichten | Vorschläge, Missbrauchserkennung |
| Kennungen | Supabase User-ID, Device Push Token | Accountverwaltung, Push-Benachrichtigungen |

**Nicht erhobene Daten:** Finanzdaten, Gesundheitsdaten, Browser-Historie.

**Datenweitergabe:** Keine Weitergabe an Drittvermarkter; Nutzung innerhalb von Noxchiin-Services (Supabase, RevenueCat, Expo Push).

## Support- & Privacy-Links (Placeholder)

- Support URL: https://meetmate.example.com/support
- Privacy Policy: https://meetmate.example.com/privacy

## Review-Checkliste (Community & Trust)

1. **Melden & Blockieren:** Funktion klar erreichbar (Profil/Chat/Discovery) und dokumentiert.
2. **Moderation:** Team / automatisierte Prüfungen + Edge-Funktion `abuse-check` zur doppelten Absicherung.
3. **Account-Löschung in App:** Möglich über Privacy-Center (Datenexport & Löschung via Supabase Function `privacy`).
4. **Transparente Paywall:** Regionale Handhabung (`paywall_mode`), keine externen Links auf iOS, klare Texte im PaywallScreen.
5. **Rechtliche Links:** Impressum/Privacy im Privacy Center; App-Listing verweist auf Support & Privacy URLs.
