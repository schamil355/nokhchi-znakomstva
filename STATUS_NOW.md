1) **Übersicht**
   - Expo-MVP deckt Auth, Discovery, Matches sowie Foto-Privacy bereits ab und stützt sich auf Supabase-Profile, -Likes/-Matches und die GuardedPhoto-Pipeline.
   - NestJS-Backend liefert die Foto-Signing-, Privacy- und Verifizierungs-APIs, unterstützt durch einen separaten FastAPI-ML-Service und umfangreiche SQL-Migrationen für RLS/Geo-Routing.
   - GitHub-Actions, Unit-Tests und Moderations-Admin existieren, doch Analytics/Sentry fehlen und es gibt Schema-Drifts (z. B. `matches.participants`, `list_discovery_profiles`).

   | Bereich | Gefunden (Ja/Nein) | Wichtigste Dateien |
   |---|---|---|
   | Mobile (Expo) | Ja | `src/App.tsx`, `src/screens/*`, `src/services/*`, `app.json` |
   | Backend (server/) | Ja | `server/src/photos/*.ts`, `server/src/verification/verification.service.ts`, `server/src/settings/privacy.controller.ts` |
   | Supabase/migrations | Ja | `supabase/migrations/20241105_interactions_chat.sql`, `20241109_incognito_photo_privacy.sql`, `20250215010300_discovery_incognito_rpc.sql` |
   | Supabase/functions | Ja | `supabase/functions/geo/index.ts` |
   | Tests/CI | Ja | `__tests__/*.test.ts`, `.github/workflows/ci.yml`, `docs/verification-test-plan.md` |

2) **Kategorien – Ist-Stand & Belege**

**A) Auth & Profile**
| Feld | Inhalt |
|---|---|
| Status | UMGESETZT |
| Kern-Features umgesetzt | - Supabase-E-Mail/Passwort-Login mit Rate-Limiter + Session-Bootstrap<br>- Profil-CRUD inkl. zod-Validierung & Premium/Incognito-Flags<br>- Auth-gesteuerte Navigation zwischen AuthStack/MainTabs<br>- Profilbearbeitung mit Privacy-Toggles & lokale Photo-Verwaltung |
| Wichtigste Code-Evidenz | `src/services/authService.ts:22`: Passwort-Login/-Logout inkl. Profil-Bootstrap<br>`src/lib/supabaseClient.ts:1`: SecureStore-basierter Supabase-Client + URL-Polyfill<br>`src/navigation/AppNavigator.tsx:27`: AuthStack vs. MainTabs/Chat Routing<br>`src/services/profileService.ts:27`: Profil-Select/Upsert mit is_incognito/show_distance<br>`src/screens/ProfileScreen.tsx:69`: Profilformular + Privacy-Schalter/Speichern |
| Relevante Dependencies | `@tanstack/react-query@^5.90.7`, `@react-navigation/native@^7.1.8`, `expo-secure-store@~15.0.7` |
| Laufzeit-Hinweise | `src/lib/supabaseClient.ts:10` greift auf `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY` zurück; Dependency `@supabase/supabase-js` ist im Wurzel-`package.json` nicht gepflegt und muss für Builds nachgezogen werden. |

**B) Discovery/Ranking + Filters**
| Feld | Inhalt |
|---|---|
| Status | TEILWEISE |
| Kern-Features umgesetzt | - React-Query basierter Discovery-Feed mit Session-gebundenem Cache<br>- Likes/Skips inkl. Kompatibilitäts-Score & automatischem Match-Insert<br>- Lokale Filter (Gender, AgeRange, Intention, Distance) via Zustand Store<br>- Serverseitige Incognito-/Geo-Filtration laut Supabase-RPC |
| Wichtigste Code-Evidenz | `src/hooks/useDiscoveryFeed.ts:6`: Feed-Abfrage mit Benutzerfiltern<br>`src/services/discoveryService.ts:10`: Fetch/Like/Skip inkl. Rate-Limiter & Match-Erstellung<br>`src/lib/matchEngine.ts:4`: Kompatibilitäts-Score + Eligibility<br>`src/state/preferencesStore.ts:17`: Grundfilter & Setter<br>`src/screens/DiscoveryScreen.tsx:9`: UI für Swipe-Feed inkl. Alerts<br>`supabase/migrations/20250215010300_discovery_incognito_rpc.sql:13`: Incognito- & Block-gefiltertes `get_discovery_profiles` |
| Relevante Dependencies | `@tanstack/react-query@^5.90.7`, `zustand@^5.0.8`, `date-fns@*` |
| Laufzeit-Hinweise | Client ruft `list_discovery_profiles` ( `src/services/profileService.ts:105` ), während die Migration aktuell nur `get_discovery_profiles` bereitstellt (`supabase/migrations/20250215010300_discovery_incognito_rpc.sql:13` ); zudem verwendet `skipProfile` andere Spaltennamen als `public.passes` (`src/services/discoveryService.ts:77` vs. `supabase/migrations/20241105_interactions_chat.sql:18`). |

