import { describe, expect, it } from "vitest";
import production from "../fixtures/extended-production.json";
import productionVector from "../fixtures/extended-production-vector.json";
import vectors from "../fixtures/hash-profiles/vectors.json";
import { parseUceRecord } from "../../src/records/parser";
import { parseStrictJson } from "../../src/security/strict-json";
import { verifyRecord } from "../../src/verification/evidence";
import {
  canonicalExtendedJson,
  extendedHashInput,
  verifyManifestHash,
  validateExtendedDetails,
} from "../../src/verification/manifest-hash";
import { AppController } from "../../src/app/controller";
import { createToolDefinitions } from "../../src/webmcp/register";
import { createVerificationReport } from "../../src/reports/verification-report";
import {
  draftResult,
  publisherRevision,
  type JsonObject,
} from "../contracts/hash-profile-reference";
import { sha256Bytes } from "../../src/verification/crypto";

const id = production.hashes.manifestHash;
const source = `https://cbyuce.com/verify/${id}?format=json`;
const options = { source, loadedFrom: "cbyuce" as const, expectedId: id };
const anchor = {
  id: "independent_anchor",
  label: "Arweave chronology",
  status: "retryable" as const,
  explanation: "Fixture tests do not contact a gateway.",
};
const parse = (manifest: unknown = production) =>
  parseUceRecord(manifest, options);
const status = (
  result: Awaited<ReturnType<typeof verifyRecord>>,
  check: string,
) => result.checks.find((item) => item.id === check)?.status;
type Fixture = typeof production;

