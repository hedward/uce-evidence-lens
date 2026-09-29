import { Buffer } from "node:buffer";
import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import fixture from "../fixtures/hybrid-interop.json";

const message = Buffer.from(fixture.messageHex, "hex");
const publicKey = Buffer.from(fixture.postQuantum.publicKeyBase64, "base64");
const signature = Buffer.from(fixture.postQuantum.signatureBase64, "base64");

async function verifyJws(jws: string, extended: boolean): Promise<void> {
  const [protectedPart, payloadPart, signaturePart] = jws.split(".");
  expect(protectedPart && payloadPart && signaturePart).toBeTruthy();
  const header = JSON.parse(
    Buffer.from(protectedPart!, "base64url").toString("utf8"),
  ) as Record<string, unknown>;
  expect(header).toEqual(
    extended
      ? {
          alg: "ES256",
          kid: fixture.classical.publicJwk.kid,
          typ: "JWS",
          uceRecordFormat: "extended-v1",
          crit: ["uceRecordFormat"],
        }
      : { alg: "ES256", kid: fixture.classical.publicJwk.kid, typ: "JWS" },
  );
  expect(Buffer.from(payloadPart!, "base64url")).toEqual(message);
  const key = await webcrypto.subtle.importKey(
    "jwk",
    fixture.classical.publicJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  const input = new TextEncoder().encode(`${protectedPart}.${payloadPart}`);
  const sig = Buffer.from(signaturePart!, "base64url");
  expect(sig).toHaveLength(64);
  expect(
    await webcrypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      sig,
      input,
    ),
  ).toBe(true);
  input[0] = input[0]! ^ 1;
  expect(
    await webcrypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      sig,
      input,
    ),
  ).toBe(false);
}

describe("synthetic hybrid interoperability vector — not a publisher-issued record", () => {
  it("cross-verifies the publisher-library 0.4.1 ML-DSA-65 signature with client 0.7.1", () => {
    expect(fixture.kind).toBe(
      "synthetic-hybrid-cryptographic-interoperability",
    );
    expect(fixture.publisherLibrary).toBe("@noble/post-quantum@0.4.1");
    expect(fixture.verifierLibrary).toBe("@noble/post-quantum@0.7.1");
    expect(message).toHaveLength(32);
    expect(publicKey).toHaveLength(1952);
    expect(signature).toHaveLength(3309);
    expect(ml_dsa65.verify(signature, message, publicKey)).toBe(true);
    const altered = Buffer.from(message);
    altered[0] = altered[0]! ^ 1;
    expect(ml_dsa65.verify(signature, altered, publicKey)).toBe(false);
    const badSignature = Buffer.from(signature);
    badSignature[0] = badSignature[0]! ^ 1;
    expect(ml_dsa65.verify(badSignature, message, publicKey)).toBe(false);
  });

  it("verifies the standard and extended critical-header ES256 compact JWS", async () => {
    await verifyJws(fixture.classical.standardJws, false);
    await verifyJws(fixture.classical.extendedJws, true);
  });
});
