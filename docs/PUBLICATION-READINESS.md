# Publication Readiness Report

Status: **v1.0.0 release candidate with MPL-2.0 adopted; final public-release approval and submission steps remain.**

## Built and verified

- Static Vite/TypeScript SPA with no runtime npm dependency.
- Reduced public demo fixture; CbyUCE/Arweave/pasted-JSON loaders.
- Runtime validation, URL allowlist, input/response limits, safe DOM rendering.
- Browser SHA-256, trusted-registry ES256 compact-JWS verification, direct Arweave transaction/block chronology verification, conservative assertion/rights analysis, and local-file comparison.
- Seven imperative top-level WebMCP tools with exact schemas and read-only annotations.
- Automated test, lint, type, format, build, responsive, live-browser, and live-WebMCP checks.
- Static Cloudflare Pages configuration with a pinned Node.js runtime, restrictive response headers, and no server function or proxy.

## File groups requiring final review

- `src/records/demo.ts`, `NOTICE.md`: public-data redistribution and provenance.
- `src/verification/*`, `docs/VERIFICATION-MODEL.md`: cryptographic wording and evidentiary/legal accuracy.
- `src/components/render.ts`, `src/styles/main.css`, `TRADEMARKS.md`: copy, visual identity, trademark use, and accessibility.
- `src/webmcp/register.ts`: tool names/descriptions/schemas against final WebMCP behavior.
- `README.md`, `docs/DEMO-SCRIPT.md`: public claims, demo accuracy, and challenge messaging.
- `.github/workflows/ci.yml`: organization policy and action pinning before enabling GitHub Actions.
- `LICENSE`, `NOTICE.md`, `TRADEMARKS.md`: final license, separate mark treatment, and public-distribution accuracy.

## Dependency review

Production dependencies: none. Development dependencies are locked in `package-lock.json`: Vite, TypeScript, Vitest, jsdom, ESLint, `@eslint/js`, typescript-eslint, and Prettier. Their top-level package metadata reported MIT licenses except TypeScript, which reports Apache-2.0.

The complete lockfile contained license metadata for every installed package entry: MIT (138), MIT-0 (2), Apache-2.0 (16), BSD-2-Clause (8), BSD-3-Clause (3), ISC (8), MPL-2.0 (12), BlueOak-1.0.0 (2), and CC0-1.0 (1). `npm audit --audit-level=low` reported zero known vulnerabilities on 2026-08-31. License and advisory results must still be refreshed immediately before public release.

## Known limitations

- Live CbyUCE retrieval depends on the production endpoint continuing to authorize the deployed Evidence Lens origin through CORS; the bundled demo, direct Arweave input, and pasted-JSON paths remain resilience options.
- Canonical-manifest digest construction is not sufficiently public to reproduce honestly.
- Direct Arweave chronology uses a public gateway rather than a trustless light client. A pending transaction or temporarily unreachable gateway is retryable and is not presented as a mismatch.
- The trusted platform-key registry currently contains one reviewed active Copyright by UCE P-256 key. Rotation or revocation requires a reviewed application release; records cannot add trusted keys.
- Only schema `uce.evidence.manifest` version `1.0.0`, SHA-256 file digests, and ES256/P-256 compact JWS are supported.
- Local hashing uses browser memory and is capped at 512 MB.
- WebMCP availability depends on browser/app/model rollout; the normal UI remains available.

## Confirmed exclusions

No production source/history/package/API dependency, private record, private key, credential, environment value, account, upload, payment, authentication, analytics, backend, proxy, or server runtime is included. The authorized UCE Mark and bundled logo-and-tagline artwork are included under the separate treatment documented in `NOTICE.md` and `TRADEMARKS.md`; they are excluded from MPL-2.0. The private GitHub remote and static Cloudflare Pages configuration contain no production secret.

## Remaining external steps

1. Owner complete final review of the adopted MPL-2.0 license, separate trademark/authorized-mark treatment, public fixture redistribution, and evidentiary wording.
2. Re-run `npm ci`, `npm run check`, dependency audit/license inventory, repository-wide secret scan, staged review, and a clean-clone build.
3. Review the existing private GitHub repository configuration; configure branch protection and private vulnerability reporting. Do not enable unreviewed third-party actions.
4. Deploy the exact final release commit through Cloudflare Pages using `docs/CLOUDFLARE-DEPLOYMENT.md`, then retest HTTPS, headers, CORS, WebMCP, mobile, keyboard, and local-file workflows in the deployed origin.
5. Record a short video using `docs/DEMO-SCRIPT.md`; avoid showing private files, browser history, credentials, or unrelated tabs.
6. Prepare final Devpost copy/screenshots/video/repository/deployment links, recheck current rules and deadline, then submit only after explicit approval.
