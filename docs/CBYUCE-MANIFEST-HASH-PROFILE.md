# CbyUCE Manifest Hash Profile — Specification Handoff

Status: **required CbyUCE follow-up; not implemented by Evidence Lens**

Evidence Lens cannot honestly recompute the current `manifestHash` until CbyUCE publishes a versioned, deterministic preimage definition. This document defines the acceptance contract for that separate CbyUCE task; it does not reverse-engineer or change existing records.

## Required profile decisions

The CbyUCE specification must assign a stable profile identifier and define, without implementation-dependent wording:

1. The exact root object hashed (for example, `manifest`, never the delivery envelope).
2. Every included and excluded field, including `hashes.manifestHash`, signatures, anchors, audit additions, server verification fields, and other values produced after the digest.
3. Whether excluded fields are removed, replaced by a fixed value, or represented by an explicit placeholder.
4. JSON data-model constraints before canonicalization: duplicate keys, Unicode validity, number range and representation, absent versus `null`, and unsupported values.
5. Canonicalization algorithm and version. If RFC 8785/JCS is used, the specification must cite it normatively and define any stricter schema constraints.
6. Digest algorithm, digest-byte encoding, and case requirements.
7. The record-creation sequence: preimage construction, canonicalization, hashing, signature creation, anchoring, and later verification metadata.
8. Versioning and migration behavior for existing records whose construction profile is absent.

## Required public test vectors

CbyUCE must publish machine-readable fixtures containing:

- the original input object;
- the exact post-exclusion preimage object;
- canonical UTF-8 bytes or their hexadecimal encoding;
- the expected SHA-256 digest;
- a minimally changed input with a different expected digest;
- edge cases for Unicode, numeric values, empty objects/arrays, `null`, and field ordering;
- a legacy record demonstrating that an absent profile is reported as unsupported rather than guessed.

At least two independent implementations must reproduce every vector before Evidence Lens enables the check.

## Proposed integration contract

The future public record should carry an explicit profile identifier adjacent to the digest, such as `hashes.profile`. Evidence Lens should dispatch only on reviewed identifiers; unknown or absent profiles remain **Not independently checked**. A supported profile implementation must:

- operate only on the validated public manifest;
- never consume the publisher's `hashMatches` result as input;
- compare locally computed digest bytes with `hashes.manifestHash` using an exact byte comparison;
- return **Verified** on equality and **Mismatch** on inequality;
- retain regression vectors for every supported profile indefinitely.

## Release gate

Do not relabel “Independent manifest recomputation” as a consumer verification check until the profile, lifecycle, and public vectors are approved in CbyUCE and reproduced in Evidence Lens. This work should ship as a separate CbyUCE change followed by a separately reviewed Evidence Lens implementation.
