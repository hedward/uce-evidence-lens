# Arweave bundle chronology — release 1.1.2

The file-date checker now recognizes Arweave bundled data items. The old checker
queried their identifiers as top-level transactions and reported 404 as a generic
retryable failure. Both the website (including WebMCP/reports) and ChatGPT use the
same versioned verifier source.

On a status 404, a fixed GET query to `https://turbo-gateway.com/graphql` discovers
the immediate parent. Validated parent IDs are followed up to four levels, with
cycle detection and a 25-second total chronology deadline. Status responses are
bounded to 16 KiB, index responses to 64 KiB, and blocks to 2 MiB. Root transaction
status, block identity/height and transaction membership must agree, as must any
indexed block metadata. Original file content and full bundles are not fetched.

The first Cloud Run check of 1.1.1 exposed a separate HTTP 429 response from
arweave.net even though browser requests succeeded. Release 1.1.2 adds one fixed
Turbo Gateway fallback for status/block HTTP 429 or 5xx responses, using the same
validation and total deadline. Pending, missing, malformed, redirected or
conflicting evidence is not bypassed. Results cite the actual metadata source.
The fallback uses no new infrastructure or original-file downloads.

Direct top-level transaction checks retain their existing gateway-metadata
verification scope. Bundled item dates have `reported` status and preserve the
item, parent path, root transaction, block and source. They never become a
cryptographic item-inclusion pass. Their date is the block's recorded timestamp,
not an exact upload instant, creation date or proof of recorded claims. Genuine
rate limits, pending transactions and network failures remain retryable;
malformed, cyclic and excessive-depth relationships remain unsupported.

The real Extended sample's file maps to parent
`3AMd3Dlx_0yWt77XY_MPupiERPQAGaGYM86Vzg_PtGk`, block 2,005,758,
2026-09-21T21:08:55Z. Public metadata captured on October 1 is retained in the
fixture. The browser preview also resolved the Standard bundled demo's file to
block 1,991,553 at 2026-08-31T21:26:24Z, separately from its manifest's earlier
block. These are observed records, not automatic qualification of future formats.

Validation includes direct and bundled records, nested/cyclic/deep parents,
invalid index identifiers, index/block disagreement, missing root membership,
404/429/pending responses, response size/redirect rejection, independent file
binding, report preservation and UI/WebMCP parity. The publisher contract check
passed all 23 comparisons. Deployment observations are recorded separately;
source checks alone do not establish production behavior.

Protocol references: [ANS-104](https://github.com/ArweaveTeam/arweave-standards/blob/master/ans/ANS-104.md)
and [ar.io index API](https://docs.ar.io/apis/ar-io-node/index-querying).
