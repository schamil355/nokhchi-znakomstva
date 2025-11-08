# CI & Release Notes

## Secrets

| Secret | Zweck | Hinweis |
| --- | --- | --- |
| `EXPO_TOKEN` | Authentifizierung für `eas build` in GitHub Actions. | Erstelle ein **Personal Access Token** unter [Expo Account Settings](https://expo.dev/accounts) mit Build-Rechten und hinterlege es als Repository-Secret. |
| `SENTRY_AUTH_TOKEN` | Optional: erlaubt Uploads von Sourcemaps oder Release-Metadaten während des Builds. | Token im Sentry Account mit `project:releases`-Recht erstellen. Wird im Workflow nur erkannt, wenn vorhanden. |

## EAS Profile Übersicht

- **preview** – interner Build mit Development Client (`apk` + iOS Simulator) für QA.
- **production** – Store-Build (Android App Bundle & iOS Device Binary).

## GitHub Actions

Workflow `ci.yml` läuft auf `main` und Tags (`v*.*.*`).
1. `lint-test`: führt `npm run lint`, `npm run typecheck`, `npm run test:unit` aus.
2. `eas-build-preview`: triggert nur auf Tags, erzeugt Preview-Build via `eas build --profile preview`.

Stelle sicher, dass alle Secrets gesetzt sind, bevor ein Tag-Push erfolgt.
