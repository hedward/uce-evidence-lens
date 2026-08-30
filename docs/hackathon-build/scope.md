# UCE Evidence Lens — Scope

## Problem

Public UCE records contain technical evidence and human assertions, but a visitor must inspect several sources to understand what is cryptographically supported, independently timestamped, merely recorded, or unavailable.

## Audience and outcome

Creators, reviewers, counsel, journalists, and AI agents can inspect one public UCE record in a shared browser view and receive narrowly worded, reproducible checks. The result verifies evidence integrity where public inputs permit it; it never makes a legal determination.

## MVP

- Load the supplied public demonstration record from a reduced bundled fixture.
- Accept a supported CbyUCE verification URL, 64-character record hash, Arweave manifest URL, or pasted JSON.
- Validate untrusted JSON into a conservative internal record model.
- Display record facts, recorded assertions, chronology, source links, and per-check status.
- Fetch public Arweave manifests and JWKS material where CORS allows.
- Verify an ES256 compact JWS when its public JWK and signed hash payload are available.
- Hash a user-selected local file with SHA-256 without retaining or transmitting its contents.
- Register seven read-only WebMCP tools over the same application functions when supported.

## Non-goals

No record creation, uploads, accounts, payments, production APIs, server proxy, private repository dependency, proprietary verification reconstruction, legal advice, ownership/authorship determination, analytics, deployment, or Devpost submission.

## Demo success

A reviewer loads the public example, sees which facts are assertions, verifies the public signature, inspects the Arweave chronology, and compares a local file digest. An agent can perform the same read-only inspections through visible page-scoped tools.

## Constraints and wow moment

The app is static, browser-first, usable without WebMCP, and safe for sensitive local work. The wow moment is an agent narrating a defensible evidence result while the person sees the exact same statuses and limitations update on screen.
