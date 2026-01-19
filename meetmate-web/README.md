# meetmate-web Checkout

This Next.js workspace adds a simple web checkout that feeds into the Supabase entitlement pipeline.

## Pages

- `/[lang]/checkout` – region‑aware pricing (EUR/NOK/RUB) with Stripe/YooKassa hint. RU users can complete checkout, but native iOS UI remains link-free.
- `/[lang]/checkout/success` – confirmation page.
- `/[lang]/pricing`, `/[lang]/legal`, `/[lang]` – marketing pages (see middleware for language detection).

## Middleware

`middleware.ts` inspects `Accept-Language` and IP country headers, sets `mm_lang` and `mm_country` cookies, and rewrites to the language-prefixed routes.

## API

`POST /api/psp/complete` forwards purchases to the Supabase Edge Function `psp-webhook` (see project 12C). It expects:

```json
{
  "productId": "monthly",
  "currency": "EUR",
  "amountMinor": 999,
  "source": "web"
}
```

## Environment variables

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=<https://your-project.supabase.co>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
# Optional override if the edge function lives on a different path:
# SUPABASE_PSP_WEBHOOK_PATH=/functions/v1/psp/webhook
```

## Scripts

```bash
npm install
npm run dev
```

The checkout page formats currency via `lib/currency.ts` and reuses the region cookie set by the middleware.
