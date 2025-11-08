# meetmate-admin

Minimal Next.js (App Router) console for meetmate moderators. Provides Supabase-backed authentication, reports/blocks dashboards, user search, read-only match viewer, and ban/unban actions.

## Prerequisites

- Node.js 18+
- Supabase project with the following prepared:
  - `reports_view`, `blocks_view`, `matches_view`, `messages_view`
  - RPCs: `admin_search_users(search_term text)`, `admin_ban_user(target_user uuid, ban_reason text)`, `admin_unban_user(target_user uuid)`
  - Auth users marked with `app_metadata.role = 'admin'`

## Environment variables

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=... # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=... # anon public key
SUPABASE_SERVICE_ROLE_KEY=... # service role key (server-side only)
```

## Scripts

```bash
npm install
npm run dev       # start local dev server
npm run lint      # lint with ESLint
npm run build     # production build
```

## Routing

- `/login` – email/password sign-in for admins.
- `/` – dashboard (latest reports).
- `/reports` – full report list with ban/unban shortcuts.
- `/blocks` – recent block entries.
- `/users` – search users by email or display name.
- `/matches/[matchId]` – read-only transcript for a match.

## Supabase notes

- Service-role RLS bypass is limited to required RPC calls. Ensure policies restrict other data to admins only.
- `admin_search_users` should return minimal fields (`id`, `email`, `display_name`, `created_at`).
- The ban/unban RPCs are expected to update the relevant bans table and enforce restrictions via existing RLS policies.

## Styling

Styling relies on lightweight utility classes; feel free to integrate Tailwind or another design system as needed.
