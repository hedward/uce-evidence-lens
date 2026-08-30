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
