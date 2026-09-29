import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import corpus from "../fixtures/hash-profiles/vectors.json";
import {
  STANDARD_HASH_COVERAGE,
  canonicalStandardJson,
  standardHashInput,
} from "../../src/verification/standard-hash";

type Manifest = Record<string, unknown>;
const standardVectors = corpus.records.filter(
  ({ manifest }) =>
    manifest.schemaVersion === "1.0.0" || manifest.schemaVersion === "2.0.0",
);
const digest = (text: string): string =>
  createHash("sha256").update(text, "utf8").digest("hex");
const manifest = (): Manifest =>
  structuredClone(standardVectors[0]!.manifest) as Manifest;
const hashes = (value: Manifest): Manifest => value.hashes as Manifest;
const assurance = (value: Manifest): Manifest =>
  (value.identity as Manifest).assurance as Manifest;

describe("independent standard 1.0/2.0 hash input", () => {
  it.each(standardVectors)(
    "reproduces frozen preimage, bytes and digest: $id",
    (vector) => {
      const input = standardHashInput(vector.manifest as Manifest);
      const canonical = canonicalStandardJson(input);
      expect(input).toEqual(vector.expected.preimage);
      expect(canonical).toBe(vector.expected.canonical);
      expect(Buffer.from(canonical, "utf8").toString("hex")).toBe(
        vector.expected.canonicalUtf8Hex,
      );
      expect(digest(canonical)).toBe(vector.expected.sha256);
      expect(digest(canonical)).toBe(
        (vector.manifest.hashes as Manifest).manifestHash,
      );
    },
  );

  it("reproduces the complete bundled public logo manifest", () => {
    const publicManifest = JSON.parse(
      readFileSync(
        new URL(
          "../../public/demo/uce-evidence-lens-logo-tagline-v1.0.uce.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as Manifest;
    expect(
      digest(canonicalStandardJson(standardHashInput(publicManifest))),
    ).toBe("cc94e8d529cfc24f6fe458470b69dca2c3ef53a78b740bb1fea9cc40d09cfd1c");
  });

  it("uses historical ECMAScript index-key ordering, not lexical JCS", () => {
    expect(canonicalStandardJson({ "10": "ten", "2": "two", z: 1, a: 2 })).toBe(
      '{"2":"two","10":"ten","a":2,"z":1}',
    );
    expect(canonicalStandardJson(["é", "é"])).not.toBe(
      canonicalStandardJson(["é", "é"]),
    );
  });

  it("changes with covered facts but not excluded display and lifecycle fields", () => {
    const original = manifest();
    const baseline = digest(canonicalStandardJson(standardHashInput(original)));
    const covered = structuredClone(original);
    ((covered.files as Manifest[])[0] as Manifest).sha256 = "0".repeat(64);
    expect(digest(canonicalStandardJson(standardHashInput(covered)))).not.toBe(
      baseline,
    );

    const excluded = structuredClone(original);
    (excluded.work as Manifest).authorName = "A different assertion";
    (excluded.policy as Manifest).license = "Changed declaration";
    ((excluded.files as Manifest[])[0] as Manifest).filename = "renamed.png";
    excluded.registrationTimestamp = "2026-09-21T00:00:00.000Z";
    excluded.audit = [{ event: "changed" }];
    (excluded.signatures as Manifest).platformSignature = "changed";
    (excluded.anchors as Manifest).arweave = { txId: "changed" };
    excluded.metadata = { createdWith: "changed" };
    expect(digest(canonicalStandardJson(standardHashInput(excluded)))).toBe(
      baseline,
    );
    expect(STANDARD_HASH_COVERAGE).toContain("excludes work, policy");
  });

  it("preserves complete optional source and attestations without timestamp recovery", () => {
    const original = manifest();
    const withSource = structuredClone(original);
    withSource.source = { connector: { "10": "ten", "2": "two" } };
    const input = standardHashInput(withSource);
    expect(input.source).toEqual(withSource.source);
    expect(canonicalStandardJson(input)).toContain('"2":"two","10":"ten"');
    const withOtherAttestation = structuredClone(original);
    (withOtherAttestation.attestations as Manifest).extra = { recorded: true };
    expect(
      digest(canonicalStandardJson(standardHashInput(withOtherAttestation))),
    ).not.toBe(digest(canonicalStandardJson(standardHashInput(original))));
    assurance(original).verifiedAt = "2026-01-02T03:04:04.999Z";
    expect(digest(canonicalStandardJson(standardHashInput(original)))).not.toBe(
      hashes(original).manifestHash,
    );
  });

  it.each([
    [
      "unknown schema",
      (value: Manifest) => {
        value.schemaVersion = "9.0.0";
      },
    ],
    [
      "wrong algorithm",
      (value: Manifest) => {
        hashes(value).algorithm = "SHA256";
      },
    ],
    [
      "wrong serializer label",
      (value: Manifest) => {
        hashes(value).canonicalization = "JCS";
      },
    ],
    [
      "wire profile",
      (value: Manifest) => {
        hashes(value).profile = "unreviewed";
      },
    ],
    [
      "extended marker",
      (value: Manifest) => {
        value.recordDetails = { format: "extended-v1" };
      },
    ],
    [
      "two files",
      (value: Manifest) => {
        value.files = [
          (value.files as Manifest[])[0],
          (value.files as Manifest[])[0],
        ];
      },
    ],
    [
      "missing timestamp",
      (value: Manifest) => {
        delete assurance(value).verifiedAt;
      },
    ],
    [
      "missing Merkle root",
      (value: Manifest) => {
        delete hashes(value).merkleRoot;
      },
    ],
    [
      "null source",
      (value: Manifest) => {
        value.source = null;
      },
    ],
    [
      "unsafe size",
      (value: Manifest) => {
        (value.files as Manifest[])[0]!.bytes = -1;
      },
    ],
  ] as const)("rejects unsupported input: %s", (_label, mutate) => {
    const value = manifest();
    mutate(value);
    expect(() => standardHashInput(value)).toThrow();
  });

  it("rejects unsafe standalone serializer inputs", () => {
    expect(() => canonicalStandardJson(new Array(2))).toThrow();
    expect(() => canonicalStandardJson("\ud800")).toThrow();
    expect(() => canonicalStandardJson(Infinity)).toThrow();
    expect(() =>
      canonicalStandardJson(JSON.parse('{"__proto__":1}')),
    ).toThrow();
    const cyclic: Manifest = {};
    cyclic.self = cyclic;
    expect(() => canonicalStandardJson(cyclic)).toThrow();
  });
});
