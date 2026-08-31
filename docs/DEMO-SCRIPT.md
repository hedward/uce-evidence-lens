# Demo Script

1. Open the app. Identify UCE Evidence Lens as an independent verifier developed by Copyright by UCE, point out the UCE Mark, and show that the bundled public example is already loaded. Confirm that the site-tool badge reports seven read-only tools in a compatible browser.
2. Ask the agent: “Summarize the loaded UCE record and separate verified checks from recorded assertions.”
3. Open **Verification checks**. Highlight the locally passed schema, CbyUCE URL/hash identifier equality, and ES256 signature using the reviewed application-owned key registry. Highlight that canonical-manifest integrity and an independently retrieved ledger timestamp are unavailable rather than overstated.
4. Open **Chronology**. Contrast the claimed creation date, evidence-system events, and publisher-reported Arweave block timestamp. Show that the latter is an assertion, not an independent pass.
5. Open **Recorded assertions**. Show that author, identity, originality, rights, and AI-policy values are never described as legal facts.
6. Select a known local file. Show that only filename, size, and SHA-256 appear, followed by match or mismatch; the file is not uploaded.
7. Ask the agent to call `compare_local_file_to_uce_record`. Show that it can inspect only the already-selected digest result.
8. End on: “This result verifies evidence integrity; it is not a legal determination.”

Resilience paths: if WebMCP is unavailable, use the same visible controls. If live retrieval is unavailable, reload the bundled demo, use a supported Arweave URL, or paste public JSON. These paths preserve the demonstration without a proxy or server dependency.
