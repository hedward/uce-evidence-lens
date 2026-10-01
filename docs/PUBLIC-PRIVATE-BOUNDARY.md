# Public / Private Boundary

This repository is a new, read-only verifier. It is not the Copyright by UCE production application.

## Allowed

New UI and verification code; public response schemas reduced to required fields; public URLs, hashes, transaction IDs, and public keys; synthetic fixtures; client-side hashing; documented public verification procedures; tests and build documentation.

## Prohibited

Production source/history, record-creation or signing logic, private keys, private APIs or schemas, operational configuration, accounts, payments, uploads, administration, fraud/review/mark-governance/rate-limit logic, proprietary packages or assets, private records, and any dependency on an adjacent repository.

## Enforcement

- Runtime retrieval is allowlisted to `cbyuce.com`, `arweave.net`, and the fixed `https://turbo-gateway.com/graphql` endpoint. The Turbo query receives only a public item identifier and is used to discover bundled-item parent transactions; it never receives original file bytes.
- The app has no backend, authentication, storage, analytics, or production package.
- Unknown input fields are discarded by a newly written validator.
- Undocumented cryptographic construction is labeled unsupported rather than reconstructed.
- Publication requires a final file, dependency, secret, and provenance review.

Chronology status and block metadata may also use fixed Turbo Gateway paths when
Arweave returns HTTP 429 or 5xx. Each request has at most one fallback, retains
the same size/deadline limits, and records the actual source. This does not fetch
original work or change the gateway-reported scope of bundle relationships.
