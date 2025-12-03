# Datenschutz & DSGVO-Workflows

Dieses Dokument beschreibt, wie betroffene Personen ihr Konto innerhalb der Mobile-App löschen oder einen Daten-Export anfordern können. Alle Schritte beziehen sich auf das Backend (`server/`) und die Supabase-Instanz unter `PROJECT_ROOT/supabase`.

## Self-Service Endpunkte

| Endpoint | Beschreibung |
|---|---|
| `GET /v1/account/export` | Liefert ein JSON mit Profil, Fotos (Metadaten), Likes/Passes, Matches, Events, Devices, Blocks & Reports des angemeldeten Nutzers. |
| `DELETE /v1/account` | Löscht das Konto: Fotos werden aus Supabase Storage entfernt, Likes/Passes/Matches/Events/Devices/Blocks/Reports für den User werden gelöscht und `auth.users` wird per Service-Role gelöscht. |
| `DELETE /v1/account?dryRun=true` | Führt keine Löschung durch, sondern liefert eine Zusammenfassung der Datensätze, die entfernt würden (Count je Tabelle). |

Alle Routen sind mit `JwtAuthGuard` geschützt (Bearer Token). Die Löschung triggert nach Abschluss ein erneutes Login mit einem leeren Konto.

## Operator-Prozess

1. **Identität prüfen** – Tickets nur bearbeiten, wenn der Nutzer über die App authentifiziert ist oder per Support (KYC) bestätigt wurde.
2. **Export (optional)** – `GET /v1/account/export` ausführen und Ergebnis dem Nutzer verschlüsselt bereitstellen (z. B. ZIP + Passwort via separates Medium).
3. **Löschung** – `DELETE /v1/account` aufrufen (optional zuerst `dryRun`). Storage-Dateien werden gelöscht, anschließend `auth.users` (Supabase) entfernt.
4. **Bestätigung** – Nutzer per Mail benachrichtigen, dass die Löschung abgeschlossen wurde (gesetzliche Frist: ≤ 30 Tage).

Support-Kontakt/Impressum: privacy@meetmate.app • Kaiserstraße 17, 60311 Frankfurt, Deutschland. Datenschutzanfragen werden im Ticket-System geloggt.

## RLS & Negativtests

Die Migration `20250301152000_account_rls_and_checks.sql` sichert, dass nur Besitzer auf folgende Tabellen zugreifen dürfen: `profiles`, `messages`, `blocks`, `reports`, `photo_assets`, `photo_permissions`. Das View `public.rls_negative_checks` listet Szenarien (“User A liest Profil von User B”) inkl. erwartetem Resultat (“0 Rows”), damit QA einfache Negativtests dokumentieren kann.

Manuelle Checks:

1. **Fremdprofil lesen** – Versuch, mit Token von User A `/rest/v1/profiles?id=eq.<UserB>` zu lesen ⇒ sollte `401/0 rows`.
2. **Fremde Nachrichten lesen** – `/rest/v1/messages?match_id=eq.<match-ohne-user>` ⇒ keine Zeilen.
3. **Exports für fremde User** – `GET /v1/account/export` mit Token B liefert nur Daten von B.

## Aufbewahrungsfristen

- Chat- und Match-Daten werden nach Konto-Löschung sofort entfernt (bzw. aufgrund von FK-Cascades).
- Backups (Supabase PITR) werden maximal 30 Tage vorgehalten; Zugriff nur durch das Infra-Team, ausschließlich für Disaster-Recovery.
