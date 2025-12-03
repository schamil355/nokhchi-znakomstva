## Selfie-Scan & Push-Troubleshooting

Dieser Leitfaden fasst die wichtigsten Schritte zusammen, um die beobachteten Fehler („Selfie-Scan meldet immer Fehler“, „Expo Push 400“) schnell zu beheben.

### 1. Supabase Function `face-verify`

Die Funktion benötigt dieselben AWS-Zugangsdaten wie das NestJS-Backend, sonst kann Rekognition nichts vergleichen. So setzt du die Secrets:

```bash
cd supabase
supabase secrets set \
  AWS_ACCESS_KEY_ID="AKIA..." \
  AWS_SECRET_ACCESS_KEY="..." \
  AWS_REGION="eu-central-1" \
  PROFILE_BUCKET="photos_private" \
  VERIFS_BUCKET="verifications" \
  MATCH_THRESHOLD="0.82"
supabase functions deploy face-verify
```

Erst wenn in den Logs **kein** „AWS credentials missing“ mehr auftaucht, liefert der Selfie-Scan unterscheidbare Ergebnisse für „kein Gesicht“ vs. „Match“. Achte darauf, dass sowohl die Funktion als auch das Mobile App denselben Bucket verwenden (`photos_private`).

### 2. Expo Push Tokens

HTTP 400 vom Expo-Endpunkt bedeutet, dass der Request ungültig war (falscher Token oder abgelaufener Access Token).

1. Prüfe die gespeicherten Gerätetokens:
   ```sql
   select token from public.devices where token not like 'ExponentPushToken%';
   ```
   Alle Tokens ohne `ExponentPushToken[...]` entfernen:
   ```sql
   delete from public.devices where token not like 'ExponentPushToken%';
   ```
2. Validiere verdächtige Tokens manuell:
   ```bash
   npx expo push:send --token ExponentPushToken[...]
   ```
   Wenn Expo mit 400 antwortet, Token löschen – das Backend tut das bei `DeviceNotRegistered` automatisch, aber nicht bei Syntaxfehlern.
3. Hinterlege die erlaubten Experience-IDs (z. B. `@zelimkhan/tschetschenische-dating-app`) in `EXPO_ALLOWED_PROJECT_IDS` innerhalb `server/.env`. Tokens anderer Apps werden automatisch verworfen, damit Expo keine 400er wegen gemischter Projekte mehr meldet.
4. Generiere bei Bedarf einen neuen `EXPO_PUSH_ACCESS_TOKEN` im Expo Dashboard und trage ihn ein.

### 3. Prisma / Supabase Pooler

Der `VerificationCleanupJob` scheitert, weil `DATABASE_URL` falsche Zugangsdaten enthält. Verwende den Supabase-Pooler-String inkl. Passwort:

```
DATABASE_URL="postgresql://postgres.<ref>:<passwort>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"
```

Nach Anpassung der `.env`:

```bash
cd server
pnpm prisma generate
pnpm run start:dev
```

Erst wenn `VerificationCleanupJob` ohne Exception durchläuft, sind die Credentials korrekt.

### 4. Fehlermeldungen sichtbar machen

- Falls Expo wieder 400 zurückgibt, liefert `PushService` jetzt die Response im Log (siehe Code-Änderung).
- Prisma-Authentifizierungsfehler werden gefangen und mit einem Hinweis geloggt, damit der Scheduler nicht fortlaufend abstürzt.

Mit diesen Schritten lässt sich der komplette Onboarding-Flow (Foto → Selfie-Scan → Push-Test) stabil nachvollziehen.
