# Build Notes

## 2026-08-30 — Baseline

- Confirmed the independent `uce-evidence-lens` repository on `main` with no remote.
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
