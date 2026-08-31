# Demo Script

1. Open the app. Identify UCE Evidence Lens as an independent verifier developed by Copyright by UCE, point out the UCE Mark, and show that the bundled public example is already loaded. Confirm that the site-tool badge reports seven read-only tools in a compatible browser.
2. Ask the agent: “Summarize the loaded UCE record and separate verified checks from recorded assertions.”
3. Open **Verification checks**. Start with “No integrity problems found,” then highlight the verified schema, CbyUCE URL/hash identifier equality, ES256 signature, and direct Arweave transaction/block binding. Explain that “Try again” is a temporary network or confirmation state, while only “Mismatch” indicates conflicting evidence.
4. Expand **Technical details and publisher statements**. Show that independent manifest recomputation remains unsupported until CbyUCE publishes its hash profile, and that publisher results are clearly separated from browser verification.
5. Open **Chronology**. Contrast the claimed creation date, evidence-system events, and publisher-reported Arweave block timestamp. The direct block check confirms transaction chronology; it does not prove the claimed creation date.
6. Open **Recorded assertions**. Show that author, identity, originality, rights, and AI-policy values are never described as legal facts.
7. Select a known local file. Show that only filename, size, and SHA-256 appear, followed by verified or mismatch; the file is not uploaded.
8. Ask the agent to call `compare_local_file_to_uce_record`. Show that it can inspect only the already-selected digest result.
9. End on: “This result verifies evidence integrity; it is not a legal determination.”

Resilience paths: if WebMCP is unavailable, use the same visible controls. If live retrieval is unavailable, reload the bundled demo, use a supported Arweave URL, or paste public JSON. These paths preserve the demonstration without a proxy or server dependency.
