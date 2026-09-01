# Cloudflare Pages Deployment

UCE Evidence Lens deploys as a static Cloudflare Pages application. It has no Pages Function, Worker, server-side rendering, proxy, database, or runtime secret. Vite copies `public/_headers` into `dist/_headers`, and Cloudflare Pages applies those rules to static responses.

## Architecture boundary

- Cloudflare Pages serves the compiled HTML, CSS, JavaScript, favicon, and `_headers` policy.
- The browser retrieves only approved public HTTPS records from `cbyuce.com` and `arweave.net`.
- Local files are hashed in browser memory and are never uploaded.
- CbyUCE remains hosted on Meteor Galaxy.
- CORS authorization for the final Evidence Lens origin, when approved, is an additive response-header change in the existing Galaxy JSON verification handler.
- Do not add a root `functions/` directory, `_worker.js`, generic proxy, Pages Plugin, or server-side fetch route.

## Pre-deployment verification

Use Node.js 24, pinned by `.node-version`:

```bash
npm ci
npm run check
test -f dist/_headers
test ! -e functions
test ! -e _worker.js
```

Review `dist/index.html` and `dist/_headers`. The production build must not contain secrets, credentials, private records, environment files, or source from the CbyUCE production application.

## Create the Pages project

In the Cloudflare dashboard:

1. Open **Workers & Pages** and choose **Create application → Pages → Connect to Git**.
2. Authorize only the `hedward/uce-evidence-lens` GitHub repository.
3. Use these build settings:

| Setting                | Value                  |
| ---------------------- | ---------------------- |
| Production branch      | `main`                 |
| Root directory         | repository root        |
| Build command          | `npm run build`        |
| Build output directory | `dist`                 |
| Node.js version        | `.node-version` → `24` |

4. Do not configure environment variables, bindings, Pages Functions, Workers, analytics, or Web Analytics.
5. Deploy and record the exact production URL issued by Cloudflare Pages.
6. Decide whether that `*.pages.dev` URL or a separately approved custom domain will be the permanent canonical origin.

Git-connected Pages projects accept private repositories, so the repository may remain private during the build. It must still be made public with its final approved open-source license before the contest submission.

## Production headers

`public/_headers` applies:

- a restrictive Content Security Policy with no inline-script or eval exception;
- outbound connections limited to the app itself, CbyUCE, and Arweave;
- `Origin-Agent-Cluster: ?1` so WebMCP registration and discovery run in an origin-keyed document;
- an explicit same-origin `tools` Permissions Policy;
- anti-framing, MIME-sniffing, referrer, permissions, and HTTPS protections;
- removal of Cloudflare Pages' default wildcard CORS header because this site is not a public API;
- long-lived browser caching only for Vite's fingerprinted `/assets/*` files.

Do not add `Access-Control-Allow-Credentials`. Do not add CORS headers to Evidence Lens as a workaround for reading CbyUCE: the server returning a resource controls whether browsers may expose that response.

## Post-deployment verification

Replace the example value with the canonical production origin:

```bash
UCE_LENS_ORIGIN="https://example.pages.dev"
curl -fsS --max-time 20 -D - -o /dev/null "$UCE_LENS_ORIGIN/"
curl -fsS --max-time 20 "$UCE_LENS_ORIGIN/" | grep -F "UCE Evidence Lens"
```

Confirm that the first response contains the CSP, `Origin-Agent-Cluster: ?1`, `Permissions-Policy` with `tools=(self)`, `Referrer-Policy: no-referrer`, HSTS, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`. Confirm that it does not expose `Access-Control-Allow-Origin: *`.

Then test in ChatGPT's in-app browser and WebMCP-enabled Chrome:

1. Load the bundled demonstration.
2. Confirm that all seven read-only WebMCP tools register and are returned by `document.modelContext.getTools()`.
3. Load a supported Arweave manifest URL, confirm its transaction binding, and confirm that any signature check uses only the reviewed platform-key registry.
4. Validate pasted public JSON.
5. Select a local file and confirm that only its metadata and digest enter application state.
6. Check mobile layout and keyboard navigation.

## Enable live CbyUCE loading

Only after the canonical production origin is final, add that exact origin to the narrowly scoped CORS response logic for:

```text
GET /verify/<64-character-hash>?format=json
```

The Galaxy response should add `Access-Control-Allow-Origin` for the one approved origin and append `Origin` to `Vary`. It must not add credentials, modify the JSON body, or affect HTML pages or other routes. Retain the bundled demo, Arweave, and pasted-JSON paths even after live loading succeeds.

## Rollback

Cloudflare Pages retains prior deployments. If verification fails, roll back to the last known-good static deployment. Removing the Galaxy response headers independently disables cross-origin CbyUCE loading without affecting the verification website or its JSON body.
