# Public Data and CORS Investigation

Observed on 2026-08-30 from a foreign `Origin: http://localhost:5173` request.

## CbyUCE verification JSON

`https://cbyuce.com/verify/<64-char-hash>?format=json` returned HTTP 200 and `application/json` with `manifest` and `verification` objects. No `Access-Control-Allow-Origin` header was observed, so a separate static browser origin cannot rely on reading it.

Relevant public fields in the example include schema/version, work metadata, file SHA-256, `hashes`, Arweave anchor, audit events, attestations, an ES256 compact JWS, public-key reference/key ID, and server-reported verification results.

## Arweave manifest

The public transaction returned HTTP 200, `application/json`, and `Access-Control-Allow-Origin: *`. It contains the signed public manifest. Its stored `anchors.arweave.txId` is empty while the CbyUCE response adds the resolved transaction ID, demonstrating why field treatment must be publicly specified before canonical re-hashing is claimed.

## Public key set and trust decision

The `platformPublicKeyRef` resolves to a public JWKS transaction with `Access-Control-Allow-Origin: *`. It contains a P-256 ES256 key whose `kid` matches the compact JWS header, plus a PQC key not used by this MVP. Runtime records are not permitted to select this or any replacement trust root. The reviewed P-256 coordinates, key reference, and RFC 7638 thumbprint are pinned in the application's trusted platform-key registry; rotation or revocation requires a reviewed release.

## Honest capability decision

- Perform: runtime schema checks; CbyUCE URL/hash-to-record equality; ES256 JWS verification against the reviewed registry; local file SHA-256 comparison.
- Locate/classify: the requested Arweave transaction and publisher-reported chronology. A record-supplied block timestamp is not independently verified.
- Report only as assertions: identity, author, creation date, originality oath, rights, license, and AI-use policy.
- Unavailable: locally recomputing the canonical manifest hash until the public procedure specifies exact digest inputs.

No server proxy is introduced. The bundled fixture, direct Arweave retrieval, and paste-public-JSON path preserve the demo whenever live CbyUCE retrieval is unavailable from the browser origin.
