import { describe, expect, it } from "vitest";
import { demoRecord } from "../../src/records/demo";
import {
  compareLocalDigest,
  verifyRecord,
} from "../../src/verification/evidence";
import { hashLocalFile, sha256Bytes } from "../../src/verification/crypto";

describe("evidence verification", () => {
  it("validates the public example ES256 signature", async () => {
    const result = await verifyRecord(demoRecord, demoRecord.publicKeys);
    expect(
      result.checks.find((check) => check.id === "platform_signature")?.status,
    ).toBe("passed");
  });

  it("fails a modified signature", async () => {
    const modified = structuredClone(demoRecord);
    const parts = modified.platformSignature!.split(".");
    parts[2] = `${parts[2]!.startsWith("A") ? "B" : "A"}${parts[2]!.slice(1)}`;
    modified.platformSignature = parts.join(".");
    const result = await verifyRecord(modified, modified.publicKeys);
    expect(
      result.checks.find((check) => check.id === "platform_signature")?.status,
    ).toBe("failed");
  });

  it("reports a missing public key as unavailable", async () => {
    const result = await verifyRecord(demoRecord, undefined);
    expect(
      result.checks.find((check) => check.id === "platform_signature")?.status,
    ).toBe("unavailable");
  });

  it("never promotes the server hash flag to a local canonical hash pass", async () => {
    const result = await verifyRecord(demoRecord, demoRecord.publicKeys);
    expect(
      result.checks.find((check) => check.id === "canonical_manifest_hash")
        ?.status,
    ).toBe("unavailable");
    expect(
      result.checks.find((check) => check.id === "server_verification_claim")
        ?.status,
    ).toBe("recorded_assertion");
  });

  it("fails identifier equality for a tampered manifest hash", async () => {
    const tampered = structuredClone(demoRecord);
    tampered.manifestHash = "0".repeat(64);
    const result = await verifyRecord(tampered, tampered.publicKeys);
    expect(
      result.checks.find((check) => check.id === "identifier")?.status,
    ).toBe("failed");
    expect(
      result.checks.find((check) => check.id === "platform_signature")?.status,
    ).toBe("failed");
  });

  it("computes the expected local SHA-256 digest", async () => {
    const digest = await sha256Bytes(new TextEncoder().encode("hello"));
    expect(digest).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("reports local digest match and mismatch", () => {
    const match = {
      name: demoRecord.files[0]!.filename,
      bytes: demoRecord.files[0]!.bytes,
      sha256: demoRecord.files[0]!.sha256,
      computedAt: new Date().toISOString(),
    };
    expect(compareLocalDigest(demoRecord, match).status).toBe("passed");
    expect(
      compareLocalDigest(demoRecord, { ...match, sha256: "0".repeat(64) })
        .status,
    ).toBe("failed");
  });

  it("hashes a selected File without returning contents", async () => {
    const digest = await hashLocalFile(
      new File(["hello"], "hello.txt", { type: "text/plain" }),
    );
    expect(digest).toEqual(
      expect.objectContaining({
        name: "hello.txt",
        bytes: 5,
        sha256:
          "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      }),
    );
    expect(digest).not.toHaveProperty("contents");
  });
});
