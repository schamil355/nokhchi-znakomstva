# Нохчи Знакомства Web (PWA)

This repo ships a React Native + Expo app with web support. The PWA uses the shared codebase and runs as a standalone installable web app.

## Stack
- Expo SDK 54 + React Native Web
- Supabase (Auth/DB/Storage/Realtime)
- NestJS server (`/server`) for photo signing, verification APIs, web-push endpoints

## Setup
1) Install deps in the repo root:
```bash
npm install
```

2) Create `.env` from `.env.example` and set at least:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_URL` (NestJS server base URL)
- `EXPO_PUBLIC_WEB_PUSH_VAPID_KEY` (optional, for web push)

3) Server env (create a `.env` in `server/` or export env vars):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `ENABLE_PUSH=true` (required for web push endpoints)
- `WEB_BASE_URL=https://nokhchi-znakomstva.com`
- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT` (e.g. `mailto:support@yourdomain`)
- `ENABLE_REDIS=true` (optional, enables rate limiting)
- `REDIS_URL=redis://localhost:6379`
- `CORS_ORIGINS=http://localhost:8081,http://localhost:4173,https://nokhchi-znakomstva.com`
- Stripe (web checkout):
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_ID_EUR_MONTHLY`, `STRIPE_PRICE_ID_EUR_YEARLY`
  - `STRIPE_PRICE_ID_NOK_MONTHLY`, `STRIPE_PRICE_ID_NOK_YEARLY`

If you do not want Redis locally, set `ENABLE_REDIS=false` to avoid warnings.

4) Run migrations (Supabase CLI):
```bash
supabase db push
```

## Local dev
- Web app (PWA):
```bash
npm run web
```
- Server (photo/signing + web push):
```bash
cd server
npm install
npm run start:dev
```
- Redis (optional, for rate limiting):
```bash
docker run -d --name meetmate-redis -p 6379:6379 redis:7-alpine
```

## Build & start
- Static export (includes PWA files):
```bash
npm run web:export
```
The build output goes to `dist/`.

To preview the PWA locally:
```bash
npx serve dist
```

## Deployment
Deploy the static `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages, S3, etc). Ensure HTTPS to enable service workers and web push.

### Render + Spaceship (recommended)
1) Create a Render **Static Site** and connect this repo.
2) Build Command: `npm run web:export`
3) Publish Directory: `dist`
4) Environment variables (build time):
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_API_URL=https://nokhchi-znakomstva.onrender.com`
   - `EXPO_PUBLIC_WEB_PUSH_VAPID_KEY` (optional)
5) Add the custom domain in Render: `nokhchi-znakomstva.com` (and optional `www.nokhchi-znakomstva.com`).
6) In Spaceship DNS, create the exact records Render provides and remove conflicting records.

### Stripe webhooks (backend)
- Create a Stripe webhook pointing to the Nest server:
  - `https://<your-api-host>/v1/payments/stripe/webhook`
- Recommended events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

## PWA install test
- The Expo dev server does not serve the PWA manifest/service worker. Use the static export + `npx serve dist` for install testing.
- Desktop Chrome/Edge: open the site, use the install icon in the URL bar.
- iOS Safari: Share → “Add to Home Screen”.

## Web push test
1) Set VAPID keys (see setup) and keep `ENABLE_PUSH=true` for the server.
2) Open the web app, go to Settings → Web notifications, and enable.
3) Tap “Send test push” to verify delivery.

## Notes & assumptions
- Web push subscriptions are stored in `public.web_push_subscriptions` (new migration added).
- `EXPO_PUBLIC_API_URL` must point to the running NestJS server for photo signing and verification endpoints.
