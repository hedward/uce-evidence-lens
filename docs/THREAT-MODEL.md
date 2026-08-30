# Threat Model

## Assets

Local file contents; local digest metadata; user trust in result wording; browser state; application integrity.

## Trust boundaries

Pasted and fetched records are hostile. Remote servers and WebMCP callers are untrusted. Browser Web Crypto is trusted for supported primitives. Bundled fixture provenance is documented but its assertions remain untrusted.

## Principal threats and controls

- **Script/markup injection:** strict runtime copying, text-node rendering, no untrusted `innerHTML`.
- **SSRF/open redirects:** HTTPS-only exact-host allowlist, identifier validation, redirect-aware response checks.
- **Oversized/slow input:** response-size cap, timeout, JSON depth/string/array limits.
- **Misleading legal claims:** closed status vocabulary and mandatory no-legal-determination language.
- **False crypto success:** pass only after local Web Crypto succeeds; match `alg`, `kid`, payload, and curve.
- **Local-file disclosure:** explicit picker; digest in memory only; no upload or file bytes in tools.
- **Tool confused deputy:** read-only annotations, schemas with `additionalProperties: false`, no hidden side effects, idempotent registration.
- **Supply chain:** no production runtime dependency; locked dev dependencies; license and vulnerability review.
- **Private-IP contamination:** no adjacent-repository access and documented provenance review.

## Residual risks

Public endpoints can change, CORS can differ by deployment, compromised public data can mislead assertions, WebMCP is emerging, and browser crypto availability varies. The UI surfaces these as limitations instead of silently degrading.
