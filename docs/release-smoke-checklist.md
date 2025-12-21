# Release Smoke Checklist

Kurzer Durchlauf vor Review/Release, um die wichtigsten Pfade zu verifizieren.

## Backend/Infra
- [ ] `curl https://nokhchi-znakomstva.onrender.com/health` gibt 200.
- [ ] Render-Env: `DATABASE_URL` auf Pooler mit `sslmode=require`, Service-Role/AWS/Push/Sentry gesetzt.
- [ ] Supabase: Auth/Storage erreichbar, Mail-Redirect-URLs whitelisted.

## Mobile App (gerne auf echtem Gerät)
- [ ] Login/Signup mit verifizierter E-Mail; Resend-Mail öffnet `meetmate://auth/callback`.
- [ ] Onboarding: Gender/Name/Geburtstag/Location (Berechtigung erteilt), Fotos hochladen.
- [ ] Discovery: Swipe/Like/Match funktioniert, kein Absturz.
- [ ] Chat: Nachricht senden/empfangen in einem Match.
- [ ] Profil: Privacy-Toggles (Incognito/Distance/Last Seen) speichern, Foto-Visibility ändern, Foto löschen, Account löschen.
- [ ] Selfie-Verifizierung: Happy Path durchlaufen, `verified`/`verified_face_score` gesetzt.
- [ ] Push: Token wird registriert (devices-Tabelle), Test-Push kommt an (iOS/Android).
- [ ] Premium/RevenueCat: Paywall öffnet, Sandbox-Kauf/Restore setzt `is_premium`.

## Admin (falls genutzt)
- [ ] Admin-Login, Reports/Blocks laden, Ban/Unban-Aktionen funktionieren.

## Telemetrie/Crash
- [ ] Sentry-DSN aktiv? Test-Exception in Debug-Build erzeugt und in Sentry sichtbar (optional).

## App-Store Privacy & Rechtliches
- [ ] App-Privacy-Antworten decken Location (coarse+precise), Kamera/Fotos, biometrische Verifizierung, ipapi/Supabase/Sentry/RevenueCat ab.
- [ ] Rechtstexte/Impressum nennen korrekten App-Namen “Нохчи Знакомства”.
