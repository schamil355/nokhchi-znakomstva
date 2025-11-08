# Delta Patch Notes – Discovery/Matches/Push Hardening

## Änderungen
- **Discovery** nutzt jetzt ausschließlich `get_discovery_profiles` (Supabase RPC). Die neue Migration `20250301090010_discovery_rpc_sync.sql` ersetzt Alt-RPCs, bringt einen `location_geohash`-Index mit und filtert Incognito-, Block- und Like-Logik serverseitig.
- **Matches** setzen auf das originale `matches`-Schema (`user_a/user_b`). Migration `20250301090000_matches_view_and_functions.sql` ergänzt `matches_v`, `upsert_match(a,b)` und `is_matched(a,b)`; der Mobile-Client erstellt Matches nur noch via RPC und liest Daten über die View.
- **Push Tokens** landen in der neuen Tabelle `public.devices` (Migration `20250301090020_devices_table_rls.sql`) mit sauberem RLS; `pushService.ts` upsertet `(user_id, token, platform)` statt Storage-Tabellen.
- **Foto-Endpunkte**: `photoService.ts` bezieht die Basis-URL aus `EXPO_PUBLIC_API_URL` (Fallback `http://localhost:3000`). GuardedPhoto funktioniert dadurch auch bei frischen Projekten – Variable ist in `.env` + `.env.example` dokumentiert.
- **Secret Hygiene**: `SUPABASE_SERVICE_ROLE_KEY` wurde aus der Expo-Umgebung entfernt (`.env.local` gelöscht). Nutze `server/.env` für Server-Secrets; `.gitignore` verhindert versehentliche Commits.
- **Dependencies/Polyfills**: `@supabase/supabase-js@^2.46.0` ist jetzt ein reguläres Dependency; `App.tsx` lädt den URL-Polyfill zuerst, damit Supabase-Client + Fetch konsistent sind.
- **Observability & Analytics**: Mobile lädt `./sentry` und initialisiert jetzt `@sentry/react-native` samt Expo-Plugin, ErrorBoundary meldet Fehler an Sentry, und `analytics.ts` wird aus Discovery/Chat-Likes/Messages heraus genutzt (`view_profile`/`like`/`match`/`message_send`). Server startet mit `@sentry/node` + globalem Filter.
- **CI / Releases**: Neue Workflows (`mobile.yml`, `server.yml`) führen Lint/Test-Smokes aus; `mobile.yml` prüft via `sentry-cli info`, während das Expo-Plugin `@sentry/react-native/expo` bei EAS-Builds automatisch Debug-Symbole & Sourcemaps hochlädt. `eas.json` definiert `development`/`preview`/`production` Profile; `app.json` enthält den neuen Plugin-Hook.

## ENV Setup
1. Kopiere `.env.example` → `.env` und fülle:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_API_URL` (z. B. `http://localhost:3000`)
   - `EXPO_PUBLIC_SENTRY_DSN`
   - optional `SENTRY_AUTH_TOKEN` (für CI / Sentry Uploads)
2. Erstelle `server/.env` (nicht eingecheckt) mit:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SENTRY_DSN` + optional `SENTRY_TRACES_SAMPLE_RATE`
3. `npm install` ausführen (Netzwerkzugriff erforderlich), damit `@supabase/supabase-js` im Lockfile landet.

## Funktionsweise nach dem Patch
- **Discovery Flow**: `useDiscoveryFeed` → `fetchDiscoveryFeed` → Supabase RPC `get_discovery_profiles`. Matches/Blocks/Incognito werden serverseitig bereinigt, Client filtert nur noch Alters-/Intentions-Filter.
- **Like → Match**: `sendLike` schreibt in `public.likes`, prüft Gegenseite und ruft `upsert_match(liker, liked)`. Das Ergebnis holt das UI über `matches_v`, womit `participants` konsistent und sortiert sind.
- **Push Registrierung**: `registerPushNotifications` → Expo Token → `public.devices` (RLS-geschützt). Nur iOS/Android werden registriert; Fallbacks loggen sauber, keine Storage-Buckets mehr.
- **Fotos**: Alle GuardedPhoto-Aufrufe laufen über `${EXPO_PUBLIC_API_URL}/v1/photos/...`, wodurch Mobil + Server denselben Host verwenden.
