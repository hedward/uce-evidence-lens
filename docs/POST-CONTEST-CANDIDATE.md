# Post-contest release preparation

Status on September 29, 2026: **stable v1.1.0 prepared; deployment qualification
in progress, not yet deployed**. The user explicitly authorized the post-contest
release. Devpost reports the contest closed and winners announced September 28.
The original September 20–22 checkpoints below are retained as dated history;
later entries in [release QA](RELEASE-QA.md) supersede their open gates.

## Isolation and baseline

- Separate Git clone, branch `codex/post-contest-v1.1.0`, no remote configured.
- Original checkout and public `main` remain at
  `ffc720c1001ca6f123066cb456e507d2389cd1e1`. Public `main` was checked using a
  read-only remote lookup on September 20.
- Original untracked `demo-video/` and `docs/DEMO-VIDEO-SHOT-LIST.md` are untouched
  and were not copied into this candidate.
- Live HTML observed on September 20 has SHA-256
  `97ad51e13915c5563c30cba9f07a86956fcbe8b8923f5066d2ee6ac0bce1d3b7`, referencing
  `index-CMBxzlkD.js` and `index-CSYHitqR.css`. This is a read-only observation,
  not proof of a Cloudflare deployment ID or its source-commit binding; that
  binding still needs confirmation before release.
- No production deployment, publisher changes, permissions/CORS changes, public
  repository changes, permanent records, or payments were made.

## Implemented here

1. Persistent contributor requirement in `AGENTS.md`: current CbyUCE manifests
   are authoritative, historical support is retained, and publisher drift is
   reviewed before each release.
2. Explicit read/display adapters for reviewed schema versions 1.0, 1.1, 2.0,
   and 2.1. Complete bounded public manifests are retained separately from the
   normalized display model. Extended rights text and connector provenance
   remain recorded assertions. Missing historical fields are not invented.
3. Signature checks cite the inspected record; reviewed key fingerprints,
   material and historical review references are separately labeled.
4. Summary limited to completed checks, with the manifest-content coverage gap
   visible outside collapsed details and included in agent/report output.
5. Strict recipient fragment links, startup/navigation handling, and copy UI.
   Links carry public references only; no local file information is included.
6. One immutable, record-bound report model; JSON export, print/Save-as-PDF
   layout, and an eighth read-only WebMCP tool,
   `get_uce_verification_report`. Reports are unsigned dated inspections, not
   UCE certificates. Local filename/digest details are opt-in for UI export and
   always excluded by the report tool.
7. Critical JWS extension and format-downgrade guards. Existing flat ES256
   verification remains supported; newer cryptographic profiles do not inherit
   a legacy pass.
8. Candidate version/footer distinguishes this build from historical v1.0.0
   evidence. MPL-2.0, trademark notices, mark assets and production security
   headers are preserved. Third-party MIT notices accompany the new bundled
   post-quantum dependency.

## Verification performed

- At the September 20 checkpoint, the then-current formatting, lint, TypeScript,
  test and production-build pipeline passed **118 tests across 13 files**. This
  is historical checkpoint evidence, not a current suite count.
- Tests cover all recognized read formats, legacy omissions, long license
  text, raw Arweave self-anchor handling, malformed inputs, critical-header
  rejection, provenance, report privacy/snapshot binding, record-switch races,
  and recipient navigation/recovery. Existing offline/pending/confirmed/
  mismatch tests remain in the suite.
- Real local in-app browser discovered eight WebMCP tools and invoked the
  report and local comparison tools successfully. The public demo PNG matched
  its recorded SHA-256; the agent report omitted the local-file detail object.
- Fresh-tab Arweave recipient link loaded the real logo record. Direct public
  gateway chronology verification succeeded.
- Invalid recipient fragments showed a precise error without silently loading
  the demo. Copy-link interaction worked.
- Mobile viewport check found no horizontal overflow; coverage and sharing UI
  were visually inspected.
- JSON export produced valid downloaded reports with all checks and missing
  coverage intact. Print DOM tests include all checks and expand key provenance;
  actual Chrome Letter/A4 PDF export and pagination now pass, including local-file
  privacy defaults and explicit opt-in. See the September 21
  [accessibility, browser and PDF checks](RELEASE-QA.md).
- A direct read of the deployed CbyUCE demo JSON confirmed schema 1.0.0 and the
  current `{manifest, verification}` envelope. The implemented newer publisher
  formats were reviewed at the revision pinned in
  [manifest compatibility](MANIFEST-COMPATIBILITY.md); their feature flags and
  actual deployment were not inferred from the local checkout.

## Remaining release gates

### Standard positive-only and hybrid preparation (September 21)

The reviewed Standard `1.0.0` public projection now supports a **positive-only**
local recomputation: a match covers its explicitly limited fields, while a
non-match is unresolved because earlier records may not preserve the original
preimage timestamp. Work/title, license/policy, AI disclosures, file names and
other descriptors are outside that projection. It is not full-content
authentication. Publisher `hashMatches` remains a reported flag, not a substitute.

