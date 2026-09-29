#!/usr/bin/env node
// Test-only cross-version vector. Never imports publisher application code or keys.
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import console from "node:console";
import {
  createHash,
  createPublicKey,
  verify as nativeVerify,
  webcrypto,
} from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { TextEncoder } from "node:util";
import { ml_dsa65 as currentMlDsa65 } from "@noble/post-quantum/ml-dsa.js";

const fixturePath = resolve(
  import.meta.dirname,
  "../tests/fixtures/hybrid-interop.json",
);
const utf8 = new TextEncoder();
const b64url = (bytes) => Buffer.from(bytes).toString("base64url");
const fromB64url = (text) => {
  assert.match(text, /^[A-Za-z0-9_-]+$/);
  const bytes = Buffer.from(text, "base64url");
  assert.equal(bytes.toString("base64url"), text);
  return bytes;
};
const fromB64 = (text) => {
  assert.match(text, /^[A-Za-z0-9+/]+={0,2}$/);
  const bytes = Buffer.from(text, "base64");
  assert.equal(bytes.toString("base64"), text);
  return bytes;
};

// DER SubjectPublicKeyInfo prefix for id-ml-dsa-65 (FIPS 204), followed by 1952 raw public bytes.
const ML_DSA_65_SPKI_PREFIX = Buffer.from(
  "308207b2300b0609608648016503040312038207a100",
  "hex",
);

function verifyWithNodeNative(message, publicKey, signature) {
  if (Number(process.versions.node.split(".")[0]) < 24)
    return "unavailable (Node <24)";
  const spki = Buffer.concat([ML_DSA_65_SPKI_PREFIX, publicKey]);
  const key = createPublicKey({ key: spki, format: "der", type: "spki" });
  assert.equal(nativeVerify(null, message, key, signature), true);
  return "verified";
}

async function verifyJws(jws, publicJwk, message, extended) {
  const parts = jws.split(".");
  assert.equal(parts.length, 3);
  const header = JSON.parse(fromB64url(parts[0]).toString("utf8"));
  assert.deepEqual(
    header,
    extended
      ? {
          alg: "ES256",
          kid: publicJwk.kid,
          typ: "JWS",
          uceRecordFormat: "extended-v1",
          crit: ["uceRecordFormat"],
        }
      : { alg: "ES256", kid: publicJwk.kid, typ: "JWS" },
  );
  assert.deepEqual(fromB64url(parts[1]), message);
  const signature = fromB64url(parts[2]);
  assert.equal(signature.length, 64);
  const key = await webcrypto.subtle.importKey(
    "jwk",
    publicJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  assert.equal(
    await webcrypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      signature,
      utf8.encode(`${parts[0]}.${parts[1]}`),
    ),
    true,
  );
}

async function checkFixture(fixture) {
  assert.equal(fixture.kind, "synthetic-hybrid-cryptographic-interoperability");
  assert.equal(fixture.publisherLibrary, "@noble/post-quantum@0.4.1");
  assert.equal(fixture.verifierLibrary, "@noble/post-quantum@0.7.1");
  const message = Buffer.from(fixture.messageHex, "hex");
  assert.equal(message.length, 32);
  assert.equal(message.toString("hex"), fixture.messageHex);
  const publicKey = fromB64(fixture.postQuantum.publicKeyBase64);
  const signature = fromB64(fixture.postQuantum.signatureBase64);
  assert.equal(publicKey.length, 1952);
  assert.equal(signature.length, 3309);
  assert.equal(currentMlDsa65.verify(signature, message, publicKey), true);
  const altered = Buffer.from(message);
  altered[0] ^= 1;
  assert.equal(currentMlDsa65.verify(signature, altered, publicKey), false);
  await verifyJws(
    fixture.classical.standardJws,
    fixture.classical.publicJwk,
    message,
    false,
  );
  await verifyJws(
    fixture.classical.extendedJws,
    fixture.classical.publicJwk,
    message,
    true,
  );
  return verifyWithNodeNative(message, publicKey, signature);
}

