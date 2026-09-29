# Candidate accessibility, browser and PDF checks

**Latest checkpoint: September 29.** The stable v1.1.0 pipeline and the
user-assisted VoiceOver listening check pass; see the follow-up below. Earlier
inconclusive listening attempts remain documented as history. Deployment
qualification is separate and still pending at this checkpoint.

Reviewed September 21, 2026 (final PDF timestamps are September 22 UTC).
Scope: isolated `codex/post-contest-v1.1.0` candidate, version `1.1.0-dev.0`,
based on `ffc720c1001ca6f123066cb456e507d2389cd1e1`. These results cover the
uncommitted candidate, not the frozen submitted site or a production deployment.

The release scope is classical Standard 1.0.0 and Extended 1.1.0 verification.
Hybrid/post-quantum 2.x cryptographic passes remain gated. Production PQ issuance
has not been activated; qualifying it is separate work, not a prerequisite for
this classical release.

## Outcome

Automated accessibility, keyboard/reflow, the tested Chromium surfaces and actual
Chrome PDF exports passed after the fixes below. **Human screen-reader listening
sign-off remains open.** Safari, Firefox, mobile-device browsers and Windows
assistive technologies were not qualified by this run. Do not extrapolate a
Chromium result into a cross-engine or WCAG-conformance claim.

No production deployment, publisher modification, permanent evidence record,
payment, commit, push or merge was performed in this QA pass.

## Issues fixed

- Asynchronous rendering previously discarded input drafts, open disclosures and
  keyboard focus. Invalid JSON could close its editor and leave focus on the
  document body. Drafts, selections, matching disclosures and focus now survive
  rerenders, with field-specific error associations and a persistent live region.
- The export privacy checkbox persists only for the same record and selected
  file. Changing either resets consent; loader disclosures are independent of it.
- The gold focus indicator and input borders lacked adequate contrast. They now
  use darker colors, with a light focus treatment on the dark local-file panel.
- Bundled-demo links in that panel inherited dark text against a dark background;
  their colors and spacing now keep links and the file-input label legible.
- Long unbroken titles now wrap; disclosures have a minimum 24-pixel target.
  An all-incomplete summary uses a neutral treatment, not a verified treatment.
- Printed reports use white page backgrounds, explicit margins and sensible
  break rules. Key provenance is expanded; individual metadata rows stay
  together without making an entire facts list unbreakable.
- Export help explains that embedded browsers may lack printing and points to
  Chrome or JSON export. A print-friendly DOM alone is not a successful PDF test.

## Automated checks

`npm run check` passes 388 tests across 21 files, plus formatting, ESLint,
TypeScript, hash-contract vectors, hybrid interoperability fixtures and the
production build. Twelve accessibility regression tests include three axe-core
semantic audits and focus, error, disclosure, live-region and privacy-state cases.
The jsdom audits deliberately disable color contrast because jsdom has no layout
engine; real-browser checks supply the separate contrast evidence.

axe-core 4.13.0 is a pinned development-only dependency. It is not bundled into
the application or fetched by users. Existing source-security and cryptographic
boundaries are unchanged by these UI fixes.

Final build assets: `index-CL1Rgv6A.js` and `index-EyOrT83y.css`. The browser
and PDF checks used those same assets; the last full pipeline reproduced them.

## Tested browser matrix

| Surface                                        | Observed result                                                                                                                                          | Qualification limit                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| macOS Google Chrome, reported Chromium 153     | Standard and Extended recomputation/ES256, Extended tamper detection, local PNG comparison, report controls and actual Save-as-PDF passed                | This installed desktop browser, not every Chrome version/platform     |
| Codex in-app browser, reported Chromium 153    | Standard/Extended/mismatch flows, keyboard recovery, local-file comparison, offline recovery, eight discovered WebMCP tools and actual tool calls passed | PDF printing returned `Printing is not available`; use Chrome or JSON |
| Safari, Firefox, Edge, iOS/Android and Windows | Not tested in this run                                                                                                                                   | Do not advertise them as release-qualified from this evidence         |

Both tested surfaces displayed eight registered tools. Actual WebMCP invocation
was exercised in the in-app browser; Chrome's registration badge alone is not
claimed as proof of an agent invocation in that surface.

The Chrome extension initially rejected automated file selection with
`fileChooser.setFiles failed` / `Not allowed`. After the user enabled the
extension's **Allow access to file URLs** permission, the same supported chooser
test succeeded. No permission bypass or Lens upload endpoint was introduced.
The public demo PNG (33,180 bytes) matched its recorded SHA-256:
`cbde70497c47fc1d2f4b8bb201572f1cacb31669e2c0d336e8bb51d0e3c149d0`.

