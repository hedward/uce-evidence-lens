# UCE Evidence Lens

Verify public Universal Creation Evidence records with a person and an AI agent in the same browser view—checking supported structure, record/hash consistency, public ES256 signatures, chronology, rights assertions, and local file matches without uploading the underlying work.

UCE Evidence Lens is a new, independent reference verifier developed for 5 Race Street LLC, operating under the alternate name Copyright by UCE. It is not the Copyright by UCE production application and has no dependency on its source, private APIs, signing infrastructure, accounts, payments, or operational logic.

## What it does

- Loads a bundled, reduced fixture of the supplied public example.
- Accepts a public CbyUCE verification URL/hash, an Arweave manifest URL, or pasted public JSON.
- Validates untrusted records into a conservative schema and renders values as text.
- Separates browser-performed checks from server-reported results and recorded assertions.
- Verifies the public example's ES256 compact JWS against the referenced public Arweave P-256 JWK.
- Separates claimed dates, system events, and an independently located Arweave block timestamp.
- Hashes a user-selected file locally with SHA-256 and compares only its digest.
- Registers seven page-scoped, read-only WebMCP tools when `document.modelContext.registerTool` is available.

Every result carries this boundary: evidence integrity is not a legal determination of identity, authorship, ownership, copyright validity, registration, or the truth of a recorded assertion.

## Run locally

Requirements: Node.js 24+ and npm 11+.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. The public demonstration loads automatically.

```bash
npm run check
npm run build
```

`npm run check` runs formatting, lint, strict TypeScript, Vitest, and a production Vite build. The deployable static output is `dist/`.

## Verification model

The browser can locally pass these checks:

- supported `uce.evidence.manifest` version `1.0.0` parsing;
- supplied identifier equality with the manifest's recorded `manifestHash`;
- ES256 signature verification over the recorded 32-byte manifest hash with a matching public P-256 JWK;
- local SHA-256 file digest equality;
- location of supported external chronology evidence when its transaction and block timestamp are present.

Canonical-manifest hash recomputation is deliberately **unavailable**. The public record declares SHA-256 and RFC 8785, but the public sources inspected on 2026-08-30 do not define exactly which self-referential and post-anchor fields enter the digest. The app does not reconstruct proprietary record-creation logic or treat the publisher's `hashMatches` flag as a local pass.

See [Verification Model](docs/VERIFICATION-MODEL.md) and [Public Data Investigation](docs/PUBLIC-DATA-INVESTIGATION.md).

## Public retrieval and CORS

The CbyUCE `?format=json` representation was machine-readable but did not return `Access-Control-Allow-Origin` for a foreign origin during inspection. The Arweave manifest and JWKS transactions did return `Access-Control-Allow-Origin: *`. Therefore:

- the bundled public fixture always works;
- direct Arweave manifest/JWKS retrieval can work cross-origin;
- CbyUCE URL/hash retrieval may fail in a static deployment;
- pasted public JSON is the recovery path;
- there is no server proxy or production dependency.

## WebMCP tools

The app feature-detects the current imperative API and registers these top-level tools once:

- `load_uce_public_record`
- `get_uce_record_summary`
- `verify_uce_record`
- `inspect_uce_chronology`
- `list_uce_assertions`
- `inspect_uce_rights_declaration`
- `compare_local_file_to_uce_record`

Every input schema rejects unexpected properties, every definition uses `readOnlyHint: true`, and the local-file tool can access only the digest already selected by the user—not the picker, path, or contents. The UI remains fully functional when WebMCP is unavailable.

Current syntax was confirmed against [official OpenAI WebMCP documentation](https://learn.chatgpt.com/docs/webmcp). The challenge page is [webmcp.devpost.com](https://webmcp.devpost.com/).

## Privacy and security

- No backend, database, account, analytics, advertising, authentication, payment, or cloud storage.
- No runtime npm dependency.
- Local file bytes remain in the file-selection handler and browser Web Crypto call; the app retains only filename, size, digest, and timestamp in memory.
- Remote hosts are restricted to HTTPS CbyUCE verification routes and Arweave transaction URLs.
- JSON depth, size, string, object, and array limits reduce denial-of-service risk.
- Untrusted record values never enter `innerHTML` or code evaluation.

See [Threat Model](docs/THREAT-MODEL.md), [Security Policy](SECURITY.md), and [Public/Private Boundary](docs/PUBLIC-PRIVATE-BOUNDARY.md).

## Architecture

Pure TypeScript modules parse, classify, and verify records. A memory-only controller coordinates state. The semantic DOM renderer and WebMCP adapter call the same controller operations so agent results stay aligned with the visible page. Browser Web Crypto supplies SHA-256 and ECDSA P-256.

See [Architecture](docs/ARCHITECTURE.md) and the [technical spec](docs/hackathon-build/spec.md).

## Project status and licensing

This is a local MVP prepared for publication review. No remote, deployment, final license, video, or Devpost submission has been created. MPL-2.0 is documented only as a candidate pending separate legal and patent review; this repository currently provides no final license grant.

See [Publication Readiness](docs/PUBLICATION-READINESS.md), [License Recommendation](docs/LICENSE-RECOMMENDATION.md), [Notice](NOTICE.md), and [Trademarks](TRADEMARKS.md).
