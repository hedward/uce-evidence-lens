# Verification Model

## Consumer status vocabulary

- **Verified:** this browser completed the named check and the independently retrieved or locally computed evidence agreed.
- **Mismatch:** this browser completed the named check and found conflicting evidence. This is the only failure state.
- **Checking:** the browser is actively retrieving or computing evidence.
- **Try again:** a supported check could not finish because the source is pending or temporarily unreachable. This is not a mismatch.
- **Publisher reported:** the publisher supplied the value or result; Evidence Lens does not present it as an independent check.
- **Not independently checked:** the current record or public specification does not support the check.

The main result says **No problems found in completed checks** unless a completed check finds a mismatch. Unqualified hybrid records instead explicitly say **Cryptographic verification is not yet complete for this hybrid format**. The missing manifest-content coverage is visible beside the result, not only in collapsed details. Pending, retryable, reported, and unsupported checks never become silent passes, but they also do not imply that evidence failed.

## Browser-supported checks

1. Schema/version support and required-field validation.
2. Equality of an independently supplied CbyUCE URL/hash identifier and the recorded `manifestHash`. Pasted JSON and direct Arweave input do not receive an identifier verification from the manifest's own hash.
3. ES256 compact-JWS verification with a reviewed P-256 JWK from the application-owned trusted platform-key registry, including exact key-reference, header, key ID, and 32-byte hash payload checks. Keys selected or embedded by an untrusted record do not establish trust.
4. Local file SHA-256 equality with the record's file digest.
5. Direct Arweave chronology verification. The browser retrieves the transaction status and referenced block from `arweave.net`, binds the transaction ID to the block's transaction list, and checks the block hash, height, and timestamp. Publisher-reported height and timestamp values must agree when present.
6. Independent SHA-256 recomputation of the reviewed Extended 1.1.0 public projection, with strict raw JSON, exact critical-profile semantics, and public-detail validation. The Standard 1.0.0 projection is positive-only: a match can pass for its narrow covered fields, but a non-match remains unresolved because some historical preimage timestamps cannot be recovered. Coverage is carried into UI, WebMCP and reports.

The Arweave result is independent of the CbyUCE response in the limited sense that it is retrieved directly from a public Arweave gateway. It is not a trustless Arweave light client or a legal proof of the work's claimed creation date.

## Technical details

Publisher responses and checks that cannot yet be independently reproduced appear in a collapsed technical-details section. They remain visible for expert review without competing with consumer results.

Extended 1.1.0 recomputation is implemented in the local candidate. It is not an “all fields verified” claim: signatures, audit events, the manifest's own hash, its Arweave anchor and other unlisted top-level fields are excluded. A valid signature over the recorded hash does not erase a content mismatch. Standard 1.0.0 recomputation has a materially narrower projection: it excludes work/title, license/policy, AI disclosures, file names and other descriptors, and only a matching digest is a pass. A historical non-match is not labeled tampering. Hybrid 2.x recomputation has no runtime pass pending public-record qualification. A server's `hashMatches` flag is never substituted for a browser operation. See [current compatibility](MANIFEST-COMPATIBILITY.md), [the hash-profile acceptance gate](CBYUCE-MANIFEST-HASH-PROFILE.md), and [hybrid qualification](hash-profiles/HYBRID-QUALIFICATION.md).

Signature checks cite the inspected record. Reviewed key material and the
historical key-review reference have separate labels. Only the existing reviewed
flat ES256 profile and reviewed Extended 1.1.0 critical profile are locally
verified at runtime. The local hybrid engine checks ES256 and ML-DSA-65 over
the same 32-byte recorded digest, with the exact Extended 2.1.0 critical
header, but its production qualification list is empty. Thus 2.0.0 and 2.1.0
return **not independently checked**, not a cryptographic pass. The ML-DSA-65
public key is pinned to a reviewed immutable JWKS and a SHA-256 fingerprint;
manifest-supplied key references, library labels and URLs cannot select keys
or code. Synthetic cross-library vectors do not substitute for genuine
publisher-issued records. Stripping a schema marker must not cause a critical
JWS extension to be ignored.

UI checks, WebMCP verification results, and unsigned dated reports share the same
record-bound snapshot. Reports preserve unsupported/reported checks and
verification limits. Local filename/digest details require an explicit UI export
choice and are never added by the report tool. Reports are not new UCE records
or perpetual approvals.

## Legal boundary

Identity assurance, author name, creation date, originality oath, ownership/rights confirmation, license, and AI-use policies are recorded assertions. A verified result confirms only the operation described; it is not a determination of authorship, ownership, copyright validity, registration, identity, or truth.
