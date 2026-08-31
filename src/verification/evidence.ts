import type {
  ChronologyItem,
  EvidenceCheck,
  LocalFileDigest,
  RecordedAssertion,
  RecordSummary,
  UceRecord,
  VerificationSnapshot,
} from "../types/record";
import { resolveTrustedPlatformKey } from "../security/trusted-platform-keys";
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
      status: record.id
        ? record.id === record.manifestHash
          ? "passed"
          : "failed"
        : "unavailable",
      explanation: !record.id
        ? "No independent manifest identifier was supplied for this record source."
        : record.id === record.manifestHash
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
    const resolution = resolveTrustedPlatformKey(record);
    if (resolution.status === "trusted") {
      const result = await verifyEs256ManifestSignature(
        record.platformSignature,
        record.manifestHash,
        record.platformKeyKid,
        [resolution.key.jwk],
      );
      checks.push(
        result.status === "passed"
          ? {
              ...result,
              explanation:
                "A trusted Copyright by UCE platform public key validated the ES256 signature over the recorded manifest hash.",
              source: resolution.key.approvalSource,
            }
          : result,
      );
    } else {
      checks.push({
        id: "platform_signature",
        label: "Platform ES256 signature",
        status: resolution.status,
        explanation: resolution.explanation,
      });
    }
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
    status: "unavailable",
    explanation: record.arweaveTxId
      ? "An Arweave transaction is recorded, but independent block metadata was not retrieved and bound to it."
      : "No supported public chronology anchor was independently retrieved.",
    source: record.arweaveTxId
      ? `https://arweave.net/${record.arweaveTxId}`
      : undefined,
  });

  if (record.reportedArweaveBlockTimestamp) {
    checks.push({
      id: "publisher_anchor_claim",
      label: "Publisher-reported Arweave timestamp",
      status: "recorded_assertion",
      explanation: `The record reports block timestamp ${record.reportedArweaveBlockTimestamp}. This browser did not independently retrieve or bind that value to the transaction.`,
      source: record.source,
    });
  }

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
    recordBinding: {
      source: record.source,
      manifestHash: record.manifestHash,
    },
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
  if (record.reportedArweaveBlockTimestamp) {
    items.push({
      label: "Publisher-reported Arweave block timestamp",
      timestamp: record.reportedArweaveBlockTimestamp,
      kind: "recorded_assertion",
      source: "verification.arweaveConfirmation.manifest.blockTimestamp",
      limitation:
        "This value came from the record and was not independently retrieved or bound to the transaction.",
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