**C) Likes/Matches/Realtime-Chat**
| Feld | Inhalt |
|---|---|
| Status | TEILWEISE |
| Kern-Features umgesetzt | - Supabase-basierter Match- und Message-Fetch mit Realtime-Channel<br>- GiftedChat UI inkl. Send/Typing-Handling & unread Badge Store<br>- Like-Pipeline erzeugt Matches + optionalen Compatibility-Score<br>- RLS-gesicherte Likes/Passes/Matches/Messages in SQL |
| Wichtigste Code-Evidenz | `src/services/matchService.ts:9`: Match/Message Fetch, Insert & Realtime<br>`src/hooks/useMessages.ts:6`: Query + Live-Stream + Cache-Invalidation<br>`src/screens/MatchesScreen.tsx:9`: Matchliste mit Unread-Badges + Navigation<br>`src/screens/ChatScreen.tsx:12`: GiftedChat Integration & Mutationen<br>`supabase/migrations/20241105_interactions_chat.sql:8`: Likes/Matches/Messages Tabellen + RLS |
| Relevante Dependencies | `@supabase/supabase-js@^2.x (erwartet)`, `react-native-gifted-chat@^2.8.1`, `@tanstack/react-query@^5.90.7` |
| Laufzeit-Hinweise | `sendLike` schreibt ein JSON-Feld `participants` in `matches` (`src/services/discoveryService.ts:50`), während das Schema nur `user_a/user_b` kennt (`supabase/migrations/20241105_interactions_chat.sql:29`); Schema und Client müssen synchronisiert werden, damit Chatdaten konsistent gespeichert werden. |

**D) InstaChat (Vor-Match-Nachrichten)**
| Feld | Inhalt |
|---|---|
| Status | NICHT VORHANDEN |
| Kern-Features umgesetzt | - n/a |
| Wichtigste Code-Evidenz | n/a |
| Relevante Dependencies | n/a |
| Laufzeit-Hinweise | n/a |

**E) Incognito-Modus & Foto-Privatsphäre**
| Feld | Inhalt |
|---|---|
| Status | UMGESETZT |
| Kern-Features umgesetzt | - GuardedPhoto lädt signierte URLs & refresht Tokens<br>- Foto-Upload → Supabase Storage → NestJS `/v1/photos/register/view`<br>- Profil-Screen bietet Incognito, Distance & Last-Seen Toggles<br>- SQL Tabellen + Policies für photo_assets/-permissions & Incognito-View<br>- Doku beschreibt Privacy-Flows und Admin-only service_role Nutzung |
| Wichtigste Code-Evidenz | `src/components/GuardedPhoto.tsx:11`: Pullt signierte URLs + Refresh-Loop<br>`src/services/photoService.ts:5`: Upload, Register, Sign/View, Privacy-Updates<br>`src/screens/ProfileScreen.tsx:69`: Visibility Chips & Privacy Switches<br>`server/src/photos/photos.service.ts:32`: Register/View/Grant/Revoke inkl. Rate-Limits<br>`supabase/migrations/20241109_incognito_photo_privacy.sql:12`: photo_assets/permissions + Storage Policies<br>`docs/privacy_incognito.md:5`: Prozess- & Sicherheitsbeschreibung |
| Relevante Dependencies | `expo-image-picker@~17.0.8`, `expo-secure-store@~15.0.7`, `sharp@^0.33.3` |
| Laufzeit-Hinweise | `src/services/photoService.ts:5` verlangt `EXPO_PUBLIC_API_URL`, dieser Key fehlt in `.env:1-4`; ohne gesetzte Backend-Basis kann der GuardedPhoto-Fluss keine URLs signieren. |

