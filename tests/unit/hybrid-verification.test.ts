import { createHash, webcrypto } from "node:crypto";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { describe, expect, it, vi } from "vitest";
import interop from "../fixtures/hybrid-interop.json";
import vectors from "../fixtures/hash-profiles/vectors.json";
import { parseUceRecord } from "../../src/records/parser";
import type { PublicJwk } from "../../src/types/record";
import type { TrustedPlatformKey } from "../../src/security/trusted-platform-keys";
import type { TrustedQuantumKey } from "../../src/security/trusted-quantum-keys";
import { TRUSTED_QUANTUM_KEYS } from "../../src/security/trusted-quantum-keys";
import {
  decodeHybridBase64,
  QUALIFIED_HYBRID_VERSIONS,
  verifyHybridManifestSignatures,
} from "../../src/verification/hybrid-signature";
import {
  canonicalExtendedJson,
  extendedHashInput,
  verifyHybridManifestHash,
} from "../../src/verification/manifest-hash";
import { verifyRecord } from "../../src/verification/evidence";
import { createToolDefinitions } from "../../src/webmcp/register";
import { createVerificationReport } from "../../src/reports/verification-report";
import { AppController } from "../../src/app/controller";

type ObjectData = Record<string, unknown>;
const object = (value: unknown) => value as ObjectData;
const sha = (value: Uint8Array | string) =>
  createHash("sha256").update(value).digest("hex");
const thumb = (key: PublicJwk) =>
  createHash("sha256")
    .update(JSON.stringify({ crv: key.crv, kty: key.kty, x: key.x, y: key.y }))
    .digest("base64url");
function trustedClassical(jwk: PublicJwk): TrustedPlatformKey {
  return {
    kid: jwk.kid!,
    jwk,
    status: "active",
    jwkThumbprint: thumb(jwk),
    publicKeyRef: "synthetic-test-key",
    approvalSource: "synthetic-interoperability-test",
    publicKeySource: "synthetic-test-key",
    verifiedAt: "2026-09-21",
  };
}
const classical = trustedClassical(interop.classical.publicJwk as PublicJwk);
const quantum: TrustedQuantumKey = {
  kid: "synthetic-interop-pq",
  status: "active",
  publicKeyBase64: interop.postQuantum.publicKeyBase64,
  sha256: sha(Buffer.from(interop.postQuantum.publicKeyBase64, "base64")),
  publicKeySource: "synthetic-test-key",
  approvalSource: "synthetic-interoperability-test",
  reviewedAt: "2026-09-21",
};
const parse = (raw: unknown) =>
  parseUceRecord(raw, {
    source: "synthetic-hybrid-test",
    loadedFrom: "pasted_json",
  });
function manifest(version = "2.0.0", signatureOnly = true): ObjectData {
  const raw = structuredClone(
    vectors.records.find((item) => item.manifest.schemaVersion === version)!
      .manifest,
  ) as ObjectData;
  if (signatureOnly) object(raw.hashes).manifestHash = interop.messageHex;
  raw.signatures = {
    classical: {
      algorithm: "ES256",
      publicKeyRef: "synthetic-key-reference",
      jws:
        version === "2.1.0"
          ? interop.classical.extendedJws
          : interop.classical.standardJws,
    },
    postQuantum: {
      algorithm: "ML-DSA-65",
      signature: interop.postQuantum.signatureBase64,
      publicKeyRef: "untrusted-reference-is-not-fetched",
      libraryVersion: "@noble/post-quantum@0.4.1",
    },
  };
  return raw;
}
const signatures = (raw: ObjectData) => object(raw.signatures);
const ec = (raw: ObjectData) => object(signatures(raw).classical);
const pq = (raw: ObjectData) => object(signatures(raw).postQuantum);
// Exercise the engine's own fail-closed boundary, even for malformed raw
// signatures that the normal parser rejects before cryptography is reached.
const verify = (raw: ObjectData, ecKeys = [classical], pqKeys = [quantum]) =>
  verifyHybridManifestSignatures(
    {
      ...parse(manifest(String(raw.schemaVersion))),
      publicManifest: raw,
      manifestHash: String(object(raw.hashes).manifestHash),
    },
    ecKeys,
    pqKeys,
  );
