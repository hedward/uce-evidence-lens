# Approachable Evidence Lens design implementation

Reviewed November 4, 2026 (America/New_York).

The user approved implementing the reviewed design on a new branch from current
main. Branch: `codex/lens-approachable-design`, based on main and origin/main
`9e25e2761efc440567960bcec7259872f51c20e3`. The old
`codex/post-contest-v1.1.0` checkout was already merged and behind this baseline;
it was not used as the implementation base or modified.

This is a presentation update to the existing TypeScript/Vite DOM application.
Production deployment remains manual. No merge, deployment, publisher change,
new evidence record, package upgrade, or cryptographic qualification is included.
The release version and historical v1.0.0 evidence link remain unchanged.

## Implemented design

- Benefit-led entry with a persistent public-record label, immediate inspect and
  example buttons, accepted-input help, and a separate-service CbyUCE path.
- Eight directly selectable audience scenarios, including Influencers and
  clients, brands, publishers, and collaborators. Native buttons preserve
  selection and keyboard focus during background updates.
- Startup still loads the bundled example through the existing controller.
  Its full results stay behind an explicit exploration action on a first visit.
  Direct links and explicit record inspections go straight to results.
- Results distinguish the recorded claimant, individual check outcomes,
  source-reported chronology, local file comparison, and unresolved coverage.
  Successful checks have plain-language explanations with complete technical
  results retained in disclosures. There is no overall ownership/authenticity
  badge.
- Rights/training policies, AI assistance, creative-process text, and claimant
  adoption are separately displayed with exact values and source paths.
  Unknown, conflicting, false, absent, and unsupported data are not inferred to
  grant permission or prove the absence of AI assistance.
- Standard rights/AI exclusions remain beside those declarations. Extended
  coverage language requires the actual record-bound, successful reviewed hash
  result. Statements remain assertions even when covered by an integrity check.
- The first recorded file remains the browser comparison target. File contents
  stay local. The UI distinguishes this from public record/metadata retrieval.
- Reports retain the existing JSON structure, record binding, checks, coverage,
  print/PDF behavior, and explicit local-metadata consent. The UI identifies
  reports as unsigned dated snapshots, not certificates or declaration archives.
- Existing logo, green/paper palette, serif headings, authorized mark treatment,
  and separate CbyUCE relationship are retained. AI setup links follow the
  ordinary inspection task and avoid new availability or endorsement claims.

## Compatibility boundaries

The current publisher review is recorded in
[MANIFEST-COMPATIBILITY.md](MANIFEST-COMPATIBILITY.md). The selected publisher
contract, representative public records, and pinned contract comparison were
reviewed before declaration UI implementation. Current publisher source was
`01b861930e810d92f02994ffd2c2a81853116f0c`. The runtime qualification pin remains
`81abec2654ebd2f858ae4c6302a058ce7c1bb3de`.

No changes were made to the controller, startup loader, parser, accepted-source
rules, hash/signature algorithms or coverage, keys, chronology algorithms,
format adapters, APIs, WebMCP tool definitions/schemas, report model, network
restrictions, privacy defaults, dependencies, or deployment configuration.

New same-page navigation preserves the `#record=` reference while moving focus
to the intended section, including the skip link. Local comparison errors remain
visible beside the file task rather than inside the collapsed record form.
Regression tests cover both issues found during review.

## Validation

`npm run check` passed: formatting, ESLint, TypeScript, hash vectors, hybrid
interop fixtures, 462 tests across 23 files, and the production build.
The pinned publisher comparison separately passed 23 checks; 220 focused
contract tests passed. The 43 added tests cover declaration states, exact hostile
and long text, coverage gating, first-visit/direct-link behavior, audience
selection, input recovery, focus, background redraws, deep-link preservation,
and visibility of local-file errors.

Browser observations used both the development app and the local production
build. No production UI was changed. The local `/gpt/`, `/claude/`, and `/gemini/`
setup routes each returned HTTP 200 with the expected page title.

| Browser              | Observed coverage                                                                                                                                                                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome 156.0.8078.81 | Desktop/mobile entry, keyboard audience/example activation, demo inspection, Extended pasted JSON, full Arweave URL loading, unsupported-source recovery, share/copy/direct links, section focus without losing the record fragment, matching/mismatching local files, opt-in reset, report JSON, and all eight real WebMCP tools |
| Safari 27.0          | Native first visit, audience selection, demo inspection, hash/signature results and distinct checked versus gateway-reported chronology                                                                                                                                                                                           |
| Edge 156.0.4314.58   | Native first visit and demo inspection, hash/signature results and chronology display                                                                                                                                                                                                                                             |
| Firefox 159.0.1      | Native production-build first visit and demo inspection; actual print preview and saved five-page PDF inspection report                                                                                                                                                                                                           |

Chrome reflow checks at 320, 390, 768, 1440, and 1920 CSS pixels found no horizontal
overflow in the inspected result. A 200% root text-size check at 390px also had no
horizontal overflow. Reduced-motion emulation produced a zero-duration button
transition. Temporary text-size and media overrides were restored.

A real local file match produced no network request during the comparison
observation interval. A different selected file produced a mismatch, and choosing
it reset export metadata consent. Agent report output omitted the selected local
filename and digest. The actual JSON export blob retained unsigned snapshot
wording, unsupported and reported checks, and excluded local-file details by
default. Firefox's print preview retained coverage/provenance and saved a PDF.

The Chromium rendered axe scan reported no WCAG-tagged violations within the
application. A document-wide nested-interactive finding belonged to the installed
Acrobat extension widget outside the app. Axe left contrast over the gradient
background for manual review. Checked palette pairs ranged from 4.99:1 to 14.22:1
for text; the muted body text against the canvas measured 5.77:1. These checks do
not constitute a complete WCAG audit.

## Coverage limits and separate work

- Cross-browser depth differs as shown above. The entire regression matrix was
  not manually repeated in each browser. No mobile hardware, Windows screen
  reader, or full VoiceOver listening session was tested. Native accessibility
  trees, axe semantics, labels, keyboard focus, and status announcements were
  inspected; this is not a substitute for user testing with assistive technology.
- The existing application supports English and a light theme. No language or
  theme system was introduced. Finite tests cannot guarantee no regressions.
- CbyUCE's public API CORS is production-origin restricted. Current live product
  and public Standard/Extended API records were reviewed separately; local UI
  validation used bundled data, pasted Extended public JSON, and a live Arweave
  source. Local preview success is not a production deployment claim.
- A pre-existing controller issue can retain a previous local comparison after
  a later file-read failure. The new UI exposes the error, but does not change
  the controller or hide that result. A focused follow-up should define and test
  clearing or explicitly invalidating the stale comparison, including report and
  agent parity. That functional change requires separate approval.
- Browser file comparison still targets the first file. The existing agent
  comparison accepts a file index. No new multi-file selector was added.
- Legacy `listAssertions` tool output has narrower AI presentation than the new
  exact-value UI. Its schema and behavior are preserved. Improving those tool
  fields is a separate compatibility-reviewed task.
- Publisher `logic-pro` connector-source expansion is recorded as source drift,
  not treated as a newly qualified verification format or deployment proof.
- Release versioning and final production-origin checks belong to the user's
  manually controlled release. Historical v1.0.0 evidence does not cover this
  redesign.
