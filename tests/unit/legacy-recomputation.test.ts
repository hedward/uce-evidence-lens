import { describe, expect, it } from "vitest";
import publicManifest from "../../public/demo/uce-evidence-lens-logo-tagline-v1.0.uce.json";
import { parseUceRecord } from "../../src/records/parser";
import { verifyRecord } from "../../src/verification/evidence";
import { AppController } from "../../src/app/controller";
import { createToolDefinitions } from "../../src/webmcp/register";
import { createVerificationReport } from "../../src/reports/verification-report";

const source = `https://cbyuce.com/verify/${publicManifest.hashes.manifestHash}?format=json`;
const parse = (raw: unknown) =>
  parseUceRecord(raw, {
    source,
    loadedFrom: "cbyuce",
    expectedId: publicManifest.hashes.manifestHash,
  });
describe("legacy 1.0 positive-only runtime recomputation", () => {
  it("verifies the actual public digest independently of publisher flags", async () => {
    const snapshot = await verifyRecord({
      ...parse(publicManifest),
      serverHashMatches: false,
      serverSignatureValid: false,
    });
    expect(
      snapshot.checks.find((check) => check.id === "canonical_manifest_hash")
        ?.status,
    ).toBe("verified");
    expect(
      snapshot.checks.find((check) => check.id === "platform_signature")
        ?.status,
    ).toBe("verified");
    expect(snapshot.coverage.limitations[0]).toContain(
      "excludes work, policy, AI disclosures, file names",
    );
  });
  it("does not convert a nonmatching projection into a pass or a tampering verdict", async () => {
    const raw = structuredClone(publicManifest);
    raw.files[0]!.sha256 = "0".repeat(64);
    const snapshot = await verifyRecord(parse(raw));
    const check = snapshot.checks.find(
      (check) => check.id === "canonical_manifest_hash",
    )!;
    expect(check.status).toBe("unsupported");
    expect(check.hashProvenance?.computedHash).not.toBe(
      publicManifest.hashes.manifestHash,
    );
    expect(check.explanation).toContain(
      "No integrity pass or tampering conclusion",
    );
    expect(snapshot.coverage.manifestContents).toBe("not_recomputed");
  });
  it("keeps excluded metadata visibly outside authenticated hash coverage", async () => {
    const raw = structuredClone(publicManifest);
    raw.work.title = "Altered title assertion";
    raw.policy.license = "Altered rights assertion";
    const snapshot = await verifyRecord(parse(raw));
    expect(
      snapshot.checks.find((check) => check.id === "canonical_manifest_hash")
        ?.status,
    ).toBe("verified");
    expect(snapshot.coverage.limitations[0]).toContain("excludes work, policy");
  });
  it.each([false, true])(
    "keeps local UI, tool and exported coverage identical (altered=%s)",
    async (altered) => {
      const raw = structuredClone(publicManifest);
      if (altered) raw.files[0]!.sha256 = "a".repeat(64);
      const controller = new AppController(
        async () => new Response(JSON.stringify(raw)),
        async () => ({
          id: "independent_anchor",
          label: "Chronology",
          status: "retryable",
          explanation: "Offline fixture test.",
        }),
      );
      await controller.load(source);
      const state = controller.getState();
      expect(state.error).toBeUndefined();
      const result = (await createToolDefinitions(controller)
        .find((tool) => tool.name === "get_uce_verification_report")!
        .execute({})) as {
        structuredResult: { checks: unknown; coverage: unknown };
      };
      expect(result.structuredResult.checks).toEqual(
        state.verification?.checks,
      );
      expect(createVerificationReport(state).coverage).toEqual(
        result.structuredResult.coverage,
      );
      expect(state.verification?.coverage.manifestContents).toBe(
        altered ? "not_recomputed" : "recomputed",
      );
    },
  );
});
