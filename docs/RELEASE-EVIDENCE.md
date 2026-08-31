# UCE Evidence Lens release evidence

The final public application release remains `1.0.0`. Its footer links the UCE
Mark and release label to this stable, versioned route:

```text
https://uceevidencelens.com/evidence/v1.0.0
```

That route is an external release pointer. It is intentionally not implemented
with a Pages `_redirects` file, Pages Function, Worker, or other file inside the
compiled site. Keeping the pointer outside the archive prevents the final
content-addressed CbyUCE URL from changing the site artifact it describes.

## Create the exact release artifact

Only package a clean committed worktree:

```bash
npm ci
npm run release:artifact
```

The command reruns the complete project check and creates:

```text
release-artifacts/uce-evidence-lens-site-v1.0.0.zip
```

The deterministic archive contains the compiled `dist/` site, release
provenance, and SHA-256 checksums. The command prints the archive digest, source
commit, byte size, and stable evidence route. Preserve those values with the
UCE Record.

## Register and bind the release

1. Upload the ZIP to CbyUCE and complete a UCE Record for **UCE Evidence Lens —
   Site Release v1.0.0**.
2. Save the UCE Certificate and the public `https://cbyuce.com/verify/<hash>`
   URL.
3. In Cloudflare, create an exact-path redirect for
   `/evidence/v1.0.0` to that public verification URL. Use a temporary redirect
   while validating it to avoid caching an incorrect destination.
4. Confirm the stable route opens the correct public record and does not accept
   wildcard subpaths.
5. Deploy the exact commit recorded in `RELEASE-EVIDENCE.json`, run the live
   verification checklist, and tag that commit `v1.0.0`.

The bundled logo-and-tagline record remains the in-app demonstration. The
footer release link points to the separate UCE Record for the complete site
release.
