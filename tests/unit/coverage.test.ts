import { describe, expect, it } from "vitest";
import { demoRecord } from "../../src/records/demo";
import { TRUSTED_PLATFORM_KEYS } from "../../src/security/trusted-platform-keys";
import { verifyRecord } from "../../src/verification/evidence";

describe("verification coverage and provenance", () => {
  it("separates the inspected record from the historical key review", async () => {
    const snapshot = await verifyRecord(demoRecord);
    const signature = snapshot.checks.find(
      (check) => check.id === "platform_signature",
    )!;
    expect(signature.status).toBe("verified");
    expect(signature.source).toBe(demoRecord.source);
    expect(signature.signatureProvenance).toEqual({
      keyId: TRUSTED_PLATFORM_KEYS[0]!.kid,
      keyThumbprint: TRUSTED_PLATFORM_KEYS[0]!.jwkThumbprint,
      publicKeySource: TRUSTED_PLATFORM_KEYS[0]!.publicKeySource,
      keyReviewSource: TRUSTED_PLATFORM_KEYS[0]!.approvalSource,
      reviewedAt: TRUSTED_PLATFORM_KEYS[0]!.verifiedAt,
    });
    expect(signature.signatureProvenance?.keyReviewSource).not.toBe(
      signature.source,
    );
  });

  it("keeps missing content authentication explicit even after a signature pass", async () => {
    const snapshot = await verifyRecord({
      ...demoRecord,
      publicManifest: undefined,
    });
    expect(snapshot.coverage.manifestContents).toBe("not_recomputed");
    expect(snapshot.coverage.limitations.join(" ")).toContain(
      "not the displayed metadata or file digests",
    );
    expect(snapshot.summary).toContain(
      "No problems found in completed checks.",
    );
    expect(Number.isNaN(Date.parse(snapshot.checkedAt))).toBe(false);
  });

  it("does not describe a metadata-only alteration as authenticated contents", async () => {
    const altered = {
      ...structuredClone(demoRecord),
      title: "Different asserted title",
    };
    const snapshot = await verifyRecord(altered);
    expect(
      snapshot.checks.find((check) => check.id === "platform_signature")
        ?.status,
    ).toBe("verified");
    expect(snapshot.coverage.manifestContents).toBe("recomputed");
    expect(snapshot.coverage.limitations[0]).toContain("excludes work, policy");
  });

  it.each(["1.1.0", "2.0.0", "2.1.0"])(
    "does not pass %s signatures through the legacy verifier",
    async (schemaVersion) => {
      const snapshot = await verifyRecord({
        ...structuredClone(demoRecord),
        schemaVersion,
      });
      expect(
        snapshot.checks.find((check) => check.id === "platform_signature")
          ?.status,
      ).toBe("unsupported");
      expect(snapshot.coverage.manifestContents).toBe("not_recomputed");
    },
  );

  it.each([
    { crit: ["uceRecordFormat"], uceRecordFormat: "extended-v1" },
    { uceRecordFormat: "extended-v1" },
    { crit: ["unknown"] },
    { b64: false },
  ])(
    "never ignores a protected JWS extension after a schema downgrade: %j",
    async (extraHeader) => {
      const record = structuredClone(demoRecord);
      const [head, payload, signature] = record.platformSignature!.split(".");
      const originalHeader = JSON.parse(
        atob(head!.replaceAll("-", "+").replaceAll("_", "/")),
      );
      const encodedHeader = btoa(
        JSON.stringify({ ...originalHeader, ...extraHeader }),
      )
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/, "");
      record.platformSignature = `${encodedHeader}.${payload}.${signature}`;
      const snapshot = await verifyRecord(record);
      expect(
        snapshot.checks.find((check) => check.id === "platform_signature")
          ?.status,
      ).toBe("unsupported");
    },
  );
});
