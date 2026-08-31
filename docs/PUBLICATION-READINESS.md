# Publication Readiness Report

Status: **private MVP ready for owner, legal, public-data provenance, and production-deployment review; not yet approved for publication.**

## Built and verified

- Static Vite/TypeScript SPA with no runtime npm dependency.
- Reduced public demo fixture; CbyUCE/Arweave/pasted-JSON loaders.
- Runtime validation, URL allowlist, input/response limits, safe DOM rendering.
- Browser SHA-256, ES256 compact-JWS verification, chronology/assertion/rights analysis, and local-file comparison.
- Seven imperative top-level WebMCP tools with exact schemas and read-only annotations.
- Automated test, lint, type, format, build, responsive, live-browser, and live-WebMCP checks; the current baseline is 31 passing tests across six test files.
- Static Cloudflare Pages configuration with a pinned Node.js runtime, restrictive response headers, and no server function or proxy.

## File groups requiring final review

- `src/records/demo.ts`, `NOTICE.md`: public-data redistribution and provenance.
- `src/verification/*`, `docs/VERIFICATION-MODEL.md`: cryptographic wording and evidentiary/legal accuracy.
- `src/components/render.ts`, `src/styles/main.css`, `TRADEMARKS.md`: copy, visual identity, trademark use, and accessibility.
- `src/webmcp/register.ts`: tool names/descriptions/schemas against final WebMCP behavior.
- `README.md`, `docs/DEMO-SCRIPT.md`: public claims, demo accuracy, and challenge messaging.
- `.github/workflows/ci.yml`: organization policy and action pinning before enabling GitHub Actions.
- `docs/LICENSE-RECOMMENDATION.md`: counsel decision before adding a final `LICENSE`.

## Dependency review

Production dependencies: none. Development dependencies are locked in `package-lock.json`: Vite, TypeScript, Vitest, jsdom, ESLint, `@eslint/js`, typescript-eslint, and Prettier. Their top-level package metadata reported MIT licenses except TypeScript, which reports Apache-2.0.

The complete lockfile contained license metadata for every installed package entry: MIT (138), MIT-0 (2), Apache-2.0 (16), BSD-2-Clause (8), BSD-3-Clause (3), ISC (8), MPL-2.0 (12), BlueOak-1.0.0 (2), and CC0-1.0 (1). `npm audit` reported zero known vulnerabilities on 2026-08-30. License and advisory results must still be refreshed immediately before public release.

## Known limitations

- CbyUCE JSON lacked cross-origin permission during inspection. Until the final production origin receives narrowly scoped authorization, live retrieval may be unavailable; the bundled demo, Arweave, and pasted-JSON paths remain available.
- Canonical-manifest digest construction is not sufficiently public to reproduce honestly.
- The bundled Arweave timestamp is a public observed value; live generic Arweave loads may not include a block timestamp.
- Only schema `uce.evidence.manifest` version `1.0.0`, SHA-256 file digests, and ES256/P-256 compact JWS are supported.
- Local hashing uses browser memory and is capped at 512 MB.
- WebMCP availability depends on browser/app/model rollout; the normal UI remains available.

## Confirmed exclusions

No production source/history/package/API dependency, private record, private key, credential, environment value, account, upload, payment, authentication, analytics, backend, proxy, server runtime, or proprietary asset is included. The private GitHub remote and static Cloudflare Pages configuration contain no production secret. No production deployment or final software license exists yet.

## Remaining external steps

1. Owner/legal review the license candidate, patent implications, trademarks, public fixture redistribution, and all evidentiary wording.
2. Re-run `npm ci`, `npm run check`, dependency audit/license inventory, repository-wide secret scan, staged review, and a clean-clone build.
3. Review the existing private GitHub repository configuration; configure branch protection and private vulnerability reporting. Do not enable unreviewed third-party actions.
4. Connect the private repository to Cloudflare Pages using `docs/CLOUDFLARE-DEPLOYMENT.md`, deploy `dist/`, and retest HTTPS, headers, CORS, WebMCP, mobile, keyboard, and local-file workflows in the deployed origin.
5. Record a short video using `docs/DEMO-SCRIPT.md`; avoid showing private files, browser history, credentials, or unrelated tabs.
6. Prepare final Devpost copy/screenshots/video/repository/deployment links, recheck current rules and deadline, then submit only after explicit approval.
