# Verification QA Playbook

This document captures the end-to-end test matrix, operational metrics, and CI coverage required for the biometric verification flow.

---

## 1. Critical Test Cases

| ID | Scenario | Preconditions | Steps | Assertions |
|----|----------|---------------|-------|------------|
| VT-001 | Positive happy-path | • User has verified profile photo.<br>• Verification session started.<br>• ML service returns `matched=true`, liveness ≥ thresholds.<br>• OTP service functional. | 1. Upload live selfie captured in-app.<br>2. Receive OTP via configured channel.<br>3. Submit OTP. | • API responds `similarity > threshold`, `next='otp'`.<br>• `verification_sessions.status` transitions `pending → selfie_ok → completed`.<br>• Profile row gains `verified_at` timestamp and `verified_badge`.<br>• `StorageService.deleteObject` called for temp selfie key.<br>• Audit log entries: `verification_started`, `selfie_verified`, `otp_sent`, `verified`.<br>• Client renders blue “Verified” badge. |
| VT-002 | Selfie mismatch | • Different person selfie provided. | 1. Upload mismatching selfie. | • ML returns `matched=false` → API throws `SELFIE_NOT_MATCHED`.<br>• Session set to `failed` with `failure_reason='face_mismatch'`.<br>• Temp selfie deleted.<br>• Audit log `selfie_failed` captures similarity & liveness info.<br>• Client displays localized retry hint; capture button remains enabled. |
| VT-003 | Liveness failure | • User keeps face static or outside frame; ML returns liveness < threshold though similarity may pass. | 1. Upload selfie without blink/head turn. | • Service returns `LIVENESS_FAILED`.<br>• Session `status='failed'`, `failure_reason='liveness_failed'`.<br>• Audit log records low liveness values.<br>• Client shows guidance (“Blink/Head-Turn”) before allowing retake. |
| VT-004 | OTP brute force | • Valid selfie already accepted (`status='selfie_ok'`). | 1. Submit 3 incorrect OTP codes.<br>2. Attempt 4th submit within 15 minutes. | • Each failure logs `otp_failed` with attempt count.<br>• After 3rd attempt `RateLimitService.isRateLimited` triggers → API returns `OTP_RATE_LIMIT`.<br>• Audit log entry `otp_cooldown` with IP / session metadata.<br>• User blocked for 15 minutes (cooldown toast). |
| VT-005 | Session expiry | • Session started but no further action. | 1. Advance clock past `verification.sessionTTLMinutes`.<br>2. Run `expireSessions` cron. | • Session transitions to `failed` with reason `expired`.<br>• Audit log per session (`verification_session_expired`).<br>• Client polling receives `status='failed'` and must restart flow. |
| VT-006 | Profile photo change → re-verify | • User previously verified.<br>• User updates profile photo. | 1. Save profile with new photo.<br>2. Attempt to access messaging. | • Backend/webhook clears `verified_at` & `verified_badge` on profile update.<br>• Feature flag `verification_required_on_signup` (or dedicated reverify flag) forces navigation back to Consent screen.<br>• Audit log `verification_reset` recorded. |
| VT-007 | Pen-test: temp URL access | • Selfie upload performed. | 1. Capture presigned URL if exposed.<br>2. Attempt GET after deletion / after lifecycle expiry. | • Presigned URLs are write-only and expire ≤5 minutes.<br>• After server deletion/lifecycle, GET returns 404.<br>• Access logs show no PII (hash only). |
| VT-008 | Pen-test: logging hygiene | • Run through flows with dummy PII. | Inspect logs, audit entries, metrics pipeline. | • No raw face bytes, emails, phone numbers, or full OTP codes logged.<br>• Audit meta limited to hashed selfie fingerprint, similarity/liveness decimals, IP, device info. |

> **Note:** Automated coverage lives in `server/test/verification.service.spec.ts` for core flows. E2E suites should mirror VT-001 → VT-005 using mocked ML/OTP/S3 services; VT-006 requires integration with the profile subsystem.

---

## 2. Observability & Metrics

| Metric | Description | Source | Action |
|--------|-------------|--------|--------|
| Verification Success Rate | (# completed sessions) / (# started sessions) | Audit log or `verification_sessions` | Alert if < 90%. |
| False Reject Rate | (# selfie/liveness failures where user retried and later succeeded) / (# completed sessions) | Join `selfie_failed` logs with subsequent `selfie_verified` for same user | Tune similarity or liveness thresholds when > 5%. |
| Avg Verification Duration | Mean time between `verification_started` and `verified` audit entries | Audit log | UX improvement KPI. |
| Re-verification Share | (# `verification_reset` events) / (# active users) | Profile service logs | Indicates profile churn. |
| Threshold Flag Experiments | Feature flag (e.g. `verification_similarity_threshold`) storing active threshold (0.58–0.65). | Config service / LaunchDarkly | Monitor success & false reject rate per threshold bucket. |

Instrument these via analytics or metrics pipeline (e.g. Supabase Functions → BigQuery) and chart in dashboards.

---

## 3. Penetration Checklist

- Ensure S3 lifecycle rule `temp/verification/*` → expire ≤ 1 hour and block public ACLs.
- Confirm all services run in EU regions (`eu-central-1`, `eu-west-1`).
- Verify HTTPS only; no mixed content.
- Run automated log scrubs to assert absence of raw Base64 strings / OTP values.
- Validate rate-limit risk stores: `risk:selfie:<ip>` and `risk:otp:<ip>` are TTL-bound and cleared after success.

---

## 4. CI Coverage

See `.github/workflows/ci.yml` for automated lint, unit, e2e, SAST (Semgrep), and dependency audits across mobile + server projects.

---