The loopback preview was `http://127.0.0.1:5174/`. Localhost is intentionally not
authorized by the publisher's production CORS policy. These tests used the
bundled record, public Extended fixture and Arweave; the separately completed
September 21 candidate-origin CORS check remains separate evidence.

The final in-app console check was empty. Chrome recorded an access-to-storage
error attributed to an installed extension's content script, with duplicate
page-associated entries at the same timestamp. Lens does not call browser
storage APIs. This run does not claim a clean console for that extension-equipped
Chrome profile; no extensions were disabled to conceal the observation.

## Accessibility evidence

- Real in-app axe audits used WCAG 2 A/AA, 2.1 AA, 2.2 AA and best-practice tags.
  The actual gradient page had zero violations but contrast items needing manual
  review. Repeating with each gradient endpoint (`#eef1eb`, `#f6efe1`) temporarily
  substituted produced zero violations and zero incomplete items. Original styles
  were restored. Extended and mismatch states also passed endpoint audits.
- Chrome's Lens-only audit (`#app` and the skip link) returned zero violations and
  zero incomplete items at both endpoints. A full-page Chrome audit also saw an
  Adobe Acrobat extension-injected nested control; it is not Lens markup and was
  not altered or silently counted as a Lens defect.
- Real keyboard tests confirmed skip-to-main operation and invalid-JSON recovery
  with retained draft, open editor, focus and `aria-invalid`/error association.
- Viewports 320, 375, 768 and 1280 CSS pixels had no horizontal overflow. Actual
  Chrome zoom at 200% and 400% showed no clipped controls, titles or paragraphs;
  zoom was restored to 100%. These are reflow tests, not physical-device tests.
- Increased text spacing (1.5 line height, 0.12em letter spacing, 0.16em word
  spacing, 2em paragraph spacing) at 320 pixels remained usable without clipping.
  Reduced-motion emulation disabled transitions and was then reset.
- A 464-character unbroken title wrapped correctly. Input over the supported
  title limit was rejected with an editable retained draft instead of data loss.
- Offline simulation kept local hash/signature results and described the network
  chronology check as retryable, not a cryptographic failure. Network emulation
  was restored. No unsupported check was promoted into a pass.
- With explicit user approval, macOS VoiceOver was temporarily enabled and then
  restored to OFF. Spoken/caption output could not be reliably observed; this is
  **inconclusive**, not a passed screen-reader test.

Local audit summaries are in ignored `test-results/release-qa/`.

### Remaining listening check

A person using VoiceOver (or the intended assistive-technology/browser pair)
should complete this short check on the candidate before accessibility sign-off:

1. Use the skip link; confirm it reaches the main evidence content.
2. Navigate headings and form labels; confirm controls have useful names.
3. Open **Paste public JSON instead**, enter invalid JSON and submit. Confirm
   the error is announced, the draft remains, and the editor can be corrected.
4. Load a valid record. Confirm loading and final results are announced without
   repeatedly reading the entire page or losing the user's place.
5. Expand signing-key provenance; navigate report controls and the local-file
   label/checkbox. Verify disclosure state and focus survive a result refresh.
6. Open and cancel the print dialog; confirm focus returns to its trigger.

Record the OS/browser/reader versions and observations. PDF tagging was detected,
but tag quality, spoken reading order and PDF/UA conformance are not certified.

## Actual PDF exports

The application created each report through its real **Print / Save report as
PDF** action. The Standard sample was saved through Chrome's native print and
Save dialogs, not a reconstructed document. The opt-in and A4 stress samples
used Chrome's PDF engine on the same application-generated report DOM; only the
native dialog call was suppressed for those automated layout cases. A reload
restored native printing afterward.

| Sample                                    | Format                              | Result                                                                                                                                                                               |
| ----------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `output/pdf/uce-lens-standard-letter.pdf` | Letter, 3 pages, native Save-as-PDF | All checks, limited Standard coverage, expanded key provenance, comparison result and legal limits preserved                                                                         |
| `tmp/pdfs/local-details-opt-in.pdf`       | Letter, 3 pages, Chrome PDF engine  | Selected filename, all 64 digest characters, byte count and check time included only after explicit opt-in                                                                           |
| `output/pdf/uce-lens-mismatch-a4.pdf`     | A4, 2 pages, Chrome PDF engine      | Deliberately altered Extended fixture, conspicuous mismatch, independently checked signature distinguished from altered contents, missing checks retained, 464-character title wraps |