**K) Safety: Report/Block, Auto-Unmatch, Verifizierung**
| Feld | Inhalt |
|---|---|
| Status | TEILWEISE |
| Kern-Features umgesetzt | - Reports/Blocks mit Rate-Limiter & Settings-UI für Meldungen<br>- NestJS Verification-Service mit Selfie/Liveness/OTP + Prisma Audits<br>- ML Liveness/Similarity Prüfung via FastAPI/InsightFace<br>- Dokumentierte QA-/Security-Checks für Verification |
| Wichtigste Code-Evidenz | `src/services/moderationService.ts:7`: report/block/unblock schreibt Supabase-Tabellen<br>`src/screens/SettingsScreen.tsx:124`: UI für Reporting, Blocken & Filter-Reset<br>`server/src/verification/verification.service.ts:44`: Session/Liveness/OTP Handling + Audit-Logs<br>`ml-service/main.py:17`: FastAPI Liveness/Similarity inklusive Thresholds<br>`docs/verification-test-plan.md:7`: Testplan & Monitoring-Metriken |
| Relevante Dependencies | `@aws-sdk/client-rekognition@^3.614.0`, `ioredis@^5.4.1`, `fastapi@*` |
| Laufzeit-Hinweise | Reports/Blocks werden clientseitig vorausgesetzt (`src/services/moderationService.ts:15` / `meetmate-admin/app/blocks/page.tsx:4`), entsprechende Tabellen/Views sind in den vorliegenden Migrationen jedoch nicht enthalten und müssen extern gepflegt werden. |

**L) Push-Notifications (Expo/APNs/FCM)**
| Feld | Inhalt |
|---|---|
| Status | TEILWEISE |
| Kern-Features umgesetzt | - Berechtigungsfluss + Expo Push Token Registrierung<br>- Token-Speicherung samt Platform-Feld in Supabase `devices`-Table<br>- App Bootstrap ruft Registrierung nach Session-Bootstrap auf<br>- app.json konfiguriert expo-notifications + Secure-Store Plugin |
| Wichtigste Code-Evidenz | `src/services/pushService.ts:16`: Permission Flow + Token-Registrierung (devices upsert)<br>`src/App.tsx:40`: Bootstrap ruft `registerPushNotifications()` nach Session<br>`app.json:36`: Plugins `expo-notifications`, `expo-secure-store`, `expo-image-picker` |
| Relevante Dependencies | `expo-notifications@~0.32.12`, `expo-device@~8.0.9`, `expo-secure-store@~15.0.7` |
| Laufzeit-Hinweise | Der Client speichert Tokens (`src/services/pushService.ts:51`), aber ein serverseitiger Versandpfad ist im `server/src`-Baum nicht vorhanden – Push-Auslieferung muss extern erfolgen und die `devices`-Tabelle muss provisioniert sein. |

**M) Admin-Konsole**
| Feld | Inhalt |
|---|---|
| Status | TEILWEISE |
| Kern-Features umgesetzt | - Next.js 14 Dashboard mit Reports/Blocks/Messages Views<br>- ReportTable mit Ban/Unban-Buttons gegen Supabase RPCs<br>- Blocks-Übersicht + MatchViewer mit Nachrichtentranskript<br>- API-Routen für admin_search_users, admin_ban/unban |
| Wichtigste Code-Evidenz | `meetmate-admin/app/page.tsx:4`: Dashboard lädt `reports_view`<br>`meetmate-admin/components/ReportTable.tsx:13`: Moderationsaktionen + ban/unban Fetch<br>`meetmate-admin/app/blocks/page.tsx:4`: Blocks View<br>`meetmate-admin/app/api/admin/ban/route.ts:4`: RPC-gestützte Ban/Unban-API<br>`meetmate-admin/lib/supabase-server.ts:5`: Server-Client nutzt service_role-Key |
| Relevante Dependencies | `next@14.2.4`, `@supabase/auth-helpers-nextjs@^0.10.8`, `@supabase/supabase-js@^2.46.0` |
| Laufzeit-Hinweise | Admin-Routen erwarten RPCs `admin_search_users`/`admin_ban_user` (`meetmate-admin/app/api/admin/ban/route.ts:11`); diese Funktionen müssen in Supabase deployt sein und setzen service_role-Zugriff voraus. |

**N) Analytics/Events**
| Feld | Inhalt |
|---|---|
| Status | NICHT VORHANDEN |
| Kern-Features umgesetzt | - n/a |
| Wichtigste Code-Evidenz | n/a |
| Relevante Dependencies | n/a |
| Laufzeit-Hinweise | Keine Analytics-, Event- oder Telemetrie-Libraries im `src/`-MVP ersichtlich; Auswertung müsste komplett neu ergänzt werden. |

