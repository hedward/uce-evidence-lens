import { describe, expect, it } from "vitest";
import {
  HASH_RECOMPUTATION_VERSIONS,
  MANIFEST_COMPATIBILITY,
  SIGNATURE_VERIFICATION_VERSIONS,
  recognizedManifestVersion,
} from "../../src/records/manifest-compatibility";
import { parseUceRecord } from "../../src/records/parser";
import { validPublicResponse } from "../fixtures/public-record";

const options = {
  source: `https://cbyuce.com/verify/${"a".repeat(64)}?format=json`,
  loadedFrom: "cbyuce" as const,
  expectedId: "a".repeat(64),
};

function fixtureFor(version: "1.0.0" | "1.1.0" | "2.0.0" | "2.1.0") {
  const response = structuredClone(validPublicResponse) as unknown as {
    manifest: Record<string, unknown>;
    verification: Record<string, unknown>;
  };
  const manifest = response.manifest;
  manifest.schemaVersion = version;
  manifest.source = {
    type: "connector",
    platform: "figma",
    connectorVersion: "1.2.3",
    intakeContractVersion: "1.0.0",
    futurePublicField: { retained: true },
  };
  manifest.futurePublicField = { retained: ["yes"] };

  if (version !== "1.0.0") {
    manifest.identity = {
      assurance: {
        level: "IAL1",
        methods: ["synthetic_fixture"],
        verifiedAt: "2026-01-02T03:04:05.000Z",
      },
    };
    manifest.attestations = { syntheticFixture: true };
    manifest.signatures = {
      platformSignature: "synthetic.not-a-real-signature.value",
      platformPublicKeyRef: "synthetic-public-key-reference",
    };
  }

  if (version.startsWith("2.")) {
    manifest.signatures = {
      classical: {
        algorithm: "ES256",
        jws: "synthetic.not-a-real-signature.value",
        publicKeyRef: "synthetic-public-key-reference",
      },
      postQuantum: {
        algorithm: "ML-DSA-65",
        signature: "c3ludGhldGlj",
        publicKeyRef: "synthetic-quantum-key-reference",
        libraryVersion: "synthetic-test-only",
      },
    };
    manifest.metadata = {
      createdWith: "Synthetic compatibility fixture",
      cryptoLibraries: { classical: "synthetic", postQuantum: "synthetic" },
    };
  }

  if (version.endsWith(".1.0")) {
    const license = `Synthetic extended fixture: ${"x".repeat(10_000)}`;
    manifest.recordDetails = {
      format: "extended-v1",
      copyright: { title: "Synthetic extended fixture" },
      license,
    };
    manifest.policy = { ...(manifest.policy ?? {}), license };
  }
  return response;
}

describe("manifest compatibility registry", () => {
  it("recognizes only the four reviewed publisher versions", () => {
    for (const version of ["1.0.0", "1.1.0", "2.0.0", "2.1.0"] as const) {
      expect(recognizedManifestVersion(version)).toBe(version);
      expect(MANIFEST_COMPATIBILITY[version].readable).toBe(true);
    }
    expect(recognizedManifestVersion("3.0.0")).toBeUndefined();
  });

  it("does not imply unsupported recomputation, critical-profile, or hybrid crypto", () => {
    expect(HASH_RECOMPUTATION_VERSIONS).toEqual(["1.0.0", "1.1.0"]);
    expect(SIGNATURE_VERIFICATION_VERSIONS).toEqual(["1.0.0", "1.1.0"]);
    expect(MANIFEST_COMPATIBILITY["1.1.0"].localSignatureVerification).toBe(
      "supported_extended_es256",
    );
    expect(MANIFEST_COMPATIBILITY["2.0.0"].localSignatureVerification).toBe(
      "unsupported_hybrid",
    );
    expect(MANIFEST_COMPATIBILITY["2.1.0"].localSignatureVerification).toBe(
      "unsupported_hybrid_extended_critical",
    );
  });
});

