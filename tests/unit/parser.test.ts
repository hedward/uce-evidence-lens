import { describe, expect, it } from "vitest";
import { parseUceRecord } from "../../src/records/parser";
import { loadPastedRecord } from "../../src/records/loader";
import { validPublicResponse } from "../fixtures/public-record";

const options = {
  source:
    "https://cbyuce.com/verify/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa?format=json",
  loadedFrom: "cbyuce" as const,
  expectedId:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};

describe("public record parsing", () => {
  it("accepts the reduced supported public response", () => {
    const record = parseUceRecord(validPublicResponse, options);
    expect(record.title).toBe("Synthetic public test record");
    expect(record.files[0]?.sha256).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
    expect(record.serverSignatureValid).toBe(true);
  });

  it("rejects an unsupported or malformed record", () => {
    const malformed = structuredClone(validPublicResponse);
    malformed.manifest.schemaVersion = "99.0.0";
    expect(() => parseUceRecord(malformed, options)).toThrow(
      /Unsupported record schema/,
    );
  });

  it("rejects a modified manifest hash that is not a digest", () => {
    const tampered = structuredClone(validPublicResponse);
    tampered.manifest.hashes.manifestHash = "not-a-hash";
    expect(() => parseUceRecord(tampered, options)).toThrow(/SHA-256 digest/);
  });

  it("keeps malicious-looking strings as inert data", () => {
    const hostile = structuredClone(validPublicResponse);
    hostile.manifest.work.title = '<img src=x onerror="globalThis.pwned=true">';
    const record = parseUceRecord(hostile, options);
    expect(record.title).toContain("onerror");
    expect((globalThis as { pwned?: boolean }).pwned).toBeUndefined();
  });

  it("rejects oversized pasted input", () => {
    expect(() =>
      loadPastedRecord(`{"value":"${"x".repeat(1_000_001)}"}`),
    ).toThrow(/exceeds 1 MB/);
  });
});