A separate local hybrid engine checks ES256 and ML-DSA-65 against reviewed
public keys over the same 32-byte recorded hash. The existing immutable public
JWKS supplies the pinned 1,952-byte ML-DSA-65 key (SHA-256
`57e679254e52c8a546fccae09c4c269943e1b01a6003ca7c98ce5261aabe009b`).
Synthetic in-memory signatures generated with the publisher's installed
`@noble/post-quantum@0.4.1` verify with this client's `0.7.1` implementation
and Node 24 native ML-DSA. That proves library interoperability for the tested
bytes, **not** issuance or production qualification. No genuine publisher-issued
public `2.0.0` or `2.1.0` record has been identified. The runtime qualification
list remains empty, so neither hybrid version receives a cryptographic pass or
2.x hash-recomputation pass. See [hybrid qualification](hash-profiles/HYBRID-QUALIFICATION.md).

The publisher's public verification route currently special-cases `2.1.0` but
may send `2.0.0` through its flat-signature branch. This is a separate publisher
issue to test with a genuine public record; this candidate does not change
the publisher or treat its `sigValid` flag as independent proof.

### Extended runtime checkpoint (September 21)

The [production-fixture checkpoint](hash-profiles/EXTENDED-1.1-VERIFICATION.md)
now implements and tests local 1.1.0 recomputation and critical-profile ES256.
It supersedes the disabled-runtime statements in the historical September 20
checkpoint below. Hybrid issuance qualification, historical reconstruction and
future explicit profile issuance remain separate work. The user deployed the
separately prepared candidate-origin CORS fix, and the September 21 recheck
confirmed HTTP 200 JSON with the exact candidate origin and `Vary: Origin`.
Localhost remains excluded. No submitted-site merge or deployment is authorized.

### Hash-contract preparation checkpoint (September 20)

The [current/forward hash contract](hash-profiles/CURRENT-AND-FORWARD-CONTRACT.md)
and [verification package](hash-profiles/VECTOR-VERIFICATION.md) now document
four exact draft recipes, ten synthetic records and six serializer edge cases.
Twenty-two comparisons against pinned publisher functions passed, and the suite
at that September 20 checkpoint passed **263 tests across 14 files**. Runtime
recomputation was still disabled at that checkpoint; the Extended `1.1.0` and
positive-only Standard `1.0.0` changes above supersede that historical state.
Prioritize extended/current and future issuance;
do not build a historical timestamp-recovery or migration system.

The current publisher profiles are documented, not changed. Future explicit
hash-bound profile/version decisions still require publisher approval, public
representative records and paired runtime verification review.

### Historical release gates (September 22)

- Recheck latest contest guidance and obtain user release approval. September
  23/24 is a planning window, not automatic authorization. No push or merge
  into the submitted repository while frozen.
- Confirm the actual deployed commit/Cloudflare deployment and the promotion
  mechanism. Test a separate approved preview before merging if main auto-deploys.
- CbyUCE's production-origin CORS policy excludes localhost. The local CbyUCE
  recipient-link test therefore correctly displayed a retrieval error. Do not
  widen production CORS to hide this. Actual-origin Standard and Extended CbyUCE
  retrieval passed on the restored preview on September 22. Its Vite development
  modules and missing production headers still require a packaged-artifact
  preview test. Arweave and public-JSON alternatives work.
- For a later PQ-enabled release, validate both hybrid formats against publisher-issued public fixtures, not
  only synthetic compatibility and cryptographic interoperability tests. Keep
  runtime `2.0.0`/`2.1.0` signature and hash passes gated until paired publisher/Lens
  review establishes the exact bytes, key history, negative cases and coverage.
  These are deferred hybrid-release gates, not blockers for the classical
  Standard 1.0.0 / Extended 1.1.0 release scope.
- Extended 1.1.0 recomputation and critical-profile ES256 pass local checks;
  production rollout remains separately approved. Standard 1.0.0 is positive-only
  and much narrower. Hybrid public records, key rotation and 2.x runtime qualification
  remain follow-up gates.
- Keyboard/reflow, real Chrome PDF pagination/export and the tested Chromium
  browser paths now pass; 388 automated tests pass. Complete human screen-reader
  listening sign-off and the approved-preview smoke test. Safari/Firefox/mobile
  and Windows are not qualified by this run. See [release QA](RELEASE-QA.md).
  Large-file incremental hashing/cancel,
  rights-history and native DAW integrations remain later work.
- Finalize the stable version and exact release artifact only after approval;
  create a new site-release UCE record then. Preserve submitted `/evidence/v1.0.0`.

### September 29 release preparation

- Contest clearance and explicit user release approval are recorded.
- Publisher compatibility was rechecked at the same pinned revision: all 23
  comparisons passed; only classical 1.0.0/1.1.0 claims are enabled.
- Stable v1.1.0 passes all 388 tests and the complete check/build pipeline.
- User-assisted VoiceOver listening passed the exercised labels, error recovery,
  valid result, provenance, print and local-file controls. VoiceOver was restored
  to OFF. This is a scoped check, not a WCAG or PDF/UA certification.
- The historical v1.0.0 footer evidence remains explicitly historical. No new
  permanent UCE Record or version-specific redirect has been created.
- The Git-connected Cloudflare Pages preview and production-origin smoke checks
  remain required before declaring the rollout complete.

This candidate establishes the first recipient-workflow and compatibility
milestone. It does not claim the entire roadmap or release gate is complete.
