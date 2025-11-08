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
-- Incognito profile visible after like
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
- Incognito view ensures:
  - `is_incognito=false` ⇒ normal
  - `is_incognito=true` ⇒ profile is hidden unless **(a)** you liked the viewer, or **(b)** you already matched.
  - Additional toggles (`show_distance`, `show_last_seen`) are persisted for UI gating.
