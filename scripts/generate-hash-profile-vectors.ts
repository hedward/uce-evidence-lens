/** Synthetic, unsigned draft fixtures. Explicit --write required to regenerate. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { argv, stdout } from "node:process";
import { Buffer } from "node:buffer";
import { format } from "prettier";
import {
  canonicalText,
  digestText,
  draftResult,
  object,
  publisherRevision,
} from "../tests/contracts/hash-profile-reference.ts";
import type {
  Json,
  JsonObject,
  Serializer,
} from "../tests/contracts/hash-profile-reference.ts";

const timestamp = "2026-01-02T03:04:05.000Z";
const fileHash = digestText("hello");
const oath = {
  originalityOath: {
    accepted: true,
    textHash: digestText("UCE originality oath v1"),
    acceptedAt: timestamp,
  },
};

function synthetic(
  version: string,
  platform?: string,
  omitOptional = false,
  branded = false,
): JsonObject {
  const extended = version === "1.1.0" || version === "2.1.0";
  const copyright: JsonObject = {
    title: "Synthetic contract example — not an issued UCE record",
    authorName: "Example creator",
    creationDate: "2026-01-01",
    creationMode: "written",
    workCategory: "literary",
    rightsDeclaration: "all_rights_reserved",
    isWorkMadeForHire: false,
    ...(extended
      ? {
          recordDetailsFormat: "extended-v1",
          extendedRecordDetails: "Café / Café / 音楽 / 😀\nLiteral text only.",
        }
      : {}),
  };
  const source: JsonObject | undefined = platform
    ? {
        type: "connector",
        platform,
        connectorVersion: "1.0.0",
        intakeContractVersion: "1.0.0",
        ...(platform !== "figma" ? { originAssurance: "self_reported" } : {}),
      }
    : undefined;
  const upload: JsonObject = {
    fileName: "synthetic.txt",
    fileType: "text/plain",
    fileSize: 5,
    createdAt: timestamp,
    copyright,
    ...(source ? { source } : {}),
  };
  const attestations: JsonObject = structuredClone(oath);
  if (branded) {
    const statements = {
      claimantAdoption:
        "Synthetic claimant adoption statement; not a real attestation.",
      publicPermanence:
        "Synthetic permanence statement; nothing has been published.",
    };
    upload.flowVersion = "1.3.1";
    upload.authAssuranceMethod = "google_oauth";
    upload.attestation = { version: "1.3.1" };
    delete attestations.originalityOath;
    for (const [key, text] of Object.entries(statements)) {
      object(upload.attestation)[key] = {
        accepted: true,
        text,
        textHash: digestText(text),
        recordedAt: timestamp,
      };
      attestations[key] = {
        accepted: true,
        version: "1.3.1",
        text,
        textHash: digestText(text),
        acceptedAt: timestamp,
      };
    }
  }
  const manifest: JsonObject = {
    schema: "uce.evidence.manifest",
    schemaVersion: version,
    manifestVersion: 1,
    registrationTimestamp: timestamp,
    generatedBy: {
      application: "Synthetic contract generator",
      applicationId: "TEST-ONLY",
      version: "0.0.0",
      generatedAt: timestamp,
    },
    work: {
      title: copyright.title!,
      authorName: copyright.authorName!,
      creationDate: "2026-01-01",
      creationMode: "written",
      workCategory: "literary",
      alternativeTitles: [],
    },
    files: [
      {
        bytes: 5,
        sha256: fileHash,
        filename: "synthetic.txt",
        mimeType: "text/plain",
      },
    ],
    hashes: {
      merkleRoot: fileHash,
      algorithm: "sha256",
      canonicalization: "RFC8785",
      manifestHash: "",
    },
    identity: {
      assurance: {
        level: "IAL1",
        methods: [branded ? "google_oauth" : "authenticated_account"],
        verifiedAt: timestamp,
      },
    },
    attestations,
    aiProvenance: { isAIAssisted: false, humanCreatedPercentage: 100 },
    policy: {
      aiOptOut: true,
      doNotTrain: true,
      policyVersion: "1.0.0",
      effectiveAt: timestamp,
      license: "All Rights Reserved",
      robotsMeta: "noai, noimageai",
      rights: "TDM-RESERVED",
    },
    anchors: {
      arweave: { txId: "" },
      ...(!omitOptional
        ? {
            fileStorage: {
              provider: "arweave",
              txId: "X".repeat(43),
              contentHash: fileHash,
            },
          }
        : {}),
    },
    audit: [{ event: "synthetic.fixture", at: timestamp }],
    signatures: version.startsWith("2.")
      ? {
          classical: {
            algorithm: "ES256",
            jws: "NOT-A-SIGNATURE",
            publicKeyRef: "SYNTHETIC",
          },
          postQuantum: {
            algorithm: "ML-DSA-65",
            signature: "NOT-A-SIGNATURE",
            publicKeyRef: "SYNTHETIC",
          },
        }
      : {
          platformSignature: "NOT-A-SIGNATURE",
          platformPublicKeyRef: "SYNTHETIC",
        },
    ...(source ? { source } : {}),
    ...(version.startsWith("2.")
      ? {
          metadata: {
            createdWith: "Synthetic hybrid fixture",
            cryptoLibraries: { classical: "not-used", postQuantum: "not-used" },
          },
        }
      : {}),
  };
  if (extended) {
    const publicCopyright = structuredClone(copyright);
    delete publicCopyright.recordDetailsFormat;
    manifest.recordDetails = {
      format: "extended-v1",
      copyright: publicCopyright,
      license: "All Rights Reserved",
    };
  }
  const result = draftResult(manifest, publisherRevision);
  object(manifest.hashes).manifestHash = result.sha256;
  const mutations = [
    {
      id: "file-digest",
      path: ["files", "0", "sha256"],
      value: "f".repeat(64),
      changesHash: true,
    },
    {
      id: "work-author",
      path: ["work", "authorName"],
      value: "Changed claim",
      changesHash: extended,
    },
    {
      id: "license",
      path: ["policy", "license"],
      value: "Changed declaration",
      changesHash: extended,
    },
    {
      id: "filename",
      path: ["files", "0", "filename"],
      value: "changed.txt",
      changesHash: extended,
    },
    {
      id: "registration",
      path: ["registrationTimestamp"],
      value: "2000-01-01T00:00:00.000Z",
      changesHash: extended,
    },
    {
      id: "self-hash",
      path: ["hashes", "manifestHash"],
      value: "0".repeat(64),
      changesHash: false,
    },
    {
      id: "own-anchor",
      path: ["anchors", "arweave", "txId"],
      value: "Y".repeat(43),
      changesHash: false,
    },
    { id: "audit", path: ["audit"], value: [], changesHash: false },
    ...(extended
      ? [
          {
            id: "extended-details",
            path: ["recordDetails", "copyright", "extendedRecordDetails"],
            value: "Changed details",
            changesHash: true,
          },
        ]
      : []),
    ...(source
      ? [
          {
            id: "connector-version",
            path: ["source", "connectorVersion"],
            value: "9.9.9",
            changesHash: true,
          },
        ]
      : []),
    ...(version.startsWith("2.")
      ? [
          {
            id: "hybrid-metadata",
            path: ["metadata", "createdWith"],
            value: "Changed metadata",
            changesHash: extended,
          },
        ]
      : []),
  ].map((mutation) => {
    const modified = structuredClone(manifest);
    let parent: JsonObject | Json[] = modified;
    for (const key of mutation.path.slice(0, -1))
      parent = (parent as JsonObject)[key] as JsonObject;
    (parent as JsonObject)[mutation.path.at(-1)!] = mutation.value;
    const digest = draftResult(modified, publisherRevision).sha256;
    if ((digest !== result.sha256) !== mutation.changesHash)
      throw new Error(`Bad mutation: ${mutation.id}`);
    return { ...mutation, expectedSha256: digest };
  });
  return {
    id: `${version}-${platform || "base"}${omitOptional ? "-minimal" : ""}${branded ? "-current-attestations" : ""}`,
    kind: "synthetic-unsigned-hash-only",
    publisherInput: {
      upload,
      fileHash,
      merkleRoot: fileHash,
      generatedAt: timestamp,
      schemaVersion: extended
        ? version === "1.1.0"
          ? "1.0.0"
          : "2.0.0"
        : version,
    },
    manifest,
    expected: {
      ...result,
      canonicalUtf8Hex: Buffer.from(result.canonical, "utf8").toString("hex"),
    },
    mutations,
  };
}

const serializationInputs: { id: string; input: Json }[] = [
  { id: "integer-looking-keys", input: { "2": "two", "10": "ten", a: true } },
  { id: "nested-indices", input: { outer: [{ "2": null, "10": [] }, {}, ""] } },
  {
    id: "unicode-not-normalized",
    input: { composed: "é", decomposed: "é", emoji: "😀", cjk: "音楽" },
  },
  {
    id: "json-primitives",
    input: {
      z: null,
      empty: [],
      flag: false,
      zero: 0,
      negative: -0,
      fraction: 0.002,
      exponent: 1e-7,
    },
  },
  {
    id: "escape-control",
    input: { text: 'quote: " backslash: \\ newline:\n tab:\t' },
  },
  { id: "array-order", input: ["second", "first", null] },
];
const corpus = {
  format: "cbyuce.hash-profile-vectors.draft-1",
  publisherRevision,
  status:
    "DRAFT — synthetic, unsigned; not publisher-issued records or release approval",
  records: ["1.0.0", "2.0.0", "1.1.0", "2.1.0"]
    .map((version) => synthetic(version))
    .concat([
      synthetic("1.0.0", "figma"),
      synthetic("2.0.0", "pro-tools"),
      synthetic("1.1.0", "ableton"),
      synthetic("1.1.0", undefined, true),
      synthetic("1.0.0", undefined, false, true),
      synthetic("1.1.0", undefined, false, true),
    ]),
  serialization: serializationInputs.map(({ id, input }) => ({
    id,
    input,
    results: (
      ["standard-ecmascript-v1", "extended-lexical-v1"] as Serializer[]
    ).map((serializer) => {
      const canonical = canonicalText(input, serializer);
      return {
        serializer,
        canonical,
        canonicalUtf8Hex: Buffer.from(canonical, "utf8").toString("hex"),
        sha256: digestText(canonical),
      };
    }),
  })),
};
const path = new URL(
  "../tests/fixtures/hash-profiles/vectors.json",
  import.meta.url,
);
const output = await format(JSON.stringify(corpus), { parser: "json" });
if (argv.includes("--write")) {
  mkdirSync(new URL("../tests/fixtures/hash-profiles/", import.meta.url), {
    recursive: true,
  });
  writeFileSync(path, output);
} else if (readFileSync(path, "utf8") !== output)
  throw new Error("Vector drift: review before explicit --write regeneration");
stdout.write(
  `${corpus.records.length} synthetic records and ${corpus.serialization.length} serializer cases ${argv.includes("--write") ? "generated" : "reproduced"}.\n`,
);
