# Security Policy

## Supported scope

The current private-development MVP is the only supported version. It is a static, read-only verifier with no account, application server, or secret configuration. The repository has a private GitHub remote but no production deployment yet.

## Reporting

Before a public repository exists, report suspected vulnerabilities to the project owner through an approved private channel. Do not include private works, credentials, personal information, or production records in an issue. After publication, add an approved private security-advisory route before accepting external reports.

## Security guarantees and limits

- Local files are not uploaded by the application.
- Agent tools cannot select files or receive file contents.
- Remote retrieval is restricted to documented HTTPS public hosts.
- Public records and tool callers are untrusted and runtime-validated.
- Cryptographic success means only the named operation passed with supplied public material.
- Browser, dependency, public-gateway, and public-key compromise remain outside the application's guarantees.

## Production delivery

Cloudflare Pages serves only Vite's static `dist/` output. The repository intentionally excludes Pages Functions, Workers, server-side rendering, and proxies. `public/_headers` restricts scripts and styles to the application origin, network connections to approved public UCE sources, framing and sensitive browser capabilities, and referrer disclosure. The policy contains no `unsafe-inline`, `unsafe-eval`, or credentialed CORS exception.

See `docs/CLOUDFLARE-DEPLOYMENT.md` for deployment and verification procedures.

See `docs/THREAT-MODEL.md` for detailed trust boundaries and residual risks.
