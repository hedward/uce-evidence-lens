import { describe, expect, it } from "vitest";
import { demoRecord } from "../../src/records/demo";
import {
  compareLocalDigest,
  inspectChronology,
  verifyRecord,
} from "../../src/verification/evidence";
import { hashLocalFile, sha256Bytes } from "../../src/verification/crypto";
import { TRUSTED_PLATFORM_KEYS } from "../../src/security/trusted-platform-keys";

describe("evidence verification", () => {
  it("validates the public example ES256 signature", async () => {
    const result = await verifyRecord(demoRecord);
    expect(
      result.checks.find((check) => check.id === "platform_signature")?.status,
    ).toBe("verified");
  });

  it("keeps the pinned platform key bound to its reviewed RFC 7638 thumbprint", async () => {
    const key = TRUSTED_PLATFORM_KEYS[0]!;
    const canonical = JSON.stringify({
      crv: key.jwk.crv,
      kty: key.jwk.kty,
      x: key.jwk.x,
      y: key.jwk.y,
    });
    const digest = new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(canonical),
      ),
    );
    const thumbprint = btoa(String.fromCharCode(...digest))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");
    expect(thumbprint).toBe(key.jwkThumbprint);
  });

  it("fails a modified signature", async () => {
    const modified = structuredClone(demoRecord);
    const parts = modified.platformSignature!.split(".");
    parts[2] = `${parts[2]!.startsWith("A") ? "B" : "A"}${parts[2]!.slice(1)}`;
    modified.platformSignature = parts.join(".");
    const result = await verifyRecord(modified);
    expect(
      result.checks.find((check) => check.id === "platform_signature")?.status,
    ).toBe("mismatch");
  });

  it("reports an unknown platform key as unsupported", async () => {
    const unknownKey = {
      ...structuredClone(demoRecord),
      platformKeyKid: "attacker-selected-key",
      platformPublicKeyRef: "attacker-selected-reference",
      publicKeys: {
        source: "https://attacker.invalid/jwks.json",
        keys: [
          {
            kty: "EC",
            crv: "P-256",
            x: "D98fNCOR_D8zItMIBvujLV8tdE6C9FoOlDpX9yGSHOc",
            y: "7HDup_6Kppy_qluAc5X9NFHpGzotVv1MeydaAc6KqmA",
            kid: "attacker-selected-key",
            use: "sig",
            alg: "ES256",
          },
        ],
      },
    };
    const result = await verifyRecord(unknownKey);
    expect(
      result.checks.find((check) => check.id === "platform_signature")?.status,
    ).toBe("unsupported");
  });

  it("fails a platform key reference that conflicts with the trusted registry", async () => {
    const conflicting = {
      ...structuredClone(demoRecord),
      platformPublicKeyRef: "attacker-selected-reference",
    };
    const result = await verifyRecord(conflicting);
    expect(
      result.checks.find((check) => check.id === "platform_signature")?.status,
    ).toBe("mismatch");
  });

  it("does not trust a known key identifier without its reviewed key reference", async () => {
    const missingReference = {
      ...structuredClone(demoRecord),
      platformPublicKeyRef: undefined,
    };
    const result = await verifyRecord(missingReference);
    expect(
      result.checks.find((check) => check.id === "platform_signature")?.status,
    ).toBe("unsupported");
  });

  it("never promotes the server hash flag to a local canonical hash pass", async () => {
    const result = await verifyRecord(demoRecord);
    expect(
      result.checks.find((check) => check.id === "canonical_manifest_hash")
        ?.status,
    ).toBe("unsupported");
    expect(
      result.checks.find((check) => check.id === "server_verification_claim")
        ?.status,
    ).toBe("reported");
  });

  it("fails identifier equality for a tampered manifest hash", async () => {
    const tampered = structuredClone(demoRecord);
    tampered.manifestHash = "0".repeat(64);
    const result = await verifyRecord(tampered);
    expect(
      result.checks.find((check) => check.id === "identifier")?.status,
    ).toBe("mismatch");
    expect(
      result.checks.find((check) => check.id === "platform_signature")?.status,
    ).toBe("mismatch");
  });

  it("does not treat a record's own manifest hash as an independent identifier", async () => {
    const withoutIndependentId = {
      ...structuredClone(demoRecord),
      id: undefined,
    };
    const result = await verifyRecord(withoutIndependentId);
    expect(
      result.checks.find((check) => check.id === "identifier")?.status,
    ).toBe("unsupported");
  });

  it("shows chronology as checking while keeping publisher data reported", async () => {
    const result = await verifyRecord(demoRecord);
    expect(
      result.checks.find((check) => check.id === "independent_anchor")?.status,
    ).toBe("checking");
    expect(
      result.checks.find((check) => check.id === "publisher_anchor_claim")
        ?.status,
    ).toBe("reported");
    expect(
      inspectChronology(demoRecord).find((item) =>
        item.label.includes("Arweave"),
      )?.kind,
    ).toBe("recorded_assertion");
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
    expect(compareLocalDigest(demoRecord, match).status).toBe("verified");
    expect(
      compareLocalDigest(demoRecord, { ...match, sha256: "0".repeat(64) })
        .status,
    ).toBe("mismatch");
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
