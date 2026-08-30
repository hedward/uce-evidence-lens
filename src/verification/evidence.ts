import type {
  ChronologyItem,
  EvidenceCheck,
  LocalFileDigest,
  RecordedAssertion,
  RecordSummary,
  UcePublicKeySet,
  UceRecord,
  VerificationSnapshot,
} from "../types/record";
import { verifyEs256ManifestSignature } from "./crypto";

export const LEGAL_NOTICE =
  "This result verifies evidence integrity where stated; it is not a legal determination of identity, authorship, ownership, copyright validity, registration, or the truth of a recorded assertion.";

export function summarizeRecord(record: UceRecord): RecordSummary {
  return {
    id: record.id,
    title: record.title,
    schema: record.schema,
    schemaVersion: record.schemaVersion,
    source: record.source,
    fileCount: record.files.length,
    recordedManifestHash: record.manifestHash,
    arweaveTxId: record.arweaveTxId,
    legalNotice: LEGAL_NOTICE,
  };
}

export async function verifyRecord(
  record: UceRecord,
  publicKeys?: UcePublicKeySet,
): Promise<VerificationSnapshot> {
  const checks: EvidenceCheck[] = [
    {
      id: "schema",
      label: "Supported manifest schema",
      status: "passed",
      explanation: `The record was validated as ${record.schema} version ${record.schemaVersion}.`,
    },
    {
      id: "identifier",
      label: "Record identifier matches recorded hash",
      status: record.id === record.manifestHash ? "passed" : "failed",
      explanation:
        record.id === record.manifestHash
          ? "The supplied record identifier equals the manifestHash value recorded in the manifest."
          : "The supplied record identifier differs from the manifestHash value recorded in the manifest.",
    },
    {
      id: "canonical_manifest_hash",
      label: "Canonical manifest integrity",
      status: "unavailable",
      explanation:
        "The public record labels SHA-256 and RFC 8785, but the inspected public sources do not define which self-referential or post-anchor fields enter the digest. No local pass is claimed.",
    },
  ];

  if (record.platformSignature) {
    checks.push(
      publicKeys
        ? await verifyEs256ManifestSignature(
            record.platformSignature,
            record.manifestHash,
            record.platformKeyKid,
            publicKeys.keys,
          )
        : {
            id: "platform_signature",
            label: "Platform ES256 signature",
            status: "unavailable",
            explanation:
              "The record contains a signature, but matching public-key material is unavailable.",
          },
    );
  } else {
    checks.push({
      id: "platform_signature",
      label: "Platform ES256 signature",
      status: "unavailable",
      explanation:
        "The loaded record does not include a supported platform signature.",
    });
  }

  checks.push({
    id: "independent_anchor",
    label: "Independent chronology anchor",
    status:
      record.arweaveTxId && record.arweaveBlockTimestamp
        ? "passed"
        : "unavailable",
    explanation:
      record.arweaveTxId && record.arweaveBlockTimestamp
        ? `An Arweave block timestamp was located for transaction ${record.arweaveTxId}.`
        : record.arweaveTxId
          ? "An Arweave transaction is recorded, but an independent block timestamp was not loaded."
          : "No supported public chronology anchor was found.",
    source: record.arweaveTxId
      ? `https://arweave.net/${record.arweaveTxId}`
      : undefined,
  });

  if (
    record.serverHashMatches !== undefined ||
    record.serverSignatureValid !== undefined
  ) {
    checks.push({
      id: "server_verification_claim",
      label: "Publisher verification response",
      status: "recorded_assertion",
      explanation: `The public response reported hashMatches=${String(record.serverHashMatches)} and sigValid=${String(record.serverSignatureValid)}. Those server flags are recorded, not substituted for local checks.`,
      source: record.source,
    });
  }

  const passed = checks.filter((check) => check.status === "passed").length;
  const failed = checks.filter((check) => check.status === "failed").length;
  return {
    checks,
    summary: `${passed} locally performed check${passed === 1 ? "" : "s"} passed; ${failed} failed. Unavailable and recorded-assertion items are not counted as passes.`,
    legalNotice: LEGAL_NOTICE,
  };
}

