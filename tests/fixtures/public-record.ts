export const validPublicResponse = {
  manifest: {
    schema: "uce.evidence.manifest",
    schemaVersion: "1.0.0",
    manifestVersion: 1,
    registrationTimestamp: "2026-01-02T03:04:05.000Z",
    generatedBy: { generatedAt: "2026-01-02T03:04:06.000Z" },
    work: {
      title: "Synthetic public test record",
      authorName: "Example claimant",
      creationDate: "2026-01-01",
      creationMode: "human",
      workCategory: "text",
    },
    files: [
      {
        filename: "hello.txt",
        bytes: 5,
        sha256:
          "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
        mimeType: "text/plain",
      },
    ],
    hashes: {
      manifestHash:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      merkleRoot:
        "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      algorithm: "sha256",
      canonicalization: "RFC8785",
    },
    anchors: {
      arweave: { txId: "Oagba5o2yoEn-JT1C1RbVr0VVKdcxH797tHk9Xao8kg" },
    },
    audit: [
      {
        event: "manifest.generated",
        at: "2026-01-02T03:04:06.000Z",
        by: "system",
      },
    ],
    policy: {
      license: "All Rights Reserved",
      aiOptOut: true,
      doNotTrain: true,
    },
  },
  verification: { hashMatches: true, sigValid: true },
};
