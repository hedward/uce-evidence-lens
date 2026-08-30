# Technical Specification

## Architecture

Static Vite/TypeScript SPA. Pure modules parse and verify data; a small stateful controller coordinates the DOM; the WebMCP adapter calls the same controller functions. There is no backend or persistent storage.

## Public sources

- CbyUCE verification pages: `https://cbyuce.com/verify/<sha256>`
- CbyUCE JSON representation: the same URL with `?format=json` (observed without cross-origin permission on 2026-08-30)
- Arweave manifest and JWKS transactions: `https://arweave.net/<txId>` (observed with `Access-Control-Allow-Origin: *`)
- WebMCP syntax: `document.modelContext.registerTool({...})` from official OpenAI documentation.

## Data lifecycle

1. Input is classified as demo, approved HTTPS URL/hash, or pasted JSON.
2. Remote data is fetched only from `cbyuce.com` or `arweave.net`, with size/time/content validation.
3. The parser copies allowlisted fields into `UceRecord`; unknown properties never reach rendering logic.
4. Verification functions produce immutable `EvidenceCheck` objects.
5. UI renders with DOM text nodes and safe link construction.
6. WebMCP returns JSON-serializable snapshots of the same state.

## Components mapped to PRD

### `src/records` — Epics 1–3

Fixture, input normalization, host allowlist, fetch adapter, runtime validation, and record summaries.

### `src/verification` — Epics 2–4

SHA-256 helpers, base64url handling, ES256 compact-JWS verification, chronology classification, assertions, and local digest comparison.

### `src/app` and `src/components` — Epics 1–5

Application state/controller and semantic DOM rendering. State exists in memory only and resets on navigation.

### `src/webmcp` — Epic 5

Feature detection, one-time registration, narrow schemas, read-only annotations, and safe tool results. The local-file tool receives no file or path input.

### `src/security` — Quality requirements

URL validation, safe fetch limits, untrusted-string normalization, and redaction-resistant structured errors.

## Verification contracts

- `verifyRecord(record, publicKeys?)` checks schema support, identifier/hash equality, ES256 JWS validity, and available public anchors.
- Signature verification requires the JWS payload to decode to the 32-byte manifest hash and the header `alg`/`kid` to match the selected P-256 JWK.
- A server-returned `verification.hashMatches` or `sigValid` is displayed only as a recorded server result, never as a local pass.
- Canonical manifest re-hashing is unavailable because the public record declares RFC 8785 but does not document which mutable/self-referential fields are in the digest input.

## Failure strategy

Network, CORS, validation, unsupported crypto, and missing-key failures become typed user-facing errors. The bundled demo remains available. Tool handlers return a concise explanation with structured status rather than throwing raw values.

## File structure

`src/{app,components,records,security,styles,types,verification,webmcp}` contains runtime code; `tests/{fixtures,unit,integration}` contains synthetic and public reduced fixtures; `docs/` contains design and review artifacts; `public/` contains only non-sensitive static assets.

## Dependencies

Vite, TypeScript, Vitest, jsdom, ESLint, typescript-eslint, and Prettier are development-only. Browser Web Crypto and DOM APIs provide runtime functionality, so the production bundle has no third-party runtime package.
