# Threat Model

## Assets

Local file contents; local digest metadata; user trust in result wording; browser state; application integrity.

## Trust boundaries

Pasted and fetched records are hostile. Their hashes, key references, timestamps, and server flags are claims until a separate browser operation validates them. Remote servers and WebMCP callers are untrusted. Browser Web Crypto and the reviewed application-owned platform-key registry are trusted for the narrowly supported signature operation. Bundled fixture provenance is documented but its assertions remain untrusted.

## Principal threats and controls

- **Script/markup injection:** strict runtime copying, text-node rendering, no untrusted `innerHTML`.
- **SSRF/open redirects:** HTTPS-only exact-host allowlist, identifier validation, redirect-aware response checks.
- **Oversized/slow input:** `Content-Length` precheck, streaming byte cap with cancellation, timeout retained through body consumption, and JSON depth/string/array limits.
- **Misleading legal claims:** closed status vocabulary and mandatory no-legal-determination language.
- **False crypto success:** pass only after local Web Crypto succeeds with an exact active entry in the reviewed key registry; match key reference, `alg`, `kid`, payload, and curve; unknown or record-selected keys never pass.
- **False identifier/chronology success:** only an externally supplied CbyUCE route identifier can pass equality; record-supplied block time remains an assertion until independently retrieved and transaction-bound.
- **Stale async results:** record loads, verification, errors, and local-file hashing are generation-bound; rendering additionally checks the verification's source/hash binding.
- **Local-file disclosure:** explicit picker; digest in memory only; no upload or file bytes in tools.
- **Tool confused deputy:** read-only annotations, schemas with `additionalProperties: false`, no hidden side effects, idempotent registration.
- **Supply chain:** no production runtime dependency; locked dev dependencies; license and vulnerability review.
- **Private-IP contamination:** no adjacent-repository access and documented provenance review.

## Residual risks

Public endpoints can change, CORS can differ by deployment, compromised public data can mislead assertions, WebMCP is emerging, and browser crypto availability varies. The UI surfaces these as limitations instead of silently degrading.
