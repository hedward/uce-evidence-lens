# UCE Evidence Lens

Verify public Universal Creation Evidence records with a person and an AI agent in the same browser view—checking supported structure, record/hash consistency, public ES256 signatures, chronology, rights assertions, and local file matches without uploading the underlying work.

UCE Evidence Lens is a new, independent reference verifier developed by Copyright by UCE. It is not the Copyright by UCE production application and has no dependency on its source, private APIs, signing infrastructure, accounts, payments, or operational logic.

## What it does

- Loads a bundled, reduced fixture of the supplied public example.
- Accepts a public CbyUCE verification URL/hash, an Arweave manifest URL, or pasted public JSON.
- Validates untrusted records into a conservative schema and renders values as text.
- Separates browser-performed checks from server-reported results and recorded assertions.
- Verifies the public example's ES256 compact JWS only against a reviewed P-256 key pinned in the application's trusted platform-key registry; record-selected keys cannot establish trust.
- Separates claimed dates, system events, and publisher-reported ledger timestamps; no timestamp is called independent unless the browser retrieves and binds it to the transaction.
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

The current automated baseline is 50 passing tests across seven test files. The complete release-audit result is recorded in [Publication Readiness](docs/PUBLICATION-READINESS.md).

## Verification model

The browser can locally pass these checks:

- supported `uce.evidence.manifest` version `1.0.0` parsing;
- equality between an independently supplied CbyUCE URL/hash identifier and the manifest's recorded `manifestHash` (unavailable for pasted JSON and direct Arweave input);
- ES256 signature verification over the recorded 32-byte manifest hash with an exact `kid`, key reference, and reviewed P-256 JWK from the application-owned registry;
- local SHA-256 file digest equality;
- classification of publisher-reported chronology without promoting it to an independent pass.

Canonical-manifest hash recomputation is deliberately **unavailable**. The public record declares SHA-256 and RFC 8785, but the public sources inspected on 2026-08-30 do not define exactly which self-referential and post-anchor fields enter the digest. The app does not reconstruct proprietary record-creation logic or treat the publisher's `hashMatches` flag as a local pass.

See [Verification Model](docs/VERIFICATION-MODEL.md) and [Public Data Investigation](docs/PUBLIC-DATA-INVESTIGATION.md).

## Public retrieval and CORS

The verifier treats network alternatives as resilience paths rather than hidden fallbacks:

- the bundled public fixture always works;
- direct Arweave manifest retrieval can work cross-origin and is bound to the transaction identifier in the requested URL;
- CbyUCE URL/hash retrieval works when its public JSON response authorizes the deployed browser origin;
- pasted public JSON remains available when a live source cannot be reached;
- there is no server proxy or production dependency.

During the original investigation, the CbyUCE `?format=json` response was machine-readable but did not authorize a foreign browser origin. After the final production origin is established, CbyUCE may add a narrowly scoped CORS response header for that exact origin without changing its JSON body or other routes. The bundled demo, Arweave, and pasted-JSON paths remain available regardless.

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
- Remote bodies retain their timeout and byte limit throughout streaming; oversized streams are canceled before full buffering.
- Concurrent record and file operations use generation binding so stale results cannot be paired with a newer record.
- Platform signature trust comes from a reviewed application-owned key registry, never public-key material selected by an untrusted record.
- Untrusted record values never enter `innerHTML` or code evaluation.

See [Threat Model](docs/THREAT-MODEL.md), [Security Policy](SECURITY.md), and [Public/Private Boundary](docs/PUBLIC-PRIVATE-BOUNDARY.md).

## Architecture

Pure TypeScript modules parse, classify, and verify records. A memory-only controller coordinates state. The semantic DOM renderer and WebMCP adapter call the same controller operations so agent results stay aligned with the visible page. Browser Web Crypto supplies SHA-256 and ECDSA P-256.

See [Architecture](docs/ARCHITECTURE.md) and the [technical spec](docs/hackathon-build/spec.md).

## Cloudflare Pages deployment

Production deployment targets static Cloudflare Pages hosting. Node.js 24 is pinned in `.node-version`; Vite builds to `dist`; and `public/_headers` supplies the reviewed production security policy. The project intentionally contains no Pages Function, Worker, proxy, server runtime, or runtime secret.

See the [Cloudflare deployment runbook](docs/CLOUDFLARE-DEPLOYMENT.md) for the exact build settings, security-header review, browser checks, Galaxy CORS sequencing, and rollback procedure.

## Project status and licensing

This MVP is under private development and prepared for publication review. Its private GitHub remote exists, but no production deployment, final license, video, or Devpost submission has been completed. MPL-2.0 is documented only as a candidate pending separate legal and patent review; this repository currently provides no final license grant.

See [Publication Readiness](docs/PUBLICATION-READINESS.md), [License Recommendation](docs/LICENSE-RECOMMENDATION.md), [Notice](NOTICE.md), and [Trademarks](TRADEMARKS.md).
