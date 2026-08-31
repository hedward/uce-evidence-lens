# Public Data and CORS Investigation

Observed on 2026-08-30 from a foreign `Origin: http://localhost:5173` request.

## CbyUCE verification JSON

`https://cbyuce.com/verify/<64-char-hash>?format=json` returned HTTP 200 and `application/json` with `manifest` and `verification` objects. No `Access-Control-Allow-Origin` header was observed, so a separate static browser origin cannot rely on reading it.

Relevant public fields in the example include schema/version, work metadata, file SHA-256, `hashes`, Arweave anchor, audit events, attestations, an ES256 compact JWS, public-key reference/key ID, and server-reported verification results.

## Arweave manifest

The public transaction returned HTTP 200, `application/json`, and `Access-Control-Allow-Origin: *`. It contains the signed public manifest. Its stored `anchors.arweave.txId` is empty while the CbyUCE response adds the resolved transaction ID, demonstrating why field treatment must be publicly specified before canonical re-hashing is claimed.

## Public key set

The `platformPublicKeyRef` resolves to a public JWKS transaction with `Access-Control-Allow-Origin: *`. It contains a P-256 ES256 key whose `kid` matches the compact JWS header, plus a PQC key not used by this MVP.

## Honest capability decision

- Perform: runtime schema checks, record/hash equality, ES256 JWS verification, local file SHA-256 comparison.
- Locate/classify: recorded chronology and the bundled independently observed Arweave block timestamp.
- Report only as assertions: identity, author, creation date, originality oath, rights, license, and AI-use policy.
- Unavailable: locally recomputing the canonical manifest hash until the public procedure specifies exact digest inputs.

No server proxy is introduced. The bundled fixture, direct Arweave retrieval, and paste-public-JSON path preserve the demo whenever live CbyUCE retrieval is unavailable from the browser origin.
