# Incognito & Photo Privacy

## Environment

Add the following to your web/.env and Expo app config:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...          # server only
CORS_ORIGIN=https://app.meetmate.com   # '*' for local dev
SIGN_TTL_SECONDS=120
PHOTO_SIGN_RATE_LIMIT=30
EXPO_PUBLIC_API_URL=https://app.meetmate.com
```

## Migration

1. `supabase db push` – runs `20241107_incognito_photo_privacy.sql`
2. Buckets `photos_private` (private) and `photos_blurred` (public) are idempotently created.
3. View + RPC:
   - `public.discovery_profiles`
   - `public.get_discovery_profiles(limit, offset)`

### Manual SQL checks

```sql
-- Incognito profiles appear in discovery (client should blur/lock)
select * from public.discovery_profiles where auth.uid() = '<viewer>';

-- Grant whitelist access for a photo
insert into public.photo_permissions(photo_id, viewer_id)
values (123, '<viewer>') on conflict do nothing;
```

## Web (Next.js)

- `app/api/settings/privacy` accepts GET/POST (cookies or `Authorization: Bearer <supabase_token>`).
- `app/api/photos/register` registers uploads from `photos_private`, generates blurred variants via `sharp`, inserts into `photo_assets`.
- `app/api/photos/sign` enforces visibility matrix + rate-limits and logs all requests.
- `app/settings/privacy/page.tsx` exposes Incognito toggles.
- `components/GuardedPhoto.tsx` fetches signed URLs (original/blur).

## Mobile (Expo)

- `App.tsx` now polyfills `crypto` + `URL`.
- `app/screens/PrivacySettingsScreen.tsx` hits the privacy endpoint via Supabase access tokens.
- `app/screens/UploadPhotoScreen.tsx` uploads to `photos_private` and registers the asset.
- `app/components/GuardedPhoto.tsx` mirrors the web behaviour for RN `<Image>`.

## Testing

- Vitest: `tests/unit/privacyVisibility.test.ts` validates the visibility matrix.
- Playwright: `tests/e2e/privacy-settings.spec.ts` ensures the privacy page renders gracefully without a session.

## Security Notes

- Originals never leave `photos_private` without a short-lived signed URL (120s by default).
- Blurred assets are heavily downscaled (`200px`, blur radius `50`) before landing in `photos_blurred`.
- Sign endpoint ships with a simple in-memory, per-user+photo rate limiter (30 req/min) and server logs.
- Incognito discovery ensures:
  - `is_incognito=false` => normal
  - `is_incognito=true` => profile is returned in discovery, client must blur/lock it
  - Photo access is still enforced by `/photos/view` (match_only/whitelist/blurred_until_match).
  - Additional toggles (`show_distance`, `show_last_seen`) are persisted for UI gating.

## Face-Verify / Buckets / Functions

### Client (.env)
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Functions (Edge Secrets)
Set via `supabase secrets set`:
- `SUPABASE_SERVICE_ROLE_KEY`
- `PROFILE_BUCKET=profile-photos`
- `VERIFS_BUCKET=verifications`
- `AZURE_FACE_ENDPOINT`
- `AZURE_FACE_KEY`

### Buckets
- `profile-photos` (private) – Profilbilder / `primary_photo_path`
- `verifications` (private) – Selfies für Face-Verify

CLI (idempotent), falls Buckets fehlen:
```
supabase storage create-bucket profile-photos --public false
supabase storage create-bucket verifications --public false
```

### Functions lokal/remote
- Lokal testen:
  ```
  supabase functions serve face-verify --env-file supabase/.env.local
  ```
- Remote deploy:
  ```
  supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... PROFILE_BUCKET=profile-photos VERIFS_BUCKET=verifications AZURE_FACE_ENDPOINT=... AZURE_FACE_KEY=... --project-ref <project-ref>
  supabase functions deploy face-verify --project-ref <project-ref>
  ```

### Flow (Client)
1. Nach Upload der 3 Fotos: Primärpfad auf `profiles.primary_photo_path` setzen, dann `navigation.navigate("OnboardingVerify", { primaryPhotoPath })`.
2. Selfie-Scan ruft `face-verify` mit `profilePath/selfiePath` auf.
3. Bei Erfolg `markProfileVerified` setzen und per `navigation.reset` in die Main-Tabs springen (kein App-Neustart nötig).
