# Build Notes

## 2026-08-30 — Baseline

- Confirmed the independent `uce-evidence-lens` repository on `main`; no remote was configured at the baseline stage. A private GitHub remote was added later in the build.
- Corrected TypeScript 6 `rootDir` validation and committed the five-file baseline as `af9bff1`.
- Confirmed `.idea/`, `node_modules/`, build output, environments, keys, and private records are ignored and uncommitted.

## 2026-08-30 — Public investigation

- Official OpenAI docs use imperative top-level `document.modelContext.registerTool`, JSON Schema input, and `readOnlyHint` annotations.
- The public CbyUCE `?format=json` response is machine-readable but did not include an `Access-Control-Allow-Origin` header when requested with a foreign origin.
- The Arweave manifest and JWKS transactions returned `Access-Control-Allow-Origin: *`.
- The example uses schema `uce.evidence.manifest` version `1.0.0`, SHA-256/RFC 8785 labels, an ES256 compact JWS, and a P-256 public JWK.
- The public material permits JWS verification and anchor inspection, but does not specify the exact canonical-manifest digest input. Local canonical hash verification will therefore remain unavailable.

## 2026-08-30 — Core MVP

- Added a Vite/TypeScript static application with no runtime dependencies.
- Added conservative parsing, HTTPS host allowlisting, response/input limits, and safe text rendering.
- Added browser-native SHA-256 and ES256 verification. The bundled public example signature passes with the public Arweave P-256 JWK; modified signatures fail.
- Added chronology and recorded-assertion models, a responsive accessible interface, and local-file digest comparison.
- Registered and live-tested seven imperative, read-only WebMCP tools in the top-level page.
- Verified desktop and 390×844 layouts; the mobile page had no horizontal overflow.
- `npm run check` passed with 22 tests before the documentation/CI milestone.

## 2026-08-30 — Hardening and publication review

- Added CI, README, security, trademark, notice, license-review, demo, public-data, and publication-readiness documents.
- Expanded the suite to 23 tests, including valid, tampered, malformed, missing-key, signature, digest, network/CORS, malicious-string, WebMCP-unavailable, repeated-registration, and tool-input cases.
- Repository search found no executable HTML injection/evaluation/storage APIs and no credential/private-key signatures.
- Confirmed zero production dependencies and complete license metadata for installed lockfile entries.
- `npm audit` reported zero known vulnerabilities.
- The formal Codex Security workbench scan could not start because its required desktop scan capabilities were unavailable; a local source-backed audit was completed and is not represented as a workbench report.

## 2026-08-30 — Repository and Cloudflare readiness

- Connected `main` to the private GitHub repository at `github.com/hedward/uce-evidence-lens` and pushed the completed milestones.
- Adopted Copyright by UCE as the project-facing company name while preserving source-record assertions as evidence data.
- Added the authorized UCE Mark as the favicon and footer identity with a pending verification-record link.
- Added static Cloudflare Pages configuration, restrictive production response headers, Node.js 24 pinning, and a deployment runbook without a Pages Function, Worker, or proxy.
- Reframed the bundled demo, Arweave, and pasted-JSON workflows as permanent resilience paths.
- The current `npm run check` baseline passes 50 tests across seven test files, in addition to formatting, lint, strict TypeScript, and the production build. Security regression coverage now includes trusted-key selection, identifier provenance, conservative chronology, async generation binding, invocation-bound WebMCP output, Arweave redirect binding, and streaming byte/time limits.

## 2026-09-01 — WebMCP judging-readiness repair

- Traced a live zero-tool discovery result to the deployment and startup boundaries rather than the evidence-verification path.
- Added origin-keyed agent clustering and an explicit same-origin `tools` Permissions Policy to the static Cloudflare response headers.
- Moved registration and same-origin discovery ahead of asynchronous bundled-record loading.
- Added visible browser error classes and a `getTools()` self-check so a registration claim cannot silently mask an empty callable-tool surface.
- Added regression coverage for origin headers, registration rejection, empty discovery, and startup order.