All eight pages were rendered and visually inspected. Text bounds remain inside
page bounds; no blank pages, clipped content or overlap were observed. Both
delivered PDFs pass `qpdf --check`, contain selectable text and links, report
tagging, and contain no PDF JavaScript. This is structural/layout verification,
not PDF accessibility certification.

The default PDF includes the **comparison outcome** but omits the selected
local filename and local digest. The public manifest's recorded filename can
still appear in the comparison explanation. The opt-in PDF contains the exact
selected metadata; switching to the Extended record cleared both file selection
and export consent. The WebMCP report separately omitted the local-file object.

Native print cancellation/saving returned focus to the export trigger and
removed the temporary report after `afterprint`. The pre-test printer destination
was restored, and the dialog canceled without sending a physical print job.

Artifact SHA-256 values:

```text
6eb5805eb1ac2887abb465a650f777ccfbf7eda19c77e7c75592dd5f26b59b54  uce-lens-standard-letter.pdf
dd4877dc81390803d4110f51945229d58117fdc9d91986876f1373cff5784d9f  uce-lens-mismatch-a4.pdf
aad394a9470551c4232e94d0d8f57c037b71312f24039c976c1ce7305a7e984b  local-details-opt-in.pdf
```

These dated QA examples are not new UCE certificates or evidence of a production
deployment. The mismatch sample is synthetic test data, not a defect reported
against the original public record. Generated files remain local and outside
the deployable `dist/` tree.

## Before release

Complete the listening check above; repeat a smoke check on the approved preview
with production headers and actual-origin retrieval; confirm publisher-contract
alignment, contest clearance and explicit release approval. Expand the browser
matrix before making additional browser/platform support claims. Do not merge,
deploy, activate PQ verification or overwrite v1.0.0 evidence solely on the basis
of this local QA result.

## September 22 follow-up

The requested retry produced the following evidence around 13:45–13:52 UTC:

| Check                              | Result                                                                                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pinned publisher contract          | Passed: same `81abec26…` revision, 23 fresh comparisons; no manifest/schema/hash/signing drift                                                                                                |
| Current public fixtures            | Standard 1.0.0 and Extended 1.1.0 API manifests match the reviewed fixtures except the known excluded self-anchor; Extended immutable bytes unchanged                                         |
| Live Extended browser verification | Local candidate retrieved the real Arweave manifest; recomputation and ES256 passed; chronology bound block 2,005,758 with 479 confirmations at observation                                   |
| Publisher-side CORS                | HTTP 200 JSON, exact candidate origin allowed, submitted origin still allowed, no allow-origin header for a lookalike origin; `Vary: Origin, Accept-Encoding`                                 |
| Approved preview                   | Blocked: browser `net::ERR_NAME_NOT_RESOLVED`, direct HTTPS request could not resolve host, Cloudflare resolver `1.1.1.1` returned `NXDOMAIN` for `uce-evidence.edyoungprojects.com`          |
| VoiceOver listening                | Still inconclusive: Settings toggled on, but the reader was reported not running; navigation produced no observable caption, and reader inspection returned `timeoutReached`; restored to OFF |

The CORS checks above are public HTTP response probes with explicit Origin
headers. They are **not** actual-origin browser retrieval. Because the approved
preview hostname did not resolve, its served build, production CSP/OAC/security
headers, WebMCP operation and end-to-end retrieval could not be verified in this
retry. No DNS, tunnel, deployment or production settings were changed to bypass
the problem. The user was asked to restore or confirm the approved preview URL.

The unchanged local candidate was used only to continue live Arweave and
screen-reader diagnostics. It does not replace the approved-preview release
gate. The VoiceOver failure is an observation/tool limitation, not evidence that
the application's screen-reader behavior passes or fails. A real listening
sign-off is still required. No application-source edits, commits, pushes,
merges, payments or permanent records were made during this follow-up.

### Restored preview: actual-origin smoke check

After the user restored `https://uce-evidence.edyoungprojects.com/`, the
September 22 retry around 13:57–14:03 UTC succeeded in the in-app Chromium 153
browser. Cloudflare's public resolver returned A records again; the terminal
resolver still failed temporarily. No resolver settings or host overrides were
changed. The following browser observations supersede the DNS blocker above:

