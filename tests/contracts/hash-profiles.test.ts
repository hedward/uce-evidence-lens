import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import corpus from "../fixtures/hash-profiles/vectors.json";
import {
  canonicalText,
  digestText,
  draftProjection,
  draftResult,
  object,
  publisherRevision,
} from "./hash-profile-reference";
import type { Json, JsonObject, Serializer } from "./hash-profile-reference";
import { parseUceRecord } from "../../src/records/parser";
import { verifyRecord } from "../../src/verification/evidence";

const records = corpus.records as unknown as {
  id: string;
  manifest: JsonObject;
  expected: {
    profile: string;
    serializer: Serializer;
    preimage: JsonObject;
    canonical: string;
    canonicalUtf8Hex: string;
    sha256: string;
  };
  mutations: {
    id: string;
    path: string[];
    value: Json;
    changesHash: boolean;
    expectedSha256: string;
  }[];
}[];

function fixture(index = 0): JsonObject {
  return structuredClone(records[index]!.manifest);
}
function replace(manifest: JsonObject, path: string[], value: Json): void {
  let parent: JsonObject = manifest;
  for (const key of path.slice(0, -1)) parent = parent[key] as JsonObject;
  parent[path.at(-1)!] = value;
}
function reverseObjects(value: Json): Json {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(reverseObjects);
  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, item]) => [key, reverseObjects(item)]),
  );
}

