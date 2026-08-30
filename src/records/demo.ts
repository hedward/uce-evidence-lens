import type { UceRecord } from "../types/record";

export const DEMO_RECORD_ID =
  "5d476448cf9f05d1fd5d3b863f8a212732f1593d90dc63b292f557c28775a48f";

export const DEMO_VERIFICATION_URL = `https://cbyuce.com/verify/${DEMO_RECORD_ID}`;

export const demoRecord: UceRecord = {
  id: DEMO_RECORD_ID,
  source: DEMO_VERIFICATION_URL,
  loadedFrom: "bundled_demo",
  schema: "uce.evidence.manifest",
  schemaVersion: "1.0.0",
  manifestVersion: 1,
  registrationTimestamp: "2026-04-26T23:02:31.809Z",
  generatedAt: "2026-04-26T23:05:44.853Z",
  title:
    "Universal Creation Evidence (UCE) Symbol Mark, Usage Rules, and Dual-Site Implementation — Master Record v1.0",
  authorName: "5 Race Street LLC d/b/a Copyright by UCE and CbyUCE",
  creationDate: "2026-04-26",
  creationMode: "hybrid",
  workCategory: "audiovisual",
  rightsInquiryUrl: "https://cbyuce.com/rights/62808ab89119817c4c864fdb",
  files: [
    {
      filename: "UCE_Symbol_Master_Filing_v1_0_SIGNED_READY_FOR_CBYUCE.zip",
      bytes: 3318035,
      sha256:
        "4591bc72cc30a1fc97fd768ec8e0a1b0b271d8a5b0a1a6c62f166b3f545d5f44",
      mimeType: "application/zip",
      clientReportedLastModified: "2026-04-26T21:32:43.199Z",
    },
  ],
  manifestHash: DEMO_RECORD_ID,
  hashAlgorithm: "sha256",
  canonicalization: "RFC8785",
  merkleRoot:
    "4591bc72cc30a1fc97fd768ec8e0a1b0b271d8a5b0a1a6c62f166b3f545d5f44",
  platformSignature:
    "eyJhbGciOiJFUzI1NiIsImtpZCI6InBsYXRmb3JtLWNsYXNzaWNhbC0xNzYxMjc5NDcxMTA5IiwidHlwIjoiSldTIn0.XUdkSM-fBdH9XTuGP4ohJzLxWT2Q3GOykvVXwod1pI8.qWGgAyFZ4F0nrNp0QZrQd11BAudzwiD6lvzwpX-tXyNXfz-uFFp3G1d5ByHMlAeeEBVz422tbA94VixqpHyybA",
  platformPublicKeyRef: "8IQIcijOSMO0dtKrNsVPTFbJBGiIaL6x9EsUW4UdApQ",
  platformKeyKid: "platform-classical-1761279471109",
  arweaveTxId: "Oagba5o2yoEn-JT1C1RbVr0VVKdcxH797tHk9Xao8kg",
  arweaveBlockTimestamp: "2026-04-26T23:07:55.000Z",
  arweaveBlockHeight: 1905830,
  identityLevel: "IAL1",
  identityMethods: ["email_magic_link"],
  identityVerifiedAt: "2026-04-26T23:05:44.853Z",
  isAiAssisted: false,
  humanCreatedPercentage: 100,
  policyLicense: "All Rights Reserved",
  policyRights: "TDM-RESERVED",
  aiOptOut: true,
  doNotTrain: true,
  audit: [
    { event: "upload", at: "2026-04-26T23:02:31.809Z", by: "creator" },
    {
      event: "rights.confirmed",
      at: "2026-04-26T23:02:31.684Z",
      by: "creator",
    },
    {
      event: "payment.completed",
      at: "2026-04-26T23:05:44.645Z",
      by: "system",
    },
    { event: "file.stored", at: "2026-04-26T23:05:44.853Z", by: "system" },
    {
      event: "manifest.generated",
      at: "2026-04-26T23:05:44.853Z",
      by: "system",
    },
  ],
  originalityOathAccepted: true,
  rightsConfirmed: true,
  serverHashMatches: true,
  serverSignatureValid: true,
  publicKeys: {
    source: "https://arweave.net/8IQIcijOSMO0dtKrNsVPTFbJBGiIaL6x9EsUW4UdApQ",
    keys: [
      {
        kty: "EC",
        x: "D98fNCOR_D8zItMIBvujLV8tdE6C9FoOlDpX9yGSHOc",
        y: "7HDup_6Kppy_qluAc5X9NFHpGzotVv1MeydaAc6KqmA",
        crv: "P-256",
        kid: "platform-classical-1761279471109",
        use: "sig",
        alg: "ES256",
      },
    ],
  },
};
