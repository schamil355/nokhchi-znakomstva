# Supabase Edge Functions

## Deployment

```
supabase functions deploy notify
supabase functions deploy privacy
supabase functions deploy psp-webhook
supabase functions deploy abuse-check
supabase functions deploy geo
```

Ensure the following secrets are configured:

```
supabase secrets set --env-file supabase/functions/.env.example
```

## PSP Webhook

### Stripe test payload

```
curl -X POST \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=123,v1=<computed>" \
  -d '{
    "id": "evt_test",
    "data": {
      "object": {
        "id": "sub_123",
        "status": "active",
        "current_period_start": 1700000000,
        "current_period_end": 1702688400,
        "metadata": { "user_id": "00000000-0000-0000-0000-000000000001" },
        "items": { "data": [ { "price": { "product": "prod_premium" } } ] }
      }
    }
  }' \
  http://localhost:54321/functions/v1/psp/webhook/stripe
```

### YooKassa test payload

```
curl -X POST \
  -H "Content-Type: application/json" \
  -H "content-digest: sha-256=<computed>" \
  -d '{
    "object": {
      "id": "yk_tx_123",
      "status": "succeeded",
      "metadata": { "user_id": "00000000-0000-0000-0000-000000000001", "product_id": "prod_premium" },
      "start_date": "2024-01-01T00:00:00Z",
      "end_date": "2024-02-01T00:00:00Z"
    }
  }' \
  http://localhost:54321/functions/v1/psp/webhook/yookassa
```
