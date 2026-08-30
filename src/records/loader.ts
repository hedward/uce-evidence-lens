import { demoRecord, DEMO_RECORD_ID, DEMO_VERIFICATION_URL } from "./demo";
import { parseUceRecord } from "./parser";
import type { UcePublicKeySet, UceRecord } from "../types/record";
import {
  ValidationError,
  isArweaveId,
  isPlainObject,
  isSha256,
  parseUntrustedJson,
  safeHttpsUrl,
} from "../security/untrusted";

const MAX_RESPONSE_CHARS = 1_000_000;
const ALLOWED_HOSTS = ["cbyuce.com", "arweave.net"] as const;

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export class PublicRecordError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "invalid_input"
      | "network"
      | "cors"
      | "http"
      | "invalid_response"
      | "unsupported",
  ) {
    super(message);
    this.name = "PublicRecordError";
  }
}

async function fetchJson(url: URL, fetcher: FetchLike): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetcher(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network request failed.";
    const likelyCors = /fetch|cors|network/i.test(message);
    throw new PublicRecordError(
      likelyCors
        ? "The public source could not be read from this browser origin. It may not permit CORS; use the bundled demo, an Arweave URL, or paste public JSON."
        : "The public source could not be reached.",
      likelyCors ? "cors" : "network",
    );
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok)
    throw new PublicRecordError(
      `Public source returned HTTP ${response.status}.`,
      "http",
    );
  if (response.url) safeHttpsUrl(response.url, ALLOWED_HOSTS);
  const text = await response.text();
  if (text.length > MAX_RESPONSE_CHARS) {
    throw new PublicRecordError(
      "Public response exceeds the 1 MB safety limit.",
      "invalid_response",
    );
  }
  try {
    return parseUntrustedJson(text);
  } catch (error) {
    throw new PublicRecordError(
      error instanceof Error
        ? error.message
        : "Public response was not valid JSON.",
      "invalid_response",
    );
  }
}

interface ClassifiedInput {
  url: URL;
  loadedFrom: UceRecord["loadedFrom"];
  expectedId?: string;
}

export function classifyPublicInput(
  input: string,
): ClassifiedInput | { demo: true } {
  const value = input.trim();
  if (
    !value ||
    value.toLowerCase() === "demo" ||
    value === DEMO_RECORD_ID ||
    value === DEMO_VERIFICATION_URL
  ) {
    return { demo: true };
  }
  if (isSha256(value)) {
    return {
      url: new URL(
        `https://cbyuce.com/verify/${value.toLowerCase()}?format=json`,
      ),
      expectedId: value.toLowerCase(),
      loadedFrom: "cbyuce",
    };
  }
  let url: URL;
  try {
    url = safeHttpsUrl(value, ALLOWED_HOSTS);
  } catch (error) {
    throw new PublicRecordError(
      error instanceof Error
        ? error.message
        : "Unsupported public record input.",
      "invalid_input",
    );
  }
  if (url.hostname === "cbyuce.com") {
    const match = /^\/verify\/([a-f0-9]{64})\/?$/i.exec(url.pathname);
    const expectedId = match?.[1]?.toLowerCase();
    if (!expectedId) {
      throw new PublicRecordError(
        "Only public CbyUCE /verify/<record-hash> URLs are supported.",
        "unsupported",
      );
    }
    url.search = "?format=json";
    return { url, loadedFrom: "cbyuce", expectedId };
  }
  const txId = url.pathname.split("/").filter(Boolean)[0];
  if (!txId || !isArweaveId(txId)) {
    throw new PublicRecordError(
      "Arweave URLs must identify one 43-character public transaction.",
      "unsupported",
    );
  }
  return {
    url: new URL(`https://arweave.net/${txId}`),
    loadedFrom: "arweave",
  };
}

export async function loadPublicRecord(
  input: string,
  fetcher: FetchLike = fetch,
): Promise<UceRecord> {
  const classified = classifyPublicInput(input);
  if ("demo" in classified) return structuredClone(demoRecord);
  const data = await fetchJson(classified.url, fetcher);
  try {
    return parseUceRecord(data, {
      source: classified.url.toString(),
      loadedFrom: classified.loadedFrom,
      expectedId: classified.expectedId,
    });
  } catch (error) {
    throw new PublicRecordError(
      error instanceof Error
        ? error.message
        : "Unsupported public record response.",
      error instanceof ValidationError ? "invalid_response" : "unsupported",
    );
  }
}

export function loadPastedRecord(text: string): UceRecord {
  const data = parseUntrustedJson(text);
  return parseUceRecord(data, {
    source: "Pasted public JSON (not independently retrieved)",
    loadedFrom: "pasted_json",
  });
}

export async function loadPublicKeys(
  record: UceRecord,
  fetcher: FetchLike = fetch,
): Promise<UcePublicKeySet | undefined> {
  if (record.publicKeys) return record.publicKeys;
  if (!record.platformPublicKeyRef || !isArweaveId(record.platformPublicKeyRef))
    return undefined;
  const source = new URL(`https://arweave.net/${record.platformPublicKeyRef}`);
  const data = await fetchJson(source, fetcher);
  if (
    !isPlainObject(data) ||
    !Array.isArray(data.keys) ||
    data.keys.length > 20
  ) {
    throw new PublicRecordError(
      "Public key response is not a supported JWKS document.",
      "invalid_response",
    );
  }
  const keys = data.keys.filter(isPlainObject).map((key) => ({
    kty: typeof key.kty === "string" ? key.kty : undefined,
    crv: typeof key.crv === "string" ? key.crv : undefined,
    x: typeof key.x === "string" ? key.x : undefined,
    y: typeof key.y === "string" ? key.y : undefined,
    kid: typeof key.kid === "string" ? key.kid : undefined,
    use: typeof key.use === "string" ? key.use : undefined,
    alg: typeof key.alg === "string" ? key.alg : undefined,
  }));
  return { keys, source: source.toString() };
}
