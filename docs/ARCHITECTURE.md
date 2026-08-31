# Architecture

UCE Evidence Lens is a static, client-side application. Inputs flow through URL and JSON guards into a reduced record model. Pure verification functions emit typed evidence checks. The visible renderer and WebMCP adapter consume the same controller state, so agent results cannot outrun what the page can show. File bytes exist only within the event handler long enough for Web Crypto to calculate SHA-256. No application data is persisted.

Production delivery uses Cloudflare Pages only as a static asset host. `public/_headers` becomes `dist/_headers` during the Vite build and supplies the browser security policy. There is no Pages Function, Worker, proxy, server-side rendering path, database, or runtime secret. Browser retrieval remains limited to validated public CbyUCE and Arweave URLs; the bundled demonstration and pasted JSON remain independent recovery paths.

See `docs/hackathon-build/spec.md` for component contracts and `docs/VERIFICATION-MODEL.md` for the evidentiary semantics.
