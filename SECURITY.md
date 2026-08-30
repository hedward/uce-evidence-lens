# Security Policy

## Supported scope

The current local MVP is the only supported version. It is a static, read-only verifier with no account, server, or secret configuration.

## Reporting

Before a public repository exists, report suspected vulnerabilities to the project owner through an approved private channel. Do not include private works, credentials, personal information, or production records in an issue. After publication, add an approved private security-advisory route before accepting external reports.

## Security guarantees and limits

- Local files are not uploaded by the application.
- Agent tools cannot select files or receive file contents.
- Remote retrieval is restricted to documented HTTPS public hosts.
- Public records and tool callers are untrusted and runtime-validated.
- Cryptographic success means only the named operation passed with supplied public material.
- Browser, dependency, public-gateway, and public-key compromise remain outside the application's guarantees.

See `docs/THREAT-MODEL.md` for detailed trust boundaries and residual risks.