- HTTPS document returned 200 with a valid secure connection.
- All eight WebMCP tools were discovered. Actual calls loaded Extended record
  `d16afb…`, ran verification and returned its dated report. The UI agreed.
- The consumer form loaded the separate Standard/Figma record `cc7680…`.
  Both this record and Extended were fetched from CbyUCE, with HTTP 200
  `application/json` and an exact
  `Access-Control-Allow-Origin: https://uce-evidence.edyoungprojects.com`.
  These were real requests from the preview document, not simulated Origin probes.
- Both live records independently passed manifest recomputation, ES256 and
  Arweave chronology. Extended bound block 2,005,758 (479 confirmations);
  Standard bound block 1,992,038 (14,202 confirmations) at observation.
  Publisher statements remained `reported`, not independently verified.
- The Standard report's check array exactly matched the verification result,
  used the correct record binding and omitted a local-file object. Extended
  likewise retained coverage limitations and separate signing-key provenance.
- The `cc94e8…` demo reference used bundled data, so its successful checks are
  not counted as a second live CbyUCE retrieval. Its direct chronology passed.
- The final preview console contained no warning/error entries. A visual
  viewport check showed the loaded record and usable form controls.

**Production-equivalent preview qualification is still open.** The live HTML
loads `/@vite/client` and `/src/main.ts`, not the tested packaged assets
`index-CL1Rgv6A.js` / `index-EyOrT83y.css`. Therefore this run cannot bind the
served development app to those exact production-build bytes. Its document
response also lacked the configured CSP, Origin-Agent-Cluster, Permissions-Policy,
Referrer-Policy, HSTS, X-Content-Type-Options, X-Frame-Options and
X-Permitted-Cross-Domain-Policies headers from `public/_headers`.

The preview additionally loaded a Cloudflare Insights beacon. The documented
production configuration excludes analytics; this injected script is another
preview/production difference, not an application-source change made by QA.

Next, with separate preview-hosting approval, serve the tested `dist/` artifact
under the approved origin with its real production header policy and no injected
analytics, then repeat this smoke check and compare deployed asset digests.

## September 29 stable release and listening check

Contest phase is closed; Devpost reports winners announced September 28 at
17:49:30 UTC. The user explicitly authorized updating the app. This does not
authorize editing the submitted contest entry or replacing its historical
v1.0.0 evidence. Remote main remains `ffc720c…` at the start of this release.

The stable `1.1.0` build passes formatting, lint, TypeScript, all 388 tests across
21 files, ten hash vectors/six serializer cases, hybrid laboratory interoperability
and production compilation. Assets are `index-MdW6D1b9.js` and
`index-EyOrT83y.css`. The publisher recheck passes all 23 comparisons with no
schema/hash/signing drift; runtime 2.x cryptographic passes remain gated.

The packaged build was served locally for a real, user-assisted listening check
in Chrome 154.0.8037.58 on macOS 26.7 (25G229), built-in VoiceOver version 10.
The user explicitly approved temporarily enabling VoiceOver, confirmed hearing
it through the speakers, and confirmed both groups of spoken results were clear:

- Skip activation focused `main`; form labels were exposed and announced.
- Invalid JSON announced the error, retained the exact draft and open editor,
  associated the error with the field, and returned focus to `record-json`.
- Correcting the input with the public Extended fixture announced the successful
  result; recomputation and ES256 passed without replacing missing chronology
  or identifier coverage with a false pass.
- Signing-key disclosure, the print control and local-file input were announced
  clearly, with no confusing focus jumps reported by the user.
- Chrome generated a two-page native print preview. Cancel returned focus to
  the print trigger, removed the temporary report, retained the key disclosure,
  and Tab reached the local-file input. No physical print job was sent.

VoiceOver's original OFF setting was restored and confirmed in System Settings.
Speech was heard and assessed by the user, not captured or independently heard
by the agent. This closes the scoped human listening gate, not a general
screen-reader, WCAG or PDF/UA certification. The earlier actual saved-PDF checks
remain separate evidence; this pass exercised native print cancellation.

Localhost tests are not evidence of production CORS or production headers.
The feature-branch packaged preview and final actual-origin smoke checks remain
required before the rollout is called complete.
Merely serving the `_headers` file through Vite does not enforce it. Do not weaken
the intended CSP to accommodate the development server or beacon. Human
screen-reader listening sign-off remains open; this network retry did not repeat
or complete it. No application, hosting, DNS, publisher or production settings
were modified, and no commit, push, merge or deployment was performed.
