# Product Requirements

## Principles

1. Verified facts and recorded assertions are visually and structurally distinct.
2. Every passed cryptographic status identifies the operation actually performed.
3. Unavailable inputs produce an unavailable status, never an inferred success.
4. Local file bytes stay in the browser and are not exposed to WebMCP handlers.

## Epic 1 — Load and understand a record

- The demo record loads without network access.
- A user can submit a supported public URL/hash or paste JSON.
- Unsupported hosts, HTTP URLs, malformed JSON, unknown schemas, and oversized input fail safely with recovery guidance.
- The summary shows schema, title, file metadata, recorded hash, anchor, and sources.

## Epic 2 — Inspect evidence honestly

- Checks use `passed`, `failed`, `unavailable`, or `not_performed`.
- Identity, author, creation date, rights, and AI-policy fields use `recorded_assertion`.
- The app can compare the loaded record identifier with the manifest's recorded hash.
- The app can validate a compact ES256 signature with a matching public JWK.
- Canonical-manifest hashing remains unavailable until a public, reproducible construction procedure is documented.

## Epic 3 — Chronology and rights

- Claimed dates, system audit dates, and an independently located Arweave block timestamp are separate.
- Every chronology item names its source and evidentiary category.
- Rights declarations are quoted as record content and accompanied by a no-legal-conclusion warning.

## Epic 4 — Local comparison

- The user explicitly selects a file.
- SHA-256 runs locally with Web Crypto.
- Only the filename, size, digest, and comparison result enter application state.
- WebMCP can request comparison of the already-selected digest but cannot access file bytes or trigger a file picker.

## Epic 5 — Human/agent parity

- The visible UI exposes every core inspection.
- Seven imperative WebMCP tools register once at the top-level page after feature detection.
- Tool schemas reject unexpected properties and all tools have `readOnlyHint: true`.
- When unavailable, the UI explains that manual verification still works.

## Quality requirements

- Keyboard-accessible semantic controls, visible focus, live status announcements, responsive layout, no `innerHTML` for record data.
- Unit tests cover valid, tampered, malformed, missing-key, signature, digest, network/CORS, malicious-string, unavailable-WebMCP, repeated-registration, and schema-validation cases.
- Production build, typecheck, tests, lint, formatting, dependency-license review, secret scan, and IP-boundary review pass before publication review.