**O) CI/CD, Tests (Unit/E2E/Mobile), Sentry**
| Feld | Inhalt |
|---|---|
| Status | TEILWEISE |
| Kern-Features umgesetzt | - Jest-Unit-Tests für Match-Engine, RateLimiter & GuardedPhoto<br>- CI-Pipeline mit Lint, Unit, Server-E2E, Semgrep & npm audit<br>- Verification-Testplan-Dokument sichert QA-Prozesse<br>- ErrorBoundary fängt RN-Crashes lokal ab |
| Wichtigste Code-Evidenz | `__tests__/matchEngine.test.ts:20`: Reciprocity & Score Tests<br>`__tests__/guardedPhoto.test.ts:3`: TTL-Refresh-Abdeckung<br>`__tests__/rateLimiter.test.ts:3`: Throttling-Test<br>`.github/workflows/ci.yml:9`: Multi-Job CI inkl. SAST/Audit<br>`docs/verification-test-plan.md:7`: QA-Matrix für Verifikation<br>`src/components/ErrorBoundary.tsx:15`: Lokaler Fallback (ohne Sentry) |
| Relevante Dependencies | `jest@^29.7.0` (server/package.json:5-55), `eslint@^9.25.0`, `semgrep` (CI) |
| Laufzeit-Hinweise | Keine Sentry-/Crashlytics-Integration im Expo-Code – ErrorBoundary loggt nur via `console.warn` (`src/components/ErrorBoundary.tsx:20`), wodurch produktionsreife Observability fehlt. |

**P) Security/RLS/Policies, .env/Secrets, DSGVO-Hooks**
| Feld | Inhalt |
|---|---|
| Status | TEILWEISE |
| Kern-Features umgesetzt | - Umfangreiche RLS für Likes/Matches/Messages/Passes<br>- Photo-Assets/Permissions mitsamt Storage-Policies & Buckets<br>- Edge Function `geo` für Länderableitung & Geo-Governance<br>- Data-Retention- & Privacy-Dokumentation (EU-Only, TTLs)<br>- NestJS greift ausschließlich via service_role auf Supabase zu |
| Wichtigste Code-Evidenz | `supabase/migrations/20241105_interactions_chat.sql:84`: RLS-Policies für Interaktionen<br>`supabase/migrations/20241109_incognito_photo_privacy.sql:12`: Photo-Assets + Storage Policies + Discovery-View<br>`supabase/functions/geo/index.ts:1`: Edge Function für Länderauflösung<br>`docs/data-retention.md:5`: Lösch-/Retention-Vorgaben & EU-Regionen<br>`server/src/common/supabase-admin.ts:10`: service_role wird nur serverseitig geladen<br>`.env.local:2`: SUPABASE_URL + SERVICE_ROLE_KEY liegen als Klartext vor |
| Relevante Dependencies | `@supabase/supabase-js@^2.45.4`, `@nestjs/config@^3.2.2`, `ioredis@^5.4.1` |
| Laufzeit-Hinweise | `.env.local:2-3` enthält den `SUPABASE_SERVICE_ROLE_KEY` im Repo – Secret-Handling muss gehärtet werden; zudem fordert `docs/data-retention.md:19` EU-Only-Infrastruktur und kurze TTLs, die operativ überwacht werden müssen. |

3) **Versionen & Umgebung**
   - **Pakete:** `expo` `~54.0.23`, `react-native` `0.81.5`, `expo-notifications` `~0.32.12`, `expo-device` `~8.0.9`, `expo-secure-store` `~15.0.7` (alle `package.json:13-35`); `@supabase/supabase-js` fehlt im Wurzel-`package.json` trotz Nutzung in `src/lib/supabaseClient.ts:1-52`.
   - **app.json:** Bundle-Identifier `com.tschedating.app` (iOS) & Package `com.tschedating.app` (Android) mit Plugins `expo-notifications`, `expo-secure-store`, `expo-image-picker` (`app.json:3-45`).
   - **ENV-Keys:**
     - `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` – vorhanden in `.env:1-2`, werden in `src/lib/supabaseClient.ts:10-16` eingelesen.
     - `EXPO_PUBLIC_IOS_BUNDLE_ID` / `EXPO_PUBLIC_ANDROID_PACKAGE` – gesetzt in `.env:3-4`, aktuell abweichend zu `app.json`-IDs.
     - `EXPO_PUBLIC_API_URL` – notwendig laut `src/services/photoService.ts:5-15`, aber weder in `.env` noch `app.json` definiert.
     - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` – hinterlegt in `.env.local:2-3` und durch `server/src/common/supabase-admin.ts:10-15` konsumiert (Achtung Secret im Repo).
