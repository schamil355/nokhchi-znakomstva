# Data Retention & Security Controls

This project processes biometric signals purely for the purpose of in-app verification. The following guardrails are enforced end-to-end:

## Raw Media
- Selfie uploads are written to a temporary `temp/verification/` prefix in S3 with bucket-level lifecycle rules deleting every object within 60 minutes.
- Objects are encrypted at rest via KMS (or AES256 fallback) and deleted immediately after each verification attempt – successful **and** failed.
- No raw assets are persisted in the database; audit trails only retain salted SHA-256 digests.

## Embeddings & Scores
- Face embeddings are never stored. Only the similarity score and liveness metrics returned by the ML service are persisted alongside timestamps.
- Digests are derived with a project-specific salt (`SELFIE_HASH_SALT`) so they cannot be reversed or correlated across projects.

## Session & Log Retention
- Verification sessions remain queryable for at most **30 days** (`VERIFICATION_SESSION_TTL`).
- OTP records are evicted from Redis as soon as they expire (≤ 5 minutes).
- Audit logs are retained for **90 days** to support abuse investigations, then pruned by scheduled maintenance.

## Regional & Transport Guarantees
- All infrastructure (Supabase/Postgres, Redis, S3, ML service) is configured for EU regions (default `eu-central-1`).
- Mutual TLS is required for service-to-service traffic; external endpoints are only exposed via HTTPS.

## Abuse & Risk Controls
- Rate limits bound selfie uploads (5 / 5 minutes per user+IP) and OTP sends (5 / 10 minutes).
- Failed biometric attempts flag the requester (`risk:selfie:<ip>`) for 30 minutes, enabling secondary review or additional checks.
- Optional device fingerprints can be supplied by the client to strengthen duplicate detection without introducing persistent identifiers.

## Data Subjects Rights
- The mobile app links to the Privacy Centre where users can export or delete their data at any time.
- Support can force re-verification; overrides are logged with administrator identifiers.

Keep this document up-to-date whenever retention windows or storage patterns change.