function changeHeader(raw: ObjectData, update: (header: ObjectData) => void) {
  const parts = String(ec(raw).jws).split(".");
  const header = JSON.parse(Buffer.from(parts[0]!, "base64url").toString());
  update(header);
  parts[0] = Buffer.from(JSON.stringify(header)).toString("base64url");
  ec(raw).jws = parts.join(".");
}
function flip(encoded: string, encoding: "base64" | "base64url") {
  const bytes = Buffer.from(encoded, encoding);
  bytes[0] = bytes[0]! ^ 1;
  return bytes.toString(encoding);
}

describe("hybrid cryptographic engines, synthetic keys only", () => {
  it.each(["2.0.0", "2.1.0"])(
    "requires both signatures over the same raw digest for %s",
    async (version) => {
      // These signatures bind the interoperability message, not the synthetic
      // record contents. Hash verification is tested separately below.
      const result = await verify(manifest(version));
      expect(result.status).toBe("verified");
      expect(
        result.signatureComponents?.map((part) => [
          part.algorithm,
          part.status,
        ]),
      ).toEqual([
        ["ES256", "verified"],
        ["ML-DSA-65", "verified"],
      ]);
      expect(result.signatureComponents?.[1]?.keyFingerprint).toBe(
        quantum.sha256,
      );
    },
  );

  it.each([
    "digest",
    "classical",
    "post-quantum",
    "missing post-quantum",
    "hex-text payload",
  ])("does not pass a broken %s", async (kind) => {
    const raw = manifest();
    if (kind === "digest") object(raw.hashes).manifestHash = "0".repeat(64);
    if (kind === "post-quantum")
      pq(raw).signature = flip(String(pq(raw).signature), "base64");
    if (kind === "missing post-quantum") delete pq(raw).signature;
    if (kind === "classical" || kind === "hex-text payload") {
      const parts = String(ec(raw).jws).split(".");
      if (kind === "classical") parts[2] = flip(parts[2]!, "base64url");
      else
        parts[1] = Buffer.from(interop.messageHex, "utf8").toString(
          "base64url",
        );
      ec(raw).jws = parts.join(".");
    }
    const result = await verify(raw);
    expect(result.status).toBe("mismatch");
    expect(
      result.signatureComponents?.some((part) => part.status === "mismatch"),
    ).toBe(true);
  });

  it.each([
    "unknown EC",
    "empty EC",
    "empty PQ",
    "bad PQ pin",
    "duplicate EC",
    "duplicate PQ",
    "oversized EC",
    "oversized PQ",
  ])("fails closed with %s trust configuration", async (kind) => {
    const raw = manifest();
    let ecKeys = [classical];
    let pqKeys = [quantum];
    if (kind === "unknown EC")
      changeHeader(raw, (header) => {
        header.kid = "attacker-key";
      });
    if (kind === "empty EC") ecKeys = [];
    if (kind === "empty PQ") pqKeys = [];
    if (kind === "bad PQ pin")
      pqKeys = [{ ...quantum, sha256: "0".repeat(64) }];
    if (kind === "duplicate EC") ecKeys.push(classical);
    if (kind === "duplicate PQ") pqKeys.push(quantum);
    if (kind === "oversized EC") ecKeys = Array(65).fill(classical);
    if (kind === "oversized PQ") pqKeys = Array(65).fill(quantum);
    expect((await verify(raw, ecKeys, pqKeys)).status).toBe("unsupported");
  });

  it.each(["EC", "PQ"])("does not approve a revoked %s key", async (kind) => {
    expect(
      (
        await verify(
          manifest(),
          [{ ...classical, status: kind === "EC" ? "revoked" : "active" }],
          [{ ...quantum, status: kind === "PQ" ? "revoked" : "active" }],
        )
      ).status,
    ).toBe("mismatch");
  });

  it.each([
    "algorithm",
    "unknown critical",
    "stripped critical",
    "missing kid",
    "mixed flat",
    "unknown hash profile",
    "downgrade",
  ])("refuses an unreviewed %s contract", async (kind) => {
    const raw = manifest("2.1.0");
    if (kind === "algorithm") pq(raw).algorithm = "ML-DSA-87";
    if (kind === "unknown critical")
      changeHeader(raw, (header) => {
        header.crit = ["other"];
      });
    if (kind === "stripped critical")
      changeHeader(raw, (header) => {
        delete header.crit;
      });
    if (kind === "missing kid")
      changeHeader(raw, (header) => {
        delete header.kid;
      });
    if (kind === "mixed flat")
      signatures(raw).platformSignature = interop.classical.standardJws;
    if (kind === "unknown hash profile")
      object(raw.hashes).profile = "future-profile";
    if (kind === "downgrade") {
      raw.schemaVersion = "2.0.0";
      delete raw.recordDetails;
    }
    expect((await verify(raw)).status).toBe("unsupported");
  });

  it("never fetches a record-selected key, library or URL", async () => {
    const raw = manifest();
    pq(raw).publicKeyRef = "https://example.invalid/attacker-key";
    pq(raw).libraryVersion = "run-remote-code";
    pq(raw).publicKey = interop.postQuantum.publicKeyBase64;
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected fetch"));
    try {
      expect((await verify(raw)).status).toBe("verified");
      expect(
        (await verifyHybridManifestSignatures(parse(raw))).status,
      ).not.toBe("verified");
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("enforces canonical base64 and the pinned public PQ key fingerprint", () => {
    const key = TRUSTED_QUANTUM_KEYS[0]!;
    expect(sha(decodeHybridBase64(key.publicKeyBase64, 1952))).toBe(key.sha256);
    expect(() => decodeHybridBase64("AA==", 1)).not.toThrow();
    expect(() => decodeHybridBase64("AB==", 1)).toThrow(/canonical/);
    for (const encoded of ["AA", "AA__", "AA==\n", "", "A==="])
      expect(() => decodeHybridBase64(encoded, 1)).toThrow();
    expect(() =>
      decodeHybridBase64(interop.postQuantum.signatureBase64, 1952),
    ).toThrow();
  });

  it.each(["kidless", "thumbprint"])(
    "supports %s issuance only against the reviewed EC registry",
    async (mode) => {
      const keys = await webcrypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"],
      );
      const jwk = {
        ...(await webcrypto.subtle.exportKey("jwk", keys.publicKey)),
        kid: "synthetic-new-ec",
        alg: "ES256",
        use: "sig",
      } as PublicJwk;
      const key = trustedClassical(jwk);
      const raw = manifest(mode === "kidless" ? "2.0.0" : "2.1.0");
      const header =
        mode === "kidless"
          ? { alg: "ES256", typ: "JWS" }
          : {
              alg: "ES256",
              typ: "JWS",
              kid: `urn:ietf:params:oauth:jwk-thumbprint:sha-256:${key.jwkThumbprint}`,
              crit: ["uceRecordFormat"],
              uceRecordFormat: "extended-v1",
            };
      const input = `${Buffer.from(JSON.stringify(header)).toString("base64url")}.${Buffer.from(interop.messageHex, "hex").toString("base64url")}`;
      const signature = await webcrypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        keys.privateKey,
        new TextEncoder().encode(input),
      );
      ec(raw).jws = `${input}.${Buffer.from(signature).toString("base64url")}`;
      expect((await verify(raw, [key])).status).toBe("verified");
      if (mode === "kidless")
        expect((await verify(raw, [key, classical])).status).toBe(
          "unsupported",
        );
    },
  );
});

describe("hybrid hash engines and release qualification", () => {
  it.each(["2.0.0", "2.1.0"])(
    "verifies a complete %s synthetic preimage-to-dual-signature chain",
    async (version) => {
      const raw = manifest(version, false);
      const digest = Buffer.from(
        String(object(raw.hashes).manifestHash),
        "hex",
      );
      const ecPair = await webcrypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"],
      );
      const jwk = {
        ...(await webcrypto.subtle.exportKey("jwk", ecPair.publicKey)),
        kid: "synthetic-chain-ec",
        alg: "ES256",
        use: "sig",
      } as PublicJwk;
      const header = {
        alg: "ES256",
        typ: "JWS",
        kid: jwk.kid,
        ...(version === "2.1.0"
          ? { crit: ["uceRecordFormat"], uceRecordFormat: "extended-v1" }
          : {}),
      };
      const input = `${Buffer.from(JSON.stringify(header)).toString("base64url")}.${digest.toString("base64url")}`;
      const ecSignature = await webcrypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        ecPair.privateKey,
        new TextEncoder().encode(input),
      );
      ec(raw).jws =
        `${input}.${Buffer.from(ecSignature).toString("base64url")}`;
      const pqPair = ml_dsa65.keygen();
      const pqKey = {
        ...quantum,
        publicKeyBase64: Buffer.from(pqPair.publicKey).toString("base64"),
        sha256: sha(pqPair.publicKey),
      };
      pq(raw).signature = Buffer.from(
        ml_dsa65.sign(digest, pqPair.secretKey),
      ).toString("base64");
      const parsed = parse(raw);
      expect((await verifyHybridManifestHash(parsed)).status).toBe("verified");
      expect(
        (
          await verifyHybridManifestSignatures(
            parsed,
            [trustedClassical(jwk)],
            [pqKey],
          )
        ).status,
      ).toBe("verified");
      // A signature using a different context is not the reviewed publisher mode.
      pq(raw).signature = Buffer.from(
        ml_dsa65.sign(digest, pqPair.secretKey, {
          context: new TextEncoder().encode("different-domain"),
        }),
      ).toString("base64");
      expect(
        (
          await verifyHybridManifestSignatures(
            parse(raw),
            [trustedClassical(jwk)],
            [pqKey],
          )
        ).status,
      ).toBe("mismatch");
    },
  );
  it.each(["2.0.0", "2.1.0"])(
    "recomputes the reviewed %s public vector without a runtime claim",
    async (version) => {
      const raw = manifest(version, false);
      const result = await verifyHybridManifestHash(parse(raw));
      expect(result.status).toBe("verified");
      expect(result.hashProvenance?.computedHash).toBe(
        object(raw.hashes).manifestHash,
      );
      if (version === "2.1.0")
        expect(canonicalExtendedJson(extendedHashInput(raw))).toBe(
          vectors.records.find((v) => v.id === "2.1.0-base")!.expected
            .canonical,
        );
      object((raw.files as ObjectData[])[0]).sha256 = "0".repeat(64);
      expect((await verifyHybridManifestHash(parse(raw))).status).toBe(
        version === "2.1.0" ? "mismatch" : "unsupported",
      );
    },
  );

  it.each(["2.0.0", "2.1.0"])(
    "keeps %s UI, WebMCP and report verification gated until genuine public qualification",
    async (version) => {
      expect(QUALIFIED_HYBRID_VERSIONS).toEqual([]);
      expect(Object.isFrozen(QUALIFIED_HYBRID_VERSIONS)).toBe(true);
      const raw = manifest(version, false);
      const snapshot = await verifyRecord(parse(raw));
      for (const id of ["canonical_manifest_hash", "platform_signature"]) {
        const check = snapshot.checks.find((item) => item.id === id)!;
        expect(check.status).toBe("unsupported");
        expect(check.signatureComponents).toBeUndefined();
      }
      expect(snapshot.coverage.manifestContents).toBe("not_recomputed");
      expect(snapshot.summary).toContain(
        "Cryptographic verification is not yet complete",
      );
      const controller = new AppController(
        async () => new Response(JSON.stringify(raw)),
        async () => ({
          id: "independent_anchor",
          label: "Chronology",
          status: "retryable",
          explanation: "Offline fixture test.",
        }),
      );
      await controller.load(
        `https://cbyuce.com/verify/${String(object(raw.hashes).manifestHash)}`,
      );
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
      const report = createVerificationReport(state);
      expect(report.checks).toEqual(result.structuredResult.checks);
      expect(report.coverage).toEqual(result.structuredResult.coverage);
    },
  );
});