async function generate(publisherLibraryPath) {
  assert.ok(
    publisherLibraryPath && isAbsolute(publisherLibraryPath),
    "--generate requires --publisher-library /absolute/path/to/@noble/post-quantum/esm/ml-dsa.js",
  );
  const packageInfo = JSON.parse(
    readFileSync(
      join(dirname(dirname(publisherLibraryPath)), "package.json"),
      "utf8",
    ),
  );
  assert.equal(packageInfo.name, "@noble/post-quantum");
  assert.equal(packageInfo.version, "0.4.1");
  const { ml_dsa65: publisherMlDsa65 } = await import(
    pathToFileURL(publisherLibraryPath).href
  );

  const message = createHash("sha256")
    .update(
      "UCE Evidence Lens synthetic hybrid interoperability vector",
      "utf8",
    )
    .digest();
  const classical = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const exported = await webcrypto.subtle.exportKey("jwk", classical.publicKey);
  const publicJwk = {
    kty: "EC",
    crv: "P-256",
    x: exported.x,
    y: exported.y,
    kid: "synthetic-hybrid-interop-ec",
    alg: "ES256",
    use: "sig",
  };
  const signJws = async (extended) => {
    const header = {
      alg: "ES256",
      kid: publicJwk.kid,
      typ: "JWS",
      ...(extended
        ? { uceRecordFormat: "extended-v1", crit: ["uceRecordFormat"] }
        : {}),
    };
    const encodedHeader = b64url(utf8.encode(JSON.stringify(header)));
    const encodedPayload = b64url(message);
    const input = `${encodedHeader}.${encodedPayload}`;
    const rawSignature = await webcrypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      classical.privateKey,
      utf8.encode(input),
    );
    return `${input}.${b64url(rawSignature)}`;
  };
  const quantum = publisherMlDsa65.keygen();
  const quantumSignature = publisherMlDsa65.sign(quantum.secretKey, message);
  assert.equal(
    publisherMlDsa65.verify(quantum.publicKey, message, quantumSignature),
    true,
  );
  const fixture = {
    kind: "synthetic-hybrid-cryptographic-interoperability",
    warning:
      "Synthetic in-memory test keys only. Not a publisher-issued UCE record or production verification vector.",
    publisherRevision: "81abec2654ebd2f858ae4c6302a058ce7c1bb3de",
    publisherLibrary: "@noble/post-quantum@0.4.1",
    verifierLibrary: "@noble/post-quantum@0.7.1",
    messageHex: message.toString("hex"),
    classical: {
      publicJwk,
      standardJws: await signJws(false),
      extendedJws: await signJws(true),
    },
    postQuantum: {
      algorithm: "ML-DSA-65",
      publicKeyBase64: Buffer.from(quantum.publicKey).toString("base64"),
      signatureBase64: Buffer.from(quantumSignature).toString("base64"),
    },
  };
  const nativeResult = await checkFixture(fixture);
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  console.log(
    `Generated public-only synthetic fixture; Node native ML-DSA: ${nativeResult}.`,
  );
}

const args = process.argv.slice(2);
const generating = args.includes("--generate");
const libraryIndex = args.indexOf("--publisher-library");
if (
  args.some(
    (arg) =>
      !["--generate", "--publisher-library"].includes(arg) &&
      (libraryIndex < 0 || args[libraryIndex + 1] !== arg),
  )
) {
  throw new Error(
    "Unknown argument. Use --generate --publisher-library /absolute/path, or no arguments to check.",
  );
}
if (generating) {
  await generate(libraryIndex >= 0 ? args[libraryIndex + 1] : undefined);
} else {
  assert.equal(
    libraryIndex,
    -1,
    "--publisher-library is only used with --generate",
  );
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
  const nativeResult = await checkFixture(fixture);
  console.log(
    `Synthetic hybrid interoperability fixture verified; Node native ML-DSA: ${nativeResult}.`,
  );
}
