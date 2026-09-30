# UCE Evidence Lens

**Version `1.1.0`: classical verification and recipient workflows.** The
post-contest rollout was authorized September 29, 2026. The historical submitted
v1.0.0 source commit, artifact and published evidence remain preserved. See
[candidate readiness](docs/POST-CONTEST-CANDIDATE.md) and the mandatory
[publisher compatibility contract](docs/MANIFEST-COMPATIBILITY.md).

Verify public Universal Creation Evidence records with a person and an AI agent in the same browser view—checking supported structure, record/hash consistency, public ES256 signatures, chronology, rights assertions, and local file matches without uploading the underlying work.

UCE Evidence Lens is a new, independent reference verifier developed by Copyright by UCE. It is not the Copyright by UCE production application and has no dependency on its source, private APIs, signing infrastructure, accounts, payments, or operational logic.

## What it does

- Loads the registered UCE Evidence Lens logo-and-tagline record as its bundled demonstration, with the exact public PNG and raw manifest available for inspection.
- Accepts a public CbyUCE verification URL/hash, an Arweave manifest URL, or pasted public JSON.
- Validates untrusted records into a conservative schema and renders values as text.
- Separates browser-performed checks from server-reported results and recorded assertions.
- Verifies the public example's ES256 compact JWS only against a reviewed P-256 key pinned in the application's trusted platform-key registry; record-selected keys cannot establish trust.
- Independently recomputes the reviewed Extended 1.1.0 public hash projection and the positive-only Standard 1.0.0 public projection. A Standard match is reported; a non-match is unresolved because some historical preimage timestamps were not preserved. Covered fields and exclusions stay explicit.
- Contains a local ES256 + ML-DSA-65 hybrid verification engine and a reviewed public post-quantum key, but does not issue a runtime 2.0.0 or 2.1.0 cryptographic pass without genuine publisher-issued qualification records.
- Separates claimed dates, system events, and publisher-reported ledger timestamps; no timestamp is called independent unless the browser retrieves and binds it to the transaction.
- Hashes a user-selected file locally with SHA-256 and compares only its digest.
- Registers eight page-scoped, read-only WebMCP tools before record loading, then confirms their same-origin discoverability when `document.modelContext.getTools` is available.
- Shares approved public references through recipient links, without including local-file information.
- Exports unsigned, dated inspection reports as JSON or a print-friendly view, with identical checks and limitations in WebMCP.

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

The automated suite covers public loading, cryptography, Arweave chronology states, rendering, controller concurrency, and WebMCP behavior. The complete release-audit result is recorded in [Publication Readiness](docs/PUBLICATION-READINESS.md).

## Candidate browser and accessibility qualification

The local candidate was exercised in macOS Chrome and the Codex in-app browser
(both reporting Chromium 153). Chrome's actual Save-as-PDF export was tested;
the tested in-app browser does not provide printing, so use Chrome or download
JSON there. Safari, Firefox, mobile-device browsers and Windows have not yet
been qualified for this candidate. WebMCP requires a compatible host; human
verification does not require agent tools.

Keyboard, focus recovery, contrast, reflow and PDF privacy checks passed after
fixes. Human screen-reader listening sign-off remains open; automated checks are
not a claim of complete WCAG or PDF/UA conformance. See the current
[accessibility, browser and PDF QA record](docs/RELEASE-QA.md), which supplements
the historical submitted-release audit.

## Verification model

The browser can locally pass these checks:

- recognized `uce.evidence.manifest` `1.0.0`, `1.1.0`, `2.0.0` and `2.1.0` read/display parsing (not full cryptographic support for every version);
- equality between an independently supplied CbyUCE URL/hash identifier and the manifest's recorded `manifestHash` (not independently checked for pasted JSON and direct Arweave input);
- ES256 signature verification over the recorded 32-byte manifest hash with an exact `kid`, key reference, and reviewed P-256 JWK from the application-owned registry;
- local SHA-256 file digest equality;
- direct retrieval of Arweave transaction status and block metadata, including transaction membership, block binding, height, and timestamp comparison;
- classification of publisher-reported chronology without promoting it to an independent result.

