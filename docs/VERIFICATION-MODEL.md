# Verification Model

## Consumer status vocabulary

- **Verified:** this browser completed the named check and the independently retrieved or locally computed evidence agreed.
- **Mismatch:** this browser completed the named check and found conflicting evidence. This is the only failure state.
- **Checking:** the browser is actively retrieving or computing evidence.
- **Try again:** a supported check could not finish because the source is pending or temporarily unreachable. This is not a mismatch.
- **Publisher reported:** the publisher supplied the value or result; Evidence Lens does not present it as an independent check.
- **Not independently checked:** the current record or public specification does not support the check.

The main result says **No integrity problems found** unless a completed check finds a mismatch. Pending, retryable, reported, and unsupported checks never become silent passes, but they also do not imply that evidence failed.

## Browser-supported checks

1. Schema/version support and required-field validation.
2. Equality of an independently supplied CbyUCE URL/hash identifier and the recorded `manifestHash`. Pasted JSON and direct Arweave input do not receive an identifier verification from the manifest's own hash.
3. ES256 compact-JWS verification with a reviewed P-256 JWK from the application-owned trusted platform-key registry, including exact key-reference, header, key ID, and 32-byte hash payload checks. Keys selected or embedded by an untrusted record do not establish trust.
4. Local file SHA-256 equality with the record's file digest.
5. Direct Arweave chronology verification. The browser retrieves the transaction status and referenced block from `arweave.net`, binds the transaction ID to the block's transaction list, and checks the block hash, height, and timestamp. Publisher-reported height and timestamp values must agree when present.

The Arweave result is independent of the CbyUCE response in the limited sense that it is retrieved directly from a public Arweave gateway. It is not a trustless Arweave light client or a legal proof of the work's claimed creation date.

## Technical details

Publisher responses and checks that cannot yet be independently reproduced appear in a collapsed technical-details section. They remain visible for expert review without competing with consumer results.

Independent full-manifest recomputation is currently marked **Not independently checked**. The record labels RFC 8785 canonicalization, but the current public format does not define the exact treatment of self-referential and post-anchor fields. A server's `hashMatches` flag is not substituted for a browser operation. See [CbyUCE Manifest Hash Profile](CBYUCE-MANIFEST-HASH-PROFILE.md) for the separate specification work required.

## Legal boundary

Identity assurance, author name, creation date, originality oath, ownership/rights confirmation, license, and AI-use policies are recorded assertions. A verified result confirms only the operation described; it is not a determination of authorship, ownership, copyright validity, registration, identity, or truth.