export function inspectChronology(record: UceRecord): ChronologyItem[] {
  const items: ChronologyItem[] = [
    {
      label: "Claimed creation date",
      timestamp: record.creationDate,
      kind: "recorded_assertion",
      source: "manifest.work.creationDate",
      limitation:
        "This is a date asserted by the record; it is not independently proven.",
    },
    {
      label: "Manifest registration timestamp",
      timestamp: record.registrationTimestamp,
      kind: "system_event",
      source: "manifest.registrationTimestamp",
      limitation: "This is a timestamp recorded by the evidence system.",
    },
  ];
  record.audit.forEach((event) => {
    items.push({
      label: `Audit event: ${event.event}`,
      timestamp: event.at,
      kind: "system_event",
      source: `manifest.audit (${event.by ?? "unspecified actor"})`,
      limitation:
        "This event is recorded within the manifest and is not an independent timestamp.",
    });
  });
  if (record.arweaveBlockTimestamp && record.arweaveTxId) {
    items.push({
      label: "Arweave block timestamp",
      timestamp: record.arweaveBlockTimestamp,
      kind: "independent_anchor",
      source: `https://arweave.net/${record.arweaveTxId}`,
      limitation:
        "This locates the transaction in an external public ledger; it does not prove the claimed creation date.",
    });
  }
  return items;
}

export function listAssertions(record: UceRecord): RecordedAssertion[] {
  const assertions: RecordedAssertion[] = [
    {
      category: "authorship",
      label: "Author name",
      value: record.authorName,
      source: "manifest.work.authorName",
      limitation:
        "Recorded authorship assertion; not a determination of authorship or ownership.",
    },
    {
      category: "creation",
      label: "Creation date",
      value: record.creationDate,
      source: "manifest.work.creationDate",
      limitation:
        "Recorded creation-date assertion; not independently proven by this field.",
    },
  ];
  if (record.identityLevel) {
    assertions.push({
      category: "identity",
      label: "Identity assurance",
      value: `${record.identityLevel}${record.identityMethods.length ? ` via ${record.identityMethods.join(", ")}` : ""}`,
      source: "manifest.identity.assurance",
      limitation:
        "Recorded assurance metadata; it does not establish legal identity or authorship.",
    });
  }
  if (record.originalityOathAccepted !== undefined) {
    assertions.push({
      category: "authorship",
      label: "Originality oath",
      value: record.originalityOathAccepted
        ? "Recorded as accepted"
        : "Recorded as not accepted",
      source: "manifest.attestations.originalityOath",
      limitation:
        "Acceptance is recorded; the truth of the oath was not determined.",
    });
  }
  if (record.rightsConfirmed !== undefined) {
    assertions.push({
      category: "rights",
      label: "Rights confirmation",
      value: record.rightsConfirmed
        ? "Recorded as confirmed"
        : "Recorded as not confirmed",
      source: "manifest.attestations.rightsConfirmation",
      limitation: "This is a recorded declaration, not a legal determination.",
    });
  }
  if (record.policyLicense) {
    assertions.push({
      category: "rights",
      label: "Rights declaration",
      value: record.policyLicense,
      source: "manifest.policy.license",
      limitation:
        "This result reports the declaration and does not determine its validity or scope.",
    });
  }
  assertions.push({
    category: "ai_policy",
    label: "AI-use policy",
    value: `AI opt-out: ${String(record.aiOptOut)}; do-not-train: ${String(record.doNotTrain)}; rights: ${record.policyRights ?? "not recorded"}`,
    source: "manifest.policy",
    limitation:
      "These are recorded policy assertions; enforcement and legal effect are not determined.",
  });
  return assertions;
}

export function compareLocalDigest(
  record: UceRecord,
  local: LocalFileDigest | undefined,
  fileIndex = 0,
): EvidenceCheck {
  if (!local) {
    return {
      id: "local_file",
      label: "Selected local file digest",
      status: "not_performed",
      explanation:
        "Select a local file to compute its SHA-256 digest in this browser.",
    };
  }
  const recorded = record.files[fileIndex];
  if (!recorded) {
    return {
      id: "local_file",
      label: "Selected local file digest",
      status: "unavailable",
      explanation: `The record has no file at index ${fileIndex}.`,
    };
  }
  const matched = local.sha256.toLowerCase() === recorded.sha256.toLowerCase();
  return {
    id: "local_file",
    label: "Selected local file digest",
    status: matched ? "passed" : "failed",
    explanation: matched
      ? `The selected local file matches the recorded SHA-256 digest for ${recorded.filename}.`
      : `The selected local file does not match the recorded SHA-256 digest for ${recorded.filename}.`,
  };
}
