# Billing & Entitlement Flow

## Sequenz: Web-PSP → Backend → App

```
User/Browser        Web-PSP         Supabase Edge (psp-webhook)     Postgres (entitlements)      App (meetmate)
     |                  |                      |                           |                        |
     | 1. Checkout ---> |                      |                           |                        |
     |                  | 2. Event Webhook --->|                           |                        |
     |                  |                      | 3. upsert entitlements -->|                        |
     |                  |                      | 4. insert events -------->|                        |
     |                  |                      |<----- 200 OK -------------|                        |
     |                  |<----- Response ------|                           |                        |
     |                  |                      |                           |                        |
     |                  |                      |                           | 5. refreshSession ---->|
     |                  |                      |                           |                        | 6. syncPurchases (RC, mobile only)
     |                  |                      |                           |<-- 7. get_user_entitlements (RPC)
     |                  |                      |                           |                        | 8. merge + unlock gates
```

*Hinweis:* In iOS-Builds dürfen keine externen Kauf-Links oder Texte angezeigt werden. Regionen mit `paywall_mode = 'none'` blenden die Paywall vollständig aus.

## Review Note (App Store Connect)

```
Extern erworbene Abonnements werden über Login im Nutzerkonto freigeschaltet. In-App-Käufe werden regulär über StoreKit/RevenueCat in allen unterstützten Märkten bereitgestellt. Die russische Storefront blendet die Paywall vollständig aus und zeigt keine Hinweise auf externe Käufe.
```

## Release-Checkliste

- [ ] Sandbox-Flow für RevenueCat + Web-PSP durchspielen (Kauf, Restore, Entitlement-Merge)
- [ ] Ablaufzeiten und Zeitzonen (UTC vs. Lokalzeit) testen, insbesondere Übergang ablaufender Tokens
- [ ] Idempotenz der Webhooks verifizieren (mehrfaches Event → kein doppeltes Entitlement)
