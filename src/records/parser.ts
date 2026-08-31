import type { UceAuditEvent, UceFileRecord, UceRecord } from "../types/record";
import {
  ValidationError,
  isArweaveId,
  isPlainObject,
  isSha256,
  optionalBoolean,
  optionalNumber,
  optionalString,
  requiredInteger,
  requiredObject,
  requiredString,
} from "../security/untrusted";

export interface ParseRecordOptions {
  source: string;
  loadedFrom: UceRecord["loadedFrom"];
  expectedId?: string;
  sourceArweaveTxId?: string;
}

function objectAt(
  parent: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return requiredObject(parent[key], key);
}

function optionalObject(
  parent: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return isPlainObject(parent[key]) ? parent[key] : {};
}

function stringArray(value: unknown, label: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20)
    throw new ValidationError(`${label} must be a small array.`);
  return value.map((item, index) =>
    requiredString(item, `${label}[${index}]`, 120),
  );
}

function parseFiles(value: unknown): UceFileRecord[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) {
    throw new ValidationError(
      "manifest.files must contain between 1 and 20 entries.",
    );
  }
  return value.map((item, index) => {
    const file = requiredObject(item, `manifest.files[${index}]`);
    const sha256 = requiredString(
      file.sha256,
      `files[${index}].sha256`,
      64,
    ).toLowerCase();
    if (!isSha256(sha256))
      throw new ValidationError(
        `files[${index}].sha256 is not a SHA-256 digest.`,
      );
    return {
      filename: requiredString(file.filename, `files[${index}].filename`, 300),
      bytes: requiredInteger(file.bytes, `files[${index}].bytes`),
      sha256,
      mimeType: optionalString(file.mimeType, `files[${index}].mimeType`, 150),
      clientReportedLastModified: optionalString(
        file.clientReportedLastModified,
        `files[${index}].clientReportedLastModified`,
        80,
      ),
    };
  });
}

function parseAudit(value: unknown): UceAuditEvent[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 50)
    throw new ValidationError("manifest.audit must be a small array.");
  return value.map((item, index) => {
    const event = requiredObject(item, `manifest.audit[${index}]`);
    return {
      event: requiredString(event.event, `audit[${index}].event`, 100),
      at: requiredString(event.at, `audit[${index}].at`, 80),
      by: optionalString(event.by, `audit[${index}].by`, 80),
      ref: optionalString(event.ref, `audit[${index}].ref`, 150),
    };
  });
}