describe("reviewed production Extended 1.1.0 verification", () => {
  it("reproduces the real digest and verifies its actual critical-profile signature", async () => {
    const record = parse();
    const result = await verifyRecord(record, anchor);
    expect(status(result, "canonical_manifest_hash")).toBe("verified");
    expect(status(result, "platform_signature")).toBe("verified");
    expect(result.coverage.manifestContents).toBe("recomputed");
    const hash = result.checks.find(
      (item) => item.id === "canonical_manifest_hash",
    )!;
    expect(hash.hashProvenance).toMatchObject({
      computedHash: id,
      canonicalBytes: 3201,
      publisherRevision,
    });
    const laboratory = draftResult(
      production as unknown as JsonObject,
      publisherRevision,
    );
    expect(canonicalExtendedJson(extendedHashInput(production))).toBe(
      laboratory.canonical,
    );
    expect(laboratory.sha256).toBe(id);
    expect(laboratory.preimage).toEqual(productionVector.preimage);
    expect(laboratory.canonical).toBe(productionVector.canonical);
    expect(Buffer.from(laboratory.canonical).toString("hex")).toBe(
      productionVector.canonicalUtf8Hex,
    );
    expect(productionVector.sha256).toBe(id);
    expect(result.coverage.limitations[0]).toContain(
      "excludes signatures, audit events",
    );
  });

  it("agrees with every existing 1.1.0 synthetic public vector", async () => {
    const selected = vectors.records.filter(
      (v) => v.manifest.schemaVersion === "1.1.0",
    );
    expect(selected.length).toBeGreaterThan(0);
    for (const vector of selected) {
      const canonical = canonicalExtendedJson(
        extendedHashInput(vector.manifest),
      );
      expect(canonical).toBe(vector.expected.canonical);
      expect(await sha256Bytes(new TextEncoder().encode(canonical))).toBe(
        vector.expected.sha256,
      );
    }
  });

  it.each<[string, (m: Fixture) => void]>([
    [
      "work title",
      (m) => {
        m.work.title = "Altered";
      },
    ],
    [
      "file digest",
      (m) => {
        m.files[0]!.sha256 = "a".repeat(64);
      },
    ],
    [
      "file name",
      (m) => {
        m.files[0]!.filename = "altered.pdf";
      },
    ],
    [
      "policy",
      (m) => {
        m.policy.doNotTrain = false;
      },
    ],
    [
      "license",
      (m) => {
        m.recordDetails.license = "Changed license";
      },
    ],
    [
      "extended notes",
      (m) => {
        m.recordDetails.copyright.extendedRecordDetails += " changed";
      },
    ],
    [
      "identity assertion",
      (m) => {
        m.identity.assurance.verifiedAt = "2026-09-20T00:00:00.000Z";
      },
    ],
    [
      "attestation",
      (m) => {
        m.attestations.claimantAdoption.text += " changed";
      },
    ],
    [
      "AI disclosure",
      (m) => {
        m.aiProvenance.aiCreativeProcess += " changed";
      },
    ],
    [
      "registration time",
      (m) => {
        m.registrationTimestamp = "2026-09-20T00:00:00.000Z";
      },
    ],
    [
      "generation",
      (m) => {
        m.generatedBy.version = "future";
      },
    ],
    [
      "file storage anchor",
      (m) => {
        m.anchors.fileStorage.contentHash = "b".repeat(64);
      },
    ],
  ])(
    "detects altered %s even when the recorded digest signature still validates",
    async (_label, change) => {
      const manifest = structuredClone(production);
      change(manifest);
      const result = await verifyRecord(parse(manifest), anchor);
      expect(status(result, "canonical_manifest_hash")).toBe("mismatch");
      expect(status(result, "platform_signature")).toBe("verified");
      expect(result.coverage.manifestContents).toBe("mismatch");
      expect(result.summary).toContain("integrity problem");
    },
  );

  it.each(["metadata", "source"])(
    "includes complete optional %s, including unknown nested fields",
    async (key) => {
      const manifest = {
        ...structuredClone(production),
        [key]: { "10": "ten", "2": "two", future: ["a", "b"] },
      };
      expect((await verifyManifestHash(parse(manifest))).status).toBe(
        "mismatch",
      );
    },
  );

  it("does not silently cover excluded fields or the post-anchor delivery ID", async () => {
    const manifest = {
      ...structuredClone(production),
      futureTopLevel: "not covered",
    };
    manifest.audit[0]!.by = "changed audit";
    manifest.anchors.arweave.txId =
      "jD5LXPMg9hJM-oUTTggKiHavSs1ndPhDufLu5cL6Vc8";
    const result = await verifyRecord(parse(manifest), anchor);
    expect(status(result, "canonical_manifest_hash")).toBe("verified");
    expect(result.coverage.limitations[0]).toContain(
      "other unlisted top-level fields",
    );
  });

  it("does not trust publisher success flags for altered contents", async () => {
    const manifest = structuredClone(production);
    manifest.work.title = "Altered";
    const result = await verifyRecord(
      parse({ manifest, verification: { hashMatches: true, sigValid: true } }),
      anchor,
    );
    expect(status(result, "canonical_manifest_hash")).toBe("mismatch");
    expect(status(result, "server_verification_claim")).toBe("reported");
  });

  it("requires retained raw data and refuses unreviewed profile fields", async () => {
    const record = parse();
    delete record.publicManifest;
    expect((await verifyManifestHash(record)).status).toBe("unsupported");
    const unknownProfile = {
      ...production,
      hashes: { ...production.hashes, profile: "future" },
    };
    const result = await verifyRecord(parse(unknownProfile), anchor);
    expect(status(result, "canonical_manifest_hash")).toBe("unsupported");
    expect(status(result, "platform_signature")).toBe("unsupported");
  });

  it.each([
    '{"alg":"ES256","kid":"k","crit":["unknown"]}',
    '{"alg":"ES256","kid":"k","uceRecordFormat":"extended-v1"}',
    '{"alg":"ES256","kid":"k","uceRecordFormat":"extended-v1","crit":["uceRecordFormat","unknown"]}',
    '{"alg":"ES256","alg":"ES256","kid":"k"}',
    '{"alg":"ES256","kid":"k","b64":false}',
  ])(
    "does not ignore unsupported or malformed protected headers",
    async (header) => {
      const manifest = structuredClone(production);
      const parts = manifest.signatures.platformSignature.split(".");
      parts[0] = Buffer.from(header).toString("base64url");
      manifest.signatures.platformSignature = parts.join(".");
      const result = await verifyRecord(parse(manifest), anchor);
      expect(status(result, "platform_signature")).not.toBe("verified");
      expect(status(result, "canonical_manifest_hash")).not.toBe("verified");
    },
  );

  it("does not downgrade Extended signatures into a standard manifest", async () => {
    const manifest: Record<string, unknown> = structuredClone(production);
    manifest.schemaVersion = "1.0.0";
    delete manifest.recordDetails;
    expect(
      status(await verifyRecord(parse(manifest), anchor), "platform_signature"),
    ).toBe("unsupported");
  });

  it("rejects license inconsistency and unknown detail fields instead of normalizing them", () => {
    const manifest = structuredClone(production);
    manifest.policy.license = "Other";
    expect(() => validateExtendedDetails(manifest)).toThrow(/license/);
    expect(() =>
      validateExtendedDetails({
        ...production,
        recordDetails: {
          ...production.recordDetails,
          copyright: {
            ...production.recordDetails.copyright,
            futureField: true,
          },
        },
      }),
    ).toThrow(/newer reviewed contract/);
  });

  it("accepts the publisher's present empty authors list", () => {
    const manifest = {
      ...production,
      recordDetails: {
        ...production.recordDetails,
        copyright: { ...production.recordDetails.copyright, authors: [] },
      },
    };
    expect(() => validateExtendedDetails(manifest)).not.toThrow();
    expect(canonicalExtendedJson(extendedHashInput(manifest))).toContain(
      '"authors":[]',
    );
  });

  it("validates raw JSON before duplicate keys or numeric precision can be lost", () => {
    expect(() => parseStrictJson('{"hashes":{},"hashes":{}}')).toThrow(
      /duplicate/,
    );
    expect(() => parseStrictJson('{"bytes":9007199254740993}')).toThrow();
    expect(() => parseStrictJson('{"note":"\\ud800"}')).toThrow(/surrogate/);
    expect(canonicalExtendedJson({ "2": "two", "10": "ten" })).toBe(
      '{"10":"ten","2":"two"}',
    );
  });

  it("keeps UI state, WebMCP report and exported report checks identical", async () => {
    const controller = new AppController(
      async () => new Response(JSON.stringify(production)),
      async () => anchor,
    );
    await controller.load(source);
    const state = controller.getState();
    expect(state.error).toBeUndefined();
    expect(state.verification?.coverage.manifestContents).toBe("recomputed");
    const tool = createToolDefinitions(controller).find(
      (t) => t.name === "get_uce_verification_report",
    )!;
    const result = (await tool.execute({})) as {
      structuredResult: { checks: unknown; coverage: unknown };
    };
    const report = createVerificationReport(state);
    expect(result.structuredResult.checks).toEqual(state.verification?.checks);
    expect(report.checks).toEqual(state.verification?.checks);
    expect(result.structuredResult.coverage).toEqual(report.coverage);
  });
});