describe("draft hash contract — not runtime verification support", () => {
  it("pins the reviewed publisher and covers all four versions", () => {
    expect(corpus.publisherRevision).toBe(publisherRevision);
    expect(
      new Set(records.map(({ manifest }) => manifest.schemaVersion)),
    ).toEqual(new Set(["1.0.0", "1.1.0", "2.0.0", "2.1.0"]));
  });

  it.each(records)(
    "reproduces frozen bytes and independent WebCrypto digest: $id",
    async ({ manifest, expected }) => {
      const result = draftResult(manifest, publisherRevision);
      expect(result).toEqual({
        profile: expected.profile,
        serializer: expected.serializer,
        preimage: expected.preimage,
        canonical: expected.canonical,
        sha256: expected.sha256,
      });
      expect(Buffer.from(result.canonical, "utf8").toString("hex")).toBe(
        expected.canonicalUtf8Hex,
      );
      const digest = await webcrypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(result.canonical),
      );
      expect(Buffer.from(digest).toString("hex")).toBe(expected.sha256);
      expect(object(manifest.hashes).manifestHash).toBe(expected.sha256);
    },
  );

  it.each(records)(
    "ignores whitespace/object ordering, not content: $id",
    ({ manifest, expected }) => {
      const shuffled = JSON.parse(
        JSON.stringify(reverseObjects(manifest), null, 4),
      ) as JsonObject;
      expect(draftResult(shuffled, publisherRevision).sha256).toBe(
        expected.sha256,
      );
    },
  );

  const mutations = records.flatMap((entry) =>
    entry.mutations.map((mutation) => ({
      entry,
      ...mutation,
      label: `${entry.id}/${mutation.id}`,
    })),
  );
  it.each(mutations)(
    "has precise included/excluded coverage: $label",
    ({ entry, path, value, changesHash, expectedSha256 }) => {
      const manifest = structuredClone(entry.manifest);
      replace(manifest, path, value);
      const digest = draftResult(manifest, publisherRevision).sha256;
      expect(digest).toBe(expectedSha256);
      expect(digest !== entry.expected.sha256).toBe(changesHash);
      if (path.join(".") === "hashes.manifestHash") {
        // Excluding the self-hash never authorizes accepting a forged target hash.
        expect(digest).not.toBe(object(manifest.hashes).manifestHash);
      }
    },
  );

  it.each(corpus.serialization)(
    "freezes serialization behavior: $id",
    ({ input, results }) => {
      for (const result of results) {
        const canonical = canonicalText(
          input as Json,
          result.serializer as Serializer,
        );
        expect(canonical).toBe(result.canonical);
        expect(Buffer.from(canonical).toString("hex")).toBe(
          result.canonicalUtf8Hex,
        );
        expect(digestText(canonical)).toBe(result.sha256);
      }
    },
  );

  it("does not conflate historical object enumeration with lexical JCS order", () => {
    expect(
      canonicalText({ "2": "two", "10": "ten" }, "standard-ecmascript-v1"),
    ).toBe('{"2":"two","10":"ten"}');
    expect(
      canonicalText({ "2": "two", "10": "ten" }, "extended-lexical-v1"),
    ).toBe('{"10":"ten","2":"two"}');
  });

  it("preserves array order, null/absence, empty values and Unicode distinctions", () => {
    const serialize = (value: Json) =>
      canonicalText(value, "extended-lexical-v1");
    expect(serialize(["a", "b"])).not.toBe(serialize(["b", "a"]));
    expect(serialize({ x: null })).not.toBe(serialize({}));
    expect(serialize({ x: "" })).not.toBe(serialize({ x: [] }));
    expect(serialize("é")).not.toBe(serialize("é"));
  });

  const unsupportedStandard: JsonObject[] = [
    { schemaVersion: "9.0.0" },
    { schema: "unknown" },
    { recordDetails: { format: "extended-v1" } },
    { files: [] },
    {
      files: [
        object((fixture().files as Json[])[0]),
        object((fixture().files as Json[])[0]),
      ],
    },
  ];
  it.each(unsupportedStandard)(
    "rejects unsupported standard construction: %j",
    (fields) => {
      expect(() =>
        draftProjection({ ...fixture(), ...fields }, publisherRevision),
      ).toThrow();
    },
  );

  it.each(["algorithm", "canonicalization", "profile"])(
    "does not ignore an unsupported hash label: %s",
    (key) => {
      const manifest = fixture();
      object(manifest.hashes)[key] = "unknown";
      expect(() => draftResult(manifest, publisherRevision)).toThrow();
    },
  );

  it("never selects a historical recipe from a version alone or an API envelope", () => {
    expect(() => draftResult(fixture(), "")).toThrow(
      "Explicit audited publisher revision",
    );
    expect(() =>
      draftResult(
        { manifest: fixture(), verification: { hashMatches: true } },
        publisherRevision,
      ),
    ).toThrow("Unsupported schema");
    const missing = fixture();
    delete object(object(missing.identity).assurance).verifiedAt;
    expect(() => draftResult(missing, publisherRevision)).toThrow();
  });

  it("distinguishes absent optional extended blocks from malformed null", () => {
    const manifest = fixture(7);
    expect(draftResult(manifest, publisherRevision).preimage.anchors).toEqual(
      {},
    );
    object(manifest.anchors).fileStorage = null;
    expect(() => draftResult(manifest, publisherRevision)).toThrow();
  });

  it.each([
    NaN,
    Infinity,
    "\ud800",
    "\udc00",
    { x: undefined },
    new Date(),
    JSON.parse('{"__proto__":1}'),
  ])("rejects unsafe/non-JSON input: %j", (value) => {
    expect(() => canonicalText(value as Json, "extended-lexical-v1")).toThrow();
  });

  it("rejects cycles, sparse arrays, and excessive depth", () => {
    const cyclic: JsonObject = {};
    cyclic.self = cyclic;
    expect(() => canonicalText(cyclic, "extended-lexical-v1")).toThrow();
    expect(() => canonicalText(new Array(2), "extended-lexical-v1")).toThrow();
    let deep: Json = {};
    for (let i = 0; i < 42; i++) deep = { child: deep };
    expect(() => canonicalText(deep, "extended-lexical-v1")).toThrow();
  });

  it("shows why historical clock drift must not become a false tampering alarm", async () => {
    const manifest = fixture();
    const originalInput = draftProjection(manifest, publisherRevision).preimage;
    object(object(originalInput.identity).assurance).verifiedAt =
      "2026-01-02T03:04:04.999Z";
    object(manifest.hashes).manifestHash = digestText(
      canonicalText(originalInput, "standard-ecmascript-v1"),
    );
    expect(draftResult(manifest, publisherRevision).sha256).not.toBe(
      object(manifest.hashes).manifestHash,
    );
    const record = parseUceRecord(manifest, {
      source: "synthetic-contract-test",
      loadedFrom: "pasted_json",
    });
    const result = await verifyRecord(record);
    expect(
      result.checks.find(({ id }) => id === "canonical_manifest_hash")?.status,
    ).toBe("unsupported");
    expect(result.coverage.manifestContents).toBe("not_recomputed");
  });

  it("reproduces the bundled public record with a narrow positive-only runtime claim", async () => {
    const manifest = JSON.parse(
      readFileSync(
        new URL(
          "../../public/demo/uce-evidence-lens-logo-tagline-v1.0.uce.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as JsonObject;
    expect(draftResult(manifest, publisherRevision).sha256).toBe(
      "cc94e8d529cfc24f6fe458470b69dca2c3ef53a78b740bb1fea9cc40d09cfd1c",
    );
    const record = parseUceRecord(manifest, {
      source: "bundled-public-json",
      loadedFrom: "pasted_json",
    });
    expect(
      (await verifyRecord(record)).checks.find(
        ({ id }) => id === "canonical_manifest_hash",
      )?.status,
    ).toBe("verified");
  });
});