function arweaveIdFromSource(source: string): string | undefined {
  try {
    const candidate = new URL(source).pathname
      .split("/")
      .filter(Boolean)
      .at(-1);
    return candidate && isArweaveId(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function optionalArweaveId(value: unknown): string | undefined {
  if (value === undefined || value === "") return undefined;
  const candidate = requiredString(value, "anchors.arweave.txId", 43);
  if (!isArweaveId(candidate))
    throw new ValidationError("Arweave transaction ID is malformed.");
  return candidate;
}

export function parseUceRecord(
  input: unknown,
  options: ParseRecordOptions,
): UceRecord {
  const root = requiredObject(input, "record");
  const manifest = isPlainObject(root.manifest) ? root.manifest : root;
  const verification = optionalObject(root, "verification");
  const schema = requiredString(manifest.schema, "manifest.schema", 100);
  const schemaVersion = requiredString(
    manifest.schemaVersion,
    "manifest.schemaVersion",
    40,
  );
  if (schema !== "uce.evidence.manifest" || schemaVersion !== "1.0.0") {
    throw new ValidationError(
      `Unsupported record schema: ${schema} ${schemaVersion}.`,
    );
  }

  const work = objectAt(manifest, "work");
  const hashes = objectAt(manifest, "hashes");
  const manifestHash = requiredString(
    hashes.manifestHash,
    "hashes.manifestHash",
    64,
  ).toLowerCase();
  if (!isSha256(manifestHash))
    throw new ValidationError("hashes.manifestHash is not a SHA-256 digest.");
  const anchors = optionalObject(manifest, "anchors");
  const arweave = optionalObject(anchors, "arweave");
  const signatures = optionalObject(manifest, "signatures");
  const identity = optionalObject(manifest, "identity");
  const assurance = optionalObject(identity, "assurance");
  const aiProvenance = optionalObject(manifest, "aiProvenance");
  const policy = optionalObject(manifest, "policy");
  const attestations = optionalObject(manifest, "attestations");
  const originalityOath = optionalObject(attestations, "originalityOath");
  const rightsConfirmation = optionalObject(attestations, "rightsConfirmation");
  const rightsInquiry = optionalObject(work, "rightsInquiry");
  const arweaveConfirmation = optionalObject(
    verification,
    "arweaveConfirmation",
  );
  const manifestConfirmation = optionalObject(arweaveConfirmation, "manifest");
  const recordedArweaveTxId = optionalArweaveId(arweave.txId);
  const sourceArweaveTxId =
    options.sourceArweaveTxId ?? arweaveIdFromSource(options.source);
  if (
    options.loadedFrom === "arweave" &&
    sourceArweaveTxId &&
    recordedArweaveTxId &&
    recordedArweaveTxId !== sourceArweaveTxId
  ) {
    throw new ValidationError(
      "The record's Arweave transaction ID does not match the loaded source transaction.",
    );
  }
  const arweaveTxId = sourceArweaveTxId ?? recordedArweaveTxId;

  return {
    id: options.expectedId?.toLowerCase(),
    source: options.source,
    loadedFrom: options.loadedFrom,
    schema,
    schemaVersion,
    manifestVersion: requiredInteger(
      manifest.manifestVersion,
      "manifest.manifestVersion",
      1,
    ),
    registrationTimestamp: requiredString(
      manifest.registrationTimestamp,
      "manifest.registrationTimestamp",
      80,
    ),
    generatedAt: optionalString(
      optionalObject(manifest, "generatedBy").generatedAt,
      "generatedBy.generatedAt",
      80,
    ),
    title: requiredString(work.title, "work.title", 500),
    authorName: requiredString(work.authorName, "work.authorName", 300),
    creationDate: requiredString(work.creationDate, "work.creationDate", 80),
    creationMode: optionalString(work.creationMode, "work.creationMode", 100),
    workCategory: optionalString(work.workCategory, "work.workCategory", 100),
    rightsInquiryUrl: optionalString(
      rightsInquiry.url,
      "work.rightsInquiry.url",
      500,
    ),
    files: parseFiles(manifest.files),
    manifestHash,
    hashAlgorithm: requiredString(
      hashes.algorithm,
      "hashes.algorithm",
      30,
    ).toLowerCase(),
    canonicalization: optionalString(
      hashes.canonicalization,
      "hashes.canonicalization",
      50,
    ),
    merkleRoot: optionalString(
      hashes.merkleRoot,
      "hashes.merkleRoot",
      64,
    )?.toLowerCase(),
    platformSignature: optionalString(
      signatures.platformSignature,
      "signatures.platformSignature",
      2_000,
    ),
    platformPublicKeyRef: optionalString(
      signatures.platformPublicKeyRef,
      "signatures.platformPublicKeyRef",
      100,
    ),
    platformKeyKid: optionalString(
      signatures.platformKeyKid,
      "signatures.platformKeyKid",
      150,
    ),
    arweaveTxId,
    reportedArweaveBlockTimestamp: optionalString(
      manifestConfirmation.blockTimestamp,
      "verification.arweaveConfirmation.manifest.blockTimestamp",
      80,
    ),
    reportedArweaveBlockHeight: optionalNumber(
      manifestConfirmation.blockHeight,
      "verification.arweaveConfirmation.manifest.blockHeight",
    ),
    identityLevel: optionalString(
      assurance.level,
      "identity.assurance.level",
      50,
    ),
    identityMethods: stringArray(
      assurance.methods,
      "identity.assurance.methods",
    ),
    identityVerifiedAt: optionalString(
      assurance.verifiedAt,
      "identity.assurance.verifiedAt",
      80,
    ),
    isAiAssisted: optionalBoolean(
      aiProvenance.isAIAssisted,
      "aiProvenance.isAIAssisted",
    ),
    humanCreatedPercentage: optionalNumber(
      aiProvenance.humanCreatedPercentage,
      "aiProvenance.humanCreatedPercentage",
    ),
    policyLicense: optionalString(policy.license, "policy.license", 200),
    policyRights: optionalString(policy.rights, "policy.rights", 200),
    aiOptOut: optionalBoolean(policy.aiOptOut, "policy.aiOptOut"),
    doNotTrain: optionalBoolean(policy.doNotTrain, "policy.doNotTrain"),
    audit: parseAudit(manifest.audit),
    originalityOathAccepted: optionalBoolean(
      originalityOath.accepted,
      "originalityOath.accepted",
    ),
    rightsConfirmed: optionalBoolean(
      rightsConfirmation.confirmed,
      "rightsConfirmation.confirmed",
    ),
    serverHashMatches: optionalBoolean(
      verification.hashMatches,
      "verification.hashMatches",
    ),
    serverSignatureValid: optionalBoolean(
      verification.sigValid,
      "verification.sigValid",
    ),
  };
}
