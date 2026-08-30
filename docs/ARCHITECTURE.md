# Architecture

UCE Evidence Lens is a static, client-side application. Inputs flow through URL and JSON guards into a reduced record model. Pure verification functions emit typed evidence checks. The visible renderer and WebMCP adapter consume the same controller state, so agent results cannot outrun what the page can show. File bytes exist only within the event handler long enough for Web Crypto to calculate SHA-256. No application data is persisted.

See `docs/hackathon-build/spec.md` for component contracts and `docs/VERIFICATION-MODEL.md` for the evidentiary semantics.
