# Public / Private Boundary

This repository is a new, read-only verifier. It is not the Copyright by UCE production application.

## Allowed

New UI and verification code; public response schemas reduced to required fields; public URLs, hashes, transaction IDs, and public keys; synthetic fixtures; client-side hashing; documented public verification procedures; tests and build documentation.

## Prohibited

Production source/history, record-creation or signing logic, private keys, private APIs or schemas, operational configuration, accounts, payments, uploads, administration, fraud/review/mark-governance/rate-limit logic, proprietary packages or assets, private records, and any dependency on an adjacent repository.

## Enforcement

- Runtime hosts are allowlisted to `cbyuce.com` and `arweave.net`.
- The app has no backend, authentication, storage, analytics, or production package.
- Unknown input fields are discarded by a newly written validator.
- Undocumented cryptographic construction is labeled unavailable rather than reconstructed.
- Publication requires a final file, dependency, secret, and provenance review.
