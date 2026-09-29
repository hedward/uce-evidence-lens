# UCE Evidence Lens release evidence

The registered historical site evidence covers release `1.0.0`. The `1.1.0`
application keeps its footer linked to that historical record, explicitly
stating that the record does not cover the newer release. No `1.1.0` UCE Record
or evidence route is inferred from the application version.

```text
https://uceevidencelens.com/evidence/v1.0.0
```

That route is an external release pointer. It is intentionally not implemented
with a Pages `_redirects` file, Pages Function, Worker, or other file inside the
compiled site. Keeping the pointer outside the archive prevents the final
content-addressed CbyUCE URL from changing the site artifact it describes.

## Create the exact release artifact

The following is the record-creation runbook for the historical `1.0.0` release.
For a future record, substitute the intended release version and obtain separate
approval before uploading, paying, or creating permanent evidence. Publishing
the app does not itself authorize a new permanent UCE Record. Never overwrite
the historical `/evidence/v1.0.0` pointer with a different release's record.

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
provenance, the MPL-2.0 license, notice, separate trademark/authorized-mark
terms, and SHA-256 checksums. The command prints the archive digest, source
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