Independent hash recomputation is enabled locally for the **reviewed Extended 1.1.0 profile**, with a real publisher-issued fixture, exact canonical bytes, paired publisher/Lens comparisons, and tamper tests. Its ES256 signature requires the exact supported critical header and the reviewed platform key. Standard 1.0.0 has a narrower, positive-only public projection: a match establishes only that projection; a non-match is not called tampering because historical timestamp inputs may be unavailable. Standard coverage excludes work/title, license/policy, AI disclosures, file names and other descriptors. Neither profile verifies all final fields or the truth of assertions.

The local hybrid engine checks both ES256 and ML-DSA-65 against reviewed public keys and the same 32-byte recorded hash. Synthetic cross-library vectors demonstrate interoperability, but neither 2.0.0 nor 2.1.0 is release-qualified: runtime hybrid signatures and 2.x hash recomputation remain **not independently verified** pending real public publisher-issued records and paired review. Publisher `hashMatches` or `sigValid` flags never substitute for browser verification. See the [compatibility contract](docs/MANIFEST-COMPATIBILITY.md), [hybrid qualification gate](docs/hash-profiles/HYBRID-QUALIFICATION.md), and [Extended 1.1 checkpoint](docs/hash-profiles/EXTENDED-1.1-VERIFICATION.md). Production release remains separately gated.

See [Verification Model](docs/VERIFICATION-MODEL.md) and [Public Data Investigation](docs/PUBLIC-DATA-INVESTIGATION.md).

## Public retrieval and CORS

The verifier treats network alternatives as resilience paths rather than hidden fallbacks:

- the bundled public fixture always works;
- direct Arweave manifest retrieval can work cross-origin and is bound to the transaction identifier in the requested URL;
- CbyUCE URL/hash retrieval works when its public JSON response authorizes the deployed browser origin;
- pasted public JSON remains available when a live source cannot be reached;
- there is no server proxy or production dependency.

CbyUCE authorizes the submitted `https://uceevidencelens.com` origin to retrieve public `?format=json` responses without credentials. The user deployed the additional candidate-origin CORS fix separately: a September 21 recheck returned HTTP 200 JSON with `Access-Control-Allow-Origin: https://uce-evidence.edyoungprojects.com` and `Vary: Origin`. Localhost remains deliberately outside the production allowlist. Direct Arweave and pasted JSON work without a publisher proxy.

## WebMCP tools

The app feature-detects the current imperative API and registers these top-level tools once:

- `load_uce_public_record`
- `get_uce_record_summary`
- `verify_uce_record`
- `inspect_uce_chronology`
- `list_uce_assertions`
- `inspect_uce_rights_declaration`
- `compare_local_file_to_uce_record`
- `get_uce_verification_report` (unsigned snapshot; local filenames and digests excluded)

Every input schema rejects unexpected properties, every definition uses `readOnlyHint: true`, and the local-file tool can access only the digest already selected by the user—not the picker, path, or contents. Registration errors retain their browser error class for diagnosis, and the UI remains fully functional when WebMCP is unavailable.

