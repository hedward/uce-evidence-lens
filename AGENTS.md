# Evidence Lens development requirements

## Publisher alignment is a product invariant

UCE Evidence Lens must stay aligned with the current CbyUCE manifests, not a
separately invented Lens format. Before changing parsing, verification, rights
display, chronology, key handling, or agent results:

1. Review the current approved CbyUCE publisher contract and representative
   public records. Record the publisher revision, review date, and differences
   in `docs/MANIFEST-COMPATIBILITY.md`. Source availability is not proof that a
   feature flag or revision is deployed.
2. Preserve legacy records. Add explicit version/profile adapters and fixtures
   for new formats. Unknown profiles must never silently inherit a verification
   pass. Do not truncate rights declarations to make them fit the old UI.
3. Keep format readability, platform signature validity, canonical preimage
   coverage, file comparison, and ledger chronology separate. A platform
   signature is not proof of authorship, ownership, or party consent.
4. Keep the bounded complete public manifest separate from the display model.
   Never hash the reduced/normalized display model as though it were the
   publisher's canonical input. Reject unsupported critical JWS extensions.
5. Require reviewed hash rules, public positive/negative vectors and independent
   publisher/Lens agreement before adding a cryptographic verification claim.
   Never trust manifest-selected algorithms, keys, or arbitrary fetch URLs.
6. Test UI, WebMCP and report parity. Reports must retain missing coverage and
   be bound to one record. Local file information stays private by default.

Publisher drift is a release gate: recheck it before every candidate is
approved. If a new publisher format is not yet verified by Lens, disclose that
limit and hold the affected release claim; do not claim automatic future
compatibility. A publisher change needs its own authorized task, not a covert
server change made to satisfy a Lens test.

## Current local-only stable release preparation

This clone is the post-contest development copy based on submitted main commit
`ffc720c1001ca6f123066cb456e507d2389cd1e1`. It has no remote. On September 29,
2026, after Devpost showed the contest closed and winners announced, the user
approved the post-contest v1.1.0 release. This worktree is the local stable
release preparation and has not been deployed. Work here, not in the submitted
checkout. This task does not authorize pushing, merging to the submitted
repository, changing production, creating a permanent v1.1.0 UCE record or
redirect, or modifying CbyUCE. Preserve submitted v1.0.0 and its published
evidence link; that historical record does not cover v1.1.0.

Run `npm run check` and focused real-browser/WebMCP checks before handoff. Keep
MPL-2.0, trademark and authorized-mark treatments intact. Do not copy proprietary
publisher implementation or configuration into this public-client project.
