# ChatGPT integration public pages

Prepared September 30, 2026, following the user's selection of these four paths
on the existing website:

- `/gpt/`: introduction, preview connection instructions, current coverage.
- `/gpt/privacy/`: public-reference and result handling, recipients, retention,
  and user choices.
- `/gpt/terms/`: read-only scope, check limitations, unsigned reports, and terms.
- `/gpt/support/`: troubleshooting and the user-approved public contact,
  `support@universalcreationevidence.com`.

On September 30, 2026, the user confirmed that 5 Race Street LLC operates Lens
and that Copyright by UCE and CbyUCE are its legally registered alternate names.
The pages retain Copyright by UCE as the public-facing name and identify the
LLC and both alternate names in the privacy, terms, and support disclosures.
This records the user's confirmation; OpenAI business verification and its
accepted directory publisher name remain separate submission gates.
The user has no physical address to publish; none is invented here.
OpenAI's documented listing fields do not specify a public street address.
Any jurisdiction-specific operator disclosures remain part of publisher review.

## Implementation

Ordinary `public/gpt/**/index.html` files and one shared stylesheet are copied
unchanged into `dist/`. The existing root footer links to the overview. No new
runtime dependency, JavaScript, form, analytics, DNS, Worker, Function, database,
or paid service is introduced. Existing CSP, headers, historical evidence link,
verifier implementation, and license/mark treatment are preserved.

These pages describe the separately deployed Cloud Run integration. They do not
move browser verification to that backend. The current MCP endpoint remains
`https://uce-evidence-lens-zptt2ggs7a-uc.a.run.app/mcp`.

Cloud Run request-log exclusions and seven-day ordinary log retention are
grounded in the deployment record in the ChatGPT integration project. The
policy does not apply that duration to Google audit/operational data, ChatGPT,
public sources, saved reports, or support email. The public privacy notice
identifies provider handling separately. It promises no automatic mailbox
deletion schedule or guaranteed support response time.

## Validation

- `npm run check`: formatting, lint, TypeScript, reviewed contract fixtures,
  all 388 tests in 21 files, and production build passed.
- Production build repeated after the confirmed contact and final copy changes.
- Built HTML checks confirmed one H1 per page, no scripts/forms/placeholders,
  and valid local links and anchor destinations.
- Real in-app browser checks on the built preview confirmed the overview,
  navigation to privacy, terms, and support, and the exact support `mailto:`.
- Local 320-pixel iframe layout checks rendered all four pages without
  horizontal overflow (305-pixel content viewport after the scrollbar).
- The existing Lens app still rendered its demonstration and registered all
  eight read-only browser tools in the development preview; the new footer link
  was present. This is not a new full verifier or WebMCP qualification.
- Live pre-deployment root response confirmed Cloudflare hosting and the
  existing CSP, no-referrer, nosniff, anti-framing, and agent headers.

The narrow-layout harness was local-only in ignored build output. It is not
part of the committed source or production build. No claim of mobile-device
testing, screen-reader certification, real ChatGPT QA, or submission readiness
is made by these checks.

Before marking the public pages complete, verify the Cloudflare preview and
production deployment, all four URLs, page-specific content, support contact,
and security headers. Hosting the listing pages does not complete the MCP
host's OpenAI domain-verification challenge.

Production verification found Cloudflare's email obfuscation rewriting the
support address and injecting its decode script. The support contact is wrapped
in Cloudflare's documented `email_off` comments so it remains readable and
clickable without JavaScript. This is scoped to the public contact; no zone-wide
setting or security header is changed. The Cloudflare preview did not perform
this production-only rewrite, so verify the raw live HTML after deployment.

## References

- [OpenAI listing fields and domain verification](https://developers.openai.com/plugins/deploy/submission)
- [OpenAI final submission requirements](https://developers.openai.com/plugins/deploy/submission-errors)
- [Cloudflare Pages directory-index routing](https://developers.cloudflare.com/pages/configuration/serving-pages/)