describe("recognized manifest read compatibility", () => {
  it.each(["1.0.0", "1.1.0", "2.0.0", "2.1.0"] as const)(
    "reads synthetic %s fixtures without treating them as cryptographically verified",
    (version) => {
      const fixture = fixtureFor(version);
      const record = parseUceRecord(fixture, options);
      expect(record.schemaVersion).toBe(version);
      expect(record.publicManifest?.futurePublicField).toEqual({
        retained: ["yes"],
      });
      expect(record.connectorSource?.futurePublicField).toEqual({
        retained: true,
      });
      expect(record.compatibilityNotes).toContain(
        MANIFEST_COMPATIBILITY[version].displayNote,
      );
      if (version.endsWith(".1.0")) {
        expect(record.recordDetails?.format).toBe("extended-v1");
        expect(record.policyLicense?.length).toBeGreaterThan(10_000);
      }
    },
  );

  it.each(["1.1.0", "2.0.0", "2.1.0"] as const)(
    "binds raw Arweave %s manifests whose embedded self-anchor is still blank",
    (version) => {
      const fixture = fixtureFor(version);
      const anchors = fixture.manifest.anchors as Record<string, unknown>;
      const arweave = anchors.arweave as Record<string, unknown>;
      arweave.txId = "";
      const sourceArweaveTxId = "Ragba5o2yoEn-JT1C1RbVr0VVKdcxH797tHk9Xao8kg";
      const record = parseUceRecord(fixture, {
        source: `https://arweave.net/${sourceArweaveTxId}`,
        loadedFrom: "arweave",
        sourceArweaveTxId,
      });
      expect(record.arweaveTxId).toBe(sourceArweaveTxId);
    },
  );

  it.each(["1.1.0", "2.0.0", "2.1.0"] as const)(
    "rejects a nonempty %s self-anchor that conflicts with its Arweave source",
    (version) => {
      const fixture = fixtureFor(version);
      const sourceArweaveTxId = "Ragba5o2yoEn-JT1C1RbVr0VVKdcxH797tHk9Xao8kg";
      expect(() =>
        parseUceRecord(fixture, {
          source: `https://arweave.net/${sourceArweaveTxId}`,
          loadedFrom: "arweave",
          sourceArweaveTxId,
        }),
      ).toThrow(/does not match the loaded source transaction/);
    },
  );

  it("tolerates documented legacy omissions without inventing a recorded version", () => {
    const fixture = fixtureFor("1.0.0");
    delete fixture.manifest.manifestVersion;
    const files = fixture.manifest.files as Array<Record<string, unknown>>;
    delete files[0]!.filename;
    const record = parseUceRecord(fixture, options);
    expect(record.manifestVersion).toBeUndefined();
    expect(record.files[0]?.filename).toBe("[filename not recorded]");
    expect(record.compatibilityNotes?.join(" ")).toMatch(
      /manifestVersion.*not recorded/,
    );
  });

  it("preserves legacy unknown hash metadata without fabricating RFC8785", () => {
    const fixture = fixtureFor("1.0.0");
    const hashes = fixture.manifest.hashes as Record<string, unknown>;
    hashes.algorithm = "SHA256";
    delete hashes.canonicalization;
    delete hashes.merkleRoot;
    const record = parseUceRecord(fixture, options);
    expect(record.hashAlgorithm).toBe("sha256");
    expect(record.canonicalization).toBeUndefined();
    expect(record.merkleRoot).toBeUndefined();
    expect(record.compatibilityNotes?.join(" ")).toMatch(
      /canonicalization.*not recorded.*merkleRoot.*not recorded/,
    );
  });

  it("still rejects malformed present legacy hash metadata", () => {
    const fixture = fixtureFor("1.0.0");
    const hashes = fixture.manifest.hashes as Record<string, unknown>;
    hashes.merkleRoot = 42;
    expect(() => parseUceRecord(fixture, options)).toThrow(/merkleRoot/);
  });

  it("rejects malformed required fields in newer formats", () => {
    const fixture = fixtureFor("2.0.0");
    delete fixture.manifest.metadata;
    expect(() => parseUceRecord(fixture, options)).toThrow(/metadata/);
  });

  it("rejects unsupported algorithms rather than trusting their labels", () => {
    const fixture = fixtureFor("1.0.0");
    const hashes = fixture.manifest.hashes as Record<string, unknown>;
    hashes.algorithm = "sha512";
    expect(() => parseUceRecord(fixture, options)).toThrow(/sha256/);
  });

  it("rejects present optional fields with invalid types", () => {
    const fixture = fixtureFor("1.0.0");
    fixture.manifest.source = "not-an-object";
    expect(() => parseUceRecord(fixture, options)).toThrow(
      /manifest.source must be a JSON object/,
    );
  });

  it("retains a detached public-manifest snapshot", () => {
    const fixture = fixtureFor("1.0.0");
    const record = parseUceRecord(fixture, options);
    fixture.manifest.futurePublicField = { retained: ["changed"] };
    expect(record.publicManifest?.futurePublicField).toEqual({
      retained: ["yes"],
    });
  });

  it("rejects unknown future versions explicitly", () => {
    const fixture = fixtureFor("1.0.0");
    fixture.manifest.schemaVersion = "3.0.0";
    expect(() => parseUceRecord(fixture, options)).toThrow(
      /Unsupported record schema/,
    );
  });

  it("bounds unknown public fields while preserving accepted ones", () => {
    const fixture = fixtureFor("1.0.0");
    fixture.manifest.futurePublicField = "x".repeat(300_000);
    expect(() => parseUceRecord(fixture, options)).toThrow(
      /safe public manifest limit/,
    );
  });
});