Current syntax and discovery behavior were confirmed against the [Chrome WebMCP Imperative API documentation](https://developer.chrome.com/docs/ai/webmcp/imperative-api) and [official OpenAI WebMCP documentation](https://learn.chatgpt.com/docs/webmcp). The challenge page is [webmcp.devpost.com](https://webmcp.devpost.com/).

## Privacy and security

- No backend, database, account, analytics, advertising, authentication, payment, or cloud storage.
- One runtime cryptography dependency, `@noble/post-quantum`, with its MIT-licensed transitive packages; see [third-party notices](public/THIRD-PARTY-NOTICES.txt). No remote code or manifest-selected cryptography is loaded.
- Local file bytes remain in the file-selection handler and browser Web Crypto call; the app retains only filename, size, digest, and timestamp in memory.
- Remote hosts are restricted to HTTPS CbyUCE verification routes and Arweave transaction URLs.
- JSON depth, size, string, object, and array limits reduce denial-of-service risk.
- Remote bodies retain their timeout and byte limit throughout streaming; oversized streams are canceled before full buffering.
- Concurrent record and file operations use generation binding so stale results cannot be paired with a newer record.
- Platform signature trust comes from a reviewed application-owned key registry, never public-key material selected by an untrusted record.
- Untrusted record values never enter `innerHTML` or code evaluation.

See [Threat Model](docs/THREAT-MODEL.md), [Security Policy](SECURITY.md), and [Public/Private Boundary](docs/PUBLIC-PRIVATE-BOUNDARY.md).

## Architecture

Pure TypeScript modules parse, classify, and verify records. A memory-only controller coordinates state. The semantic DOM renderer and WebMCP adapter call the same controller operations so agent results stay aligned with the visible page. Browser Web Crypto supplies SHA-256 and ECDSA P-256; bundled `@noble/post-quantum` supplies the local ML-DSA-65 verification engine behind the hybrid release gate.

See [Architecture](docs/ARCHITECTURE.md) and the [technical spec](docs/hackathon-build/spec.md).

## Cloudflare Pages deployment

Production deployment targets static Cloudflare Pages hosting. Node.js 24 is pinned in `.node-version`; Vite builds to `dist`; and `public/_headers` supplies the reviewed production security policy, including origin-keyed agent clustering required by WebMCP. The project intentionally contains no Pages Function, Worker, proxy, server runtime, or runtime secret.

See the [Cloudflare deployment runbook](docs/CLOUDFLARE-DEPLOYMENT.md) for the exact build settings, security-header review, browser checks, Galaxy CORS sequencing, and rollback procedure.

## ChatGPT integration information

The static `/gpt/` section explains the separate Lens ChatGPT integration and
contains its privacy, terms, and support pages. Its public contact is
`support@universalcreationevidence.com`. These pages add no server runtime or
new hosting service; the ChatGPT MCP service runs separately on Cloud Run.
The main Lens verification workflow remains browser-based. See
[public-page validation](docs/CHATGPT-PUBLIC-PAGES.md).

To preview these directory-index pages locally, run `npm run build`, then
`npx vite preview`. Vite's development server can fall back to the root app
for directory URLs under `public/`; the built preview and Cloudflare Pages
serve the dedicated HTML pages at their intended paths.

## Historical v1.0.0 release evidence

The footer continues to use the published historical evidence route
`https://uceevidencelens.com/evidence/v1.0.0`. No v1.1.0 UCE record exists, so
the application does not infer an evidence URL from its package version. The
footer identifies the application as release 1.1.0 and states that the linked
v1.0.0 evidence does not cover this release.

Creating a v1.1.0 record or redirect requires separate approval and is not
implied by publishing the application. Run
`npm run release:artifact` from a clean committed worktree to verify the project
and create the deterministic site ZIP for registration. See the
[release-evidence runbook](docs/RELEASE-EVIDENCE.md) for the later registration,
redirect, deployment, and tagging sequence.

## Project status and licensing

The UCE Evidence Lens Covered Software is licensed under the [Mozilla Public License 2.0](LICENSE). The authoritative UCE Mark, associated names and marks, and the bundled logo-and-tagline artwork are treated separately and are not licensed under MPL-2.0. Their limited authorized use in this project is documented in [Notice](NOTICE.md) and [Trademarks](TRADEMARKS.md).

The submitted v1.0.0 and its evidence remain separate from release `1.1.0`.
Deployment-specific verification is recorded in [release QA](docs/RELEASE-QA.md).

See [Publication Readiness](docs/PUBLICATION-READINESS.md), [License Recommendation](docs/LICENSE-RECOMMENDATION.md), [Notice](NOTICE.md), and [Trademarks](TRADEMARKS.md).
