# Autonomous Build Checklist

Mode: autonomous.

Verification: automated after each milestone; no external publication actions.

Git cadence: focused local commits after clean milestones

- [x] **1. Verify independent baseline**
  Spec ref: `spec.md > Architecture`
  What to build: Validate repository, ignores, dependencies, types, and create the requested root commit.
  Acceptance: Correct project/branch; no private or generated material committed.
  Verify: `npm run build`, staged audit, secret-marker scan.

- [ ] **2. Lock scope and boundaries**
  Spec ref: `spec.md > Architecture`
  What to build: Planning, public/private boundary, verification, and threat-model documents.
  Acceptance: Non-goals and legal-language rules are explicit.
  Verify: Document review and link check.

- [ ] **3. Scaffold the static app**
  Spec ref: `spec.md > File structure`
  What to build: Vite, TypeScript, CSS, lint, format, and test foundation.
  Acceptance: Dev/build scripts work with no runtime dependency.
  Verify: `npm run build`, `npm run typecheck`, `npm run lint`.

- [ ] **4. Parse and validate public records**
  Spec ref: `spec.md > Data lifecycle`
  What to build: Reduced fixture, input classifier, URL allowlist, fetch adapter, runtime parser.
  Acceptance: Valid record accepted; malformed/oversized/unknown/hostile input rejected.
  Verify: Parser and network tests.

- [ ] **5. Implement evidence verification**
  Spec ref: `spec.md > Verification contracts`
  What to build: Hash, ES256 JWS, checks, chronology, assertions, and rights modules.
  Acceptance: Success/failure/unavailable results are reproducible and accurately worded.
  Verify: Crypto and tamper tests.

- [ ] **6. Build the visible inspector**
  Spec ref: `spec.md > Components mapped to PRD`
  What to build: Responsive semantic UI with summary, checks, chronology, assertions, sources, and recovery paths.
  Acceptance: Core workflow works without WebMCP; untrusted strings render as text.
  Verify: Integration tests and manual browser pass.

- [ ] **7. Add local-file comparison**
  Spec ref: `spec.md > Verification contracts`
  What to build: Explicit picker, local SHA-256, digest-only state, match/mismatch display.
  Acceptance: No file bytes or path are persisted, uploaded, or returned to agents.
  Verify: Match/mismatch unit and integration tests.

- [ ] **8. Add WebMCP tools**
  Spec ref: `spec.md > src/webmcp — Epic 5`
  What to build: Seven imperative read-only tools using current official syntax.
  Acceptance: Registration is feature-detected, top-level, idempotent, and visible.
  Verify: Unavailable, repeated-registration, schema, and tool-handler tests.

- [ ] **9. Harden and automate checks**
  Spec ref: `spec.md > Failure strategy`
  What to build: CI, security documentation, dependency/license audit, accessibility polish, complete edge-case suite.
  Acceptance: All automated checks pass with no secrets or prohibited dependencies.
  Verify: `npm run check` plus repository scans.

- [ ] **10. Prepare local submission materials**
  Spec ref: `spec.md > Public sources`
  What to build: README, architecture/demo docs, notice/trademark files, and publication-readiness report.
  Acceptance: Exact limitations and remaining external steps are documented.
  Verify: Clean checkout instructions and final file/dependency review.
