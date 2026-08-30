# Verification Model

## Status vocabulary

- **Passed:** this browser performed the named operation and it succeeded.
- **Failed:** this browser performed the named operation and it failed.
- **Unavailable:** required public material or browser capability is absent.
- **Not performed:** the operation is supported but has not been requested.
- **Recorded assertion:** the record contains the value; its truth or legal effect was not determined.

## Locally supported checks

1. Schema/version support and required-field validation.
2. Equality of the supplied 64-character identifier and the recorded `manifestHash`.
3. ES256 compact-JWS verification with the public P-256 JWK, including header, key ID, and 32-byte hash payload checks.
4. Local file SHA-256 equality with the record's file digest.
5. Location and classification of Arweave anchor chronology supplied by validated public data.

## Deliberately unavailable

Recomputing the manifest hash from the full JSON. The record labels RFC 8785 canonicalization, but the public sources inspected on 2026-08-30 do not define the exact treatment of self-referential and post-anchor fields. A server's `hashMatches` flag is not substituted for a local operation.

## Legal boundary

Identity assurance, author name, creation date, originality oath, ownership/rights confirmation, license, and AI-use policies are recorded assertions. A passing result verifies evidence integrity only; it is not a determination of authorship, ownership, copyright validity, registration, identity, or truth.
