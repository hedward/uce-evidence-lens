import { describe, expect, it, vi } from "vitest";
import type { AppState } from "../../src/app/controller";
import { RELEASE_VERSION } from "../../src/config/release";
import { demoRecord } from "../../src/records/demo";
import {
  createVerificationReport,
  DATED_SNAPSHOT_DISCLAIMER,
  REPORT_SCHEMA,
  REPORT_VERSION,
  serializeVerificationReport,
  VerificationReportError,
} from "../../src/reports/verification-report";
import type {
  EvidenceCheck,
  UceRecord,
  VerificationSnapshot,
} from "../../src/types/record";
import { verifyRecord } from "../../src/verification/evidence";

const completedAnchor: EvidenceCheck = {
  id: "independent_anchor",
  label: "Arweave chronology",
  status: "verified",
  explanation: "Public block metadata agreed with the record.",
  source: "https://arweave.net/example",
};

function stateWith(
  verification: VerificationSnapshot,
  record: UceRecord = structuredClone(demoRecord),
): AppState {
  return {
    record,
    verification,
    busy: false,
    webmcp: { status: "registered", detail: "Ready" },
  };
}

describe("dated verification reports", () => {
  it("captures the completed demo snapshot with versioning and a public recheck link", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-20T12:34:56.789Z"));
    try {
      const verification = await verifyRecord(demoRecord, completedAnchor);
      const report = createVerificationReport(stateWith(verification));

      expect(report).toMatchObject({
        reportSchema: REPORT_SCHEMA,
        reportVersion: REPORT_VERSION,
        createdAt: "2026-09-20T12:34:56.789Z",
        checkedAt: verification.checkedAt,
        verifierVersion: RELEASE_VERSION,
        recordBinding: verification.recordBinding,
        publicMetadata: { title: demoRecord.title },
        checks: verification.checks,
        coverage: verification.coverage,
        summary: verification.summary,
        legalNotice: verification.legalNotice,
        datedSnapshotDisclaimer: DATED_SNAPSHOT_DISCLAIMER,
        recheckLink: `https://uceevidencelens.com/#record=${encodeURIComponent(`${demoRecord.source}?format=json`)}`,
      });
      expect(report.datedSnapshotDisclaimer).toContain("unsigned report");
      expect(report.datedSnapshotDisclaimer).toContain(
        "not a new UCE certificate",
      );
      expect(report.datedSnapshotDisclaimer).toContain(
        "different verifier version",
      );
      expect(report.datedSnapshotDisclaimer).toContain(
        "gateway-index relationships",
      );
      expect(report).not.toHaveProperty("publicManifest");
      expect(report).not.toHaveProperty("authorName");
    } finally {
      vi.useRealTimers();
    }
  });

  it("copies retryable, unsupported, reported, and mismatch semantics without inventing passes", async () => {
    const original = await verifyRecord(demoRecord, completedAnchor);
    const statuses: EvidenceCheck[] = [
      {
        id: "network",
        label: "Public network check",
        status: "retryable",
        explanation: "The public endpoint was temporarily unavailable.",
      },
      {
        id: "profile",
        label: "Canonical profile",
        status: "unsupported",
        explanation: "No reviewed profile is available.",
      },
      {
        id: "file_anchor",
        label: "File transaction chronology",
        status: "reported",
        explanation: "This bundled relationship is gateway-reported.",
        chronologyProvenance: {
          referenceType: "bundled_item",
          transactionId: "A".repeat(43),
          rootTransactionId: "B".repeat(43),
          parentPath: ["A".repeat(43), "B".repeat(43)],
          block: {
            height: 1_234,
            hash: "block-hash",
            timestamp: "2026-09-30T12:00:00.000Z",
          },
          relationship: "gateway_index",
          indexSource: "https://turbo-gateway.com/graphql",
        },
      },
      {
        id: "integrity",
        label: "Integrity",
        status: "mismatch",
        explanation: "The values differ.",
      },
    ];
    const verification: VerificationSnapshot = {
      ...original,
      checks: statuses,
      summary: "An integrity problem was found. Review the mismatch below.",
    };

    const report = createVerificationReport(stateWith(verification));

    expect(report.checks).toEqual(statuses);
    expect(report.checks.map((check) => check.status)).toEqual([
      "retryable",
      "unsupported",
      "reported",
      "mismatch",
    ]);
    expect(report.summary).toBe(verification.summary);
    expect(report.checks[2]?.chronologyProvenance).toEqual(
      statuses[2]?.chronologyProvenance,
    );
  });

  it("keeps local details private by default and labels the manifest-authentication gap", async () => {
    const verification = await verifyRecord(demoRecord, completedAnchor);
    const secretDigest = "f".repeat(64);
    const state: AppState = {
      ...stateWith(verification),
      localFile: {
        name: "private-client-filename.png",
        bytes: 42,
        sha256: secretDigest,
        computedAt: "2026-09-20T10:00:00.000Z",
      },
      localComparison: {
        id: "local_file",
        label: "Selected local file digest",
        status: "mismatch",
        explanation: `The selected local file does not match the recorded SHA-256 digest for ${demoRecord.files[0]!.filename}.`,
      },
    };

    const defaultReport = createVerificationReport(state);
    const defaultJson = serializeVerificationReport(defaultReport);
    expect(defaultReport).not.toHaveProperty("localFile");
    expect(defaultJson).not.toContain("private-client-filename.png");
    expect(defaultJson).not.toContain(secretDigest);
    expect(defaultReport.localComparison).toMatchObject({
      status: "mismatch",
      explanation: expect.stringContaining(demoRecord.files[0]!.filename),
      binding: expect.stringContaining(
        "does not independently authenticate the manifest",
      ),
    });

    const optedIn = createVerificationReport(state, {
      includeLocalFileDetails: true,
    });
    expect(optedIn.localFile).toEqual(state.localFile);
    expect(serializeVerificationReport(optedIn)).toContain(
      "private-client-filename.png",
    );
  });

  it("never creates a public recheck link for pasted JSON", async () => {
    const record = {
      ...structuredClone(demoRecord),
      loadedFrom: "pasted_json" as const,
      source: "Pasted public JSON (not independently retrieved)",
      publicManifest: { privateContact: "person@example.test" },
    };
    const verification = await verifyRecord(record, completedAnchor);
    const report = createVerificationReport(stateWith(verification, record));

    expect(report).not.toHaveProperty("recheckLink");
    expect(serializeVerificationReport(report)).not.toContain(
      "person@example.test",
    );
  });

  it("rejects missing, busy, in-progress, and record-switched snapshots", async () => {
    const verification = await verifyRecord(demoRecord, completedAnchor);
    expect(() =>
      createVerificationReport({
        busy: false,
        webmcp: { status: "pending", detail: "Pending" },
      }),
    ).toThrow(VerificationReportError);
    expect(() =>
      createVerificationReport({ ...stateWith(verification), busy: true }),
    ).toThrow("Wait for the current record operation");
    expect(() =>
      createVerificationReport({
        ...stateWith(verification),
        verification: {
          ...verification,
          checks: [{ ...completedAnchor, status: "checking" }],
        },
      }),
    ).toThrow("Verification is still running");
    expect(() =>
      createVerificationReport({
        ...stateWith(verification),
        record: {
          ...structuredClone(demoRecord),
          manifestHash: "0".repeat(64),
        },
      }),
    ).toThrow("does not belong to the currently loaded record");
  });

  it("returns a deeply frozen clone that does not change with app state", async () => {
    const verification = await verifyRecord(demoRecord, completedAnchor);
    const state = stateWith(verification);
    const report = createVerificationReport(state);
    const serialized = serializeVerificationReport(report);

    verification.checks[0]!.explanation = "mutated after export";
    verification.coverage.limitations.push("mutated limitation");
    state.record!.title = "mutated title";

    expect(serializeVerificationReport(report)).toBe(serialized);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.checks)).toBe(true);
    expect(Object.isFrozen(report.checks[0])).toBe(true);
    expect(Object.isFrozen(report.coverage.limitations)).toBe(true);
    expect(JSON.parse(serialized)).toEqual(report);
  });
});
