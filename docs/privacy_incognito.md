# Privacy & Incognito Overview

The mobile MVP now enforces two complementary privacy layers:

1. **Incognito discovery** - `profiles.is_incognito` no longer hides a user from the feed. Discovery RPCs return incognito profiles and the client must render them blurred/locked using the `is_incognito` flag. Server-side filtering still removes blocked profiles, while photo access remains enforced by the `/photos/view` visibility checks.
2. **Photo privacy** – Profile photos live in private Supabase Storage buckets. Originals stay in `photos_private`, blurred derivatives in `photos_blurred`. Photos can only be accessed through signed URLs created by the NestJS `/photos/view` endpoint after the viewer passes the visibility checks (public/match_only/whitelist/blurred_until_match). Signed URLs expire after `SIGN_TTL_SECONDS` (default 120 s); the client must refresh when they expire.

## Registering photos

`POST /v1/photos/register` expects a storage path (e.g. `user-id/123.jpg`) that already exists in the private bucket. The service:

1. downloads the original via the Supabase **service_role** key (never expose to clients),
2. generates a heavily blurred 256 px derivative with `sharp`,
3. uploads the derivative to `photos_blurred`,
4. stores a `photo_assets` row (visibility mode, paths, owner),
5. rate-limits registrations to **30/min per user**.

## Viewing photos

`POST /v1/photos/view` enforces:

- block checks (either party blocked → 403),
- owner override (owners always receive originals),
- visibility rules (match_only, whitelist, blurred_until_match),
- whitelist TTL (permissions expire when `expires_at` is reached),
- rate limit **60/min per viewer+photo**.

The endpoint returns `{ url, modeReturned }` and signs either the original or blurred object for at most `SIGN_TTL_SECONDS`.

## Granting permissions

`POST /v1/photos/grant` lets owners grant whitelisted access to a specific viewer, optionally with `expiresInSeconds`. The grant simply upserts `photo_permissions`.

## Privacy settings

`POST /v1/settings/privacy` updates `profiles.is_incognito`, `show_distance`, and `show_last_seen` for the authenticated user. The write uses the Supabase admin client and never exposes the service-role key to the mobile app.

## Löschen & Widerrufen

- `DELETE /v1/photos/:photoId` entfernt das Foto aus `photo_assets`, löscht alle Whitelist-Einträge und bereinigt beide Buckets (`photos_private`, `photos_blurred`). Das API antwortet mit `{ deleted: true, photoId }`.
- `DELETE /v1/photos/permissions` widerruft die Freigabe für genau einen Viewer (`{ photoId, viewerId }`), während `DELETE /v1/photos/permissions/all` sämtliche Whitelist-Einträge löscht.
- `POST /v1/photos/bulk-delete/self` entfernt sämtliche Fotos des eingeloggten Nutzers – nützlich für Konto-Löschflows.

Alle Mutationen laufen ausschließlich über den NestJS-Server (service_role im Backend, nie im Client). Wenn ein Foto gelöscht wurde, liefert `/photos/view` anschließend einen 404/403 und der Mobile-Client lädt automatisch einen neuen GuardedPhoto-Status.

## Security notes

- The Supabase **service_role** key is only loaded inside `server/src/common/supabase-admin.ts`. Never ship it in client bundles.
- All direct Storage access happens on the server; mobile clients only receive short-lived signed URLs.
- Buckets remain private. If you need to rotate keys, update `SUPABASE_SERVICE_ROLE_KEY` and restart the NestJS service.
