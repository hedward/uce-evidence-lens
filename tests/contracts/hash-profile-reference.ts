/** Draft contract laboratory only. NOT imported by the application. */
import { createHash } from "node:crypto";

export type Json = null | boolean | number | string | Json[] | JsonObject;
export type JsonObject = { [key: string]: Json };
export type Serializer = "standard-ecmascript-v1" | "extended-lexical-v1";
export const publisherRevision = "81abec2654ebd2f858ae4c6302a058ce7c1bb3de";
export const profiles = {
  "1.0.0": "cbyuce-standard-1.0-draft-20260920",
  "2.0.0": "cbyuce-standard-2.0-draft-20260920",
  "1.1.0": "cbyuce-extended-1.1-draft-20260920",
  "2.1.0": "cbyuce-extended-2.1-draft-20260920",
} as const;

export function object(value: Json | undefined): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A required public object is missing or malformed");
  }
  return value;
}

function required(source: JsonObject, keys: string[]): JsonObject {
  return Object.fromEntries(
    keys.map((key) => {
      if (!Object.hasOwn(source, key)) throw new Error(`Missing field: ${key}`);
      return [key, source[key]!];
    }),
  );
}

function optional(source: JsonObject, key: string): JsonObject {
  if (!Object.hasOwn(source, key)) return {};
  return { [key]: object(source[key]) };
}

function validateString(value: string): void {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new Error("Unpaired Unicode surrogate");
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new Error("Unpaired Unicode surrogate");
    }
  }
}

function validateJson(value: Json, depth = 0, seen = new Set<object>()): void {
  if (depth > 40) throw new Error("Contract fixture exceeds depth bound");
  if (typeof value === "string") validateString(value);
  else if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite number");
  } else if (value !== null && typeof value === "object") {
    if (seen.has(value)) throw new Error("Repeated/cyclic object reference");
    seen.add(value);
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (!Object.hasOwn(value, i)) throw new Error("Sparse array");
        validateJson(value[i]!, depth + 1, seen);
      }
    } else {
      if (Object.getPrototypeOf(value) !== Object.prototype) {
        throw new Error("Non-JSON object");
      }
      for (const key of Object.keys(value)) {
        validateString(key);
        // The historic object-building serializer loses this own property.
        // Do not silently reinterpret it as protected content.
        if (key === "__proto__") throw new Error("Unsupported legacy key");
        validateJson(value[key]!, depth + 1, seen);
      }
    }
  } else if (value !== null && typeof value !== "boolean") {
    throw new Error("Non-JSON value");
  }
}

function isArrayIndex(key: string): boolean {
  const index = Number(key);
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < 4294967295 &&
    String(index) === key
  );
}

export function canonicalText(value: Json, serializer: Serializer): string {
  validateJson(value);
  const write = (item: Json): string => {
    if (item === null || typeof item !== "object") return JSON.stringify(item);
    if (Array.isArray(item)) return `[${item.map(write).join(",")}]`;
    const keys = Object.keys(item).sort();
    const ordered =
      serializer === "standard-ecmascript-v1"
        ? [
            ...keys.filter(isArrayIndex).sort((a, b) => Number(a) - Number(b)),
            ...keys.filter((key) => !isArrayIndex(key)),
          ]
        : keys;
    return `{${ordered.map((key) => `${JSON.stringify(key)}:${write(item[key]!)}`).join(",")}}`;
  };
  return write(value);
}

/** Explicit draft selection; absence of a wire identifier is NOT release approval. */
export function draftProjection(
  manifest: JsonObject,
  assumedPublisherRevision: string,
): {
  profile: string;
  serializer: Serializer;
  preimage: JsonObject;
} {
  if (assumedPublisherRevision !== publisherRevision)
    throw new Error(
      "Explicit audited publisher revision required; schema version alone is insufficient",
    );
  validateJson(manifest);
  if (manifest.schema !== "uce.evidence.manifest")
    throw new Error("Unsupported schema");
  const version = manifest.schemaVersion;
  if (typeof version !== "string" || !Object.hasOwn(profiles, version))
    throw new Error("Unsupported version");
  const hashes = object(manifest.hashes);
  if (hashes.algorithm !== "sha256" || hashes.canonicalization !== "RFC8785")
    throw new Error("Unsupported hash labels");
  if (Object.hasOwn(hashes, "profile"))
    throw new Error("Wire profile not reviewed");
  if (
    typeof hashes.merkleRoot !== "string" ||
    !/^[a-f0-9]{64}$/.test(hashes.merkleRoot)
  )
    throw new Error("Invalid Merkle root");
  const extended = version === "1.1.0" || version === "2.1.0";
  const profile = profiles[version as keyof typeof profiles];
  const shared = {
    ...required(manifest, ["schema", "schemaVersion"]),
    ...optional(manifest, "source"),
    hashes: required(hashes, ["merkleRoot", "algorithm", "canonicalization"]),
    attestations: object(manifest.attestations),
  };
  if (extended) {
    if (object(manifest.recordDetails).format !== "extended-v1")
      throw new Error("Invalid extended marker");
    const anchors = object(manifest.anchors);
    const preimage = {
      ...shared,
      ...required(manifest, [
        "manifestVersion",
        "registrationTimestamp",
        "generatedBy",
        "files",
        "identity",
        "work",
        "policy",
        "aiProvenance",
        "recordDetails",
      ]),
      ...optional(manifest, "metadata"),
      anchors: optional(anchors, "fileStorage"),
    };
    return { profile, serializer: "extended-lexical-v1", preimage };
  }
  if (Object.hasOwn(manifest, "recordDetails"))
    throw new Error("Extended marker cannot downgrade to standard");
  if (!Array.isArray(manifest.files) || manifest.files.length !== 1)
    throw new Error("Standard recipe requires exactly one file");
  const file = object(manifest.files[0]);
  if (
    typeof file.bytes !== "number" ||
    !Number.isSafeInteger(file.bytes) ||
    file.bytes < 0
  )
    throw new Error("Invalid file size");
  if (typeof file.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(file.sha256))
    throw new Error("Invalid file digest");
  const assurance = object(object(manifest.identity).assurance);
  if (
    assurance.level !== "IAL1" ||
    !Array.isArray(assurance.methods) ||
    assurance.methods.length !== 1 ||
    typeof assurance.methods[0] !== "string" ||
    typeof assurance.verifiedAt !== "string"
  )
    throw new Error("Missing or unsupported identity recipe");
  return {
    profile,
    serializer: "standard-ecmascript-v1",
    preimage: {
      ...shared,
      files: [required(file, ["bytes", "sha256"])],
      identity: {
        assurance: required(assurance, ["level", "methods", "verifiedAt"]),
      },
      anchors: { arweave: { txId: "" } },
      audit: [],
      signatures: {
        platformSignature: "",
        platformPublicKeyRef: "dev-platform-key",
      },
    },
  };
}

export function digestText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function draftResult(
  manifest: JsonObject,
  assumedPublisherRevision: string,
) {
  const projection = draftProjection(manifest, assumedPublisherRevision);
  const canonical = canonicalText(projection.preimage, projection.serializer);
  return { ...projection, canonical, sha256: digestText(canonical) };
}
