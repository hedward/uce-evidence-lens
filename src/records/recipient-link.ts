import { DEMO_RECORD_ID, DEMO_VERIFICATION_URL } from "./demo";
import { classifyPublicInput } from "./loader";

const MAX_RECIPIENT_HASH_LENGTH = 2_048;
const MAX_PUBLIC_REFERENCE_LENGTH = 512;

export class RecipientLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecipientLinkError";
  }
}

export interface RecipientRecordLink {
  reference: string;
  url: string;
}

export type ParsedRecipientRecordHash =
  { kind: "unrelated" } | { kind: "record"; reference: string };

/**
 * Convert an approved public loader input into a share-safe URL reference.
 * The bundled-demo aliases are deliberately excluded. The demo record's public
 * ID and verification URL are treated as a request for its live public record.
 */
export function canonicalPublicRecordReference(input: string): string {
  const value = input.trim();
  if (!value || value.toLowerCase() === "demo") {
    throw new RecipientLinkError(
      "A recipient link requires an approved public record reference.",
    );
  }
  if (value.length > MAX_PUBLIC_REFERENCE_LENGTH) {
    throw new RecipientLinkError("The public record reference is too long.");
  }

  const classified = classifyPublicInput(value);
  if ("demo" in classified) {
    if (value === DEMO_RECORD_ID || value === DEMO_VERIFICATION_URL) {
      return `${DEMO_VERIFICATION_URL}?format=json`;
    }
    throw new RecipientLinkError(
      "The bundled demo alias cannot be used in a recipient link.",
    );
  }

  if (classified.loadedFrom === "cbyuce") {
    return `https://cbyuce.com/verify/${classified.expectedId}?format=json`;
  }
  return classified.url.toString();
}

export function createRecipientRecordLink(
  input: string,
  pageUrl: string | URL,
): RecipientRecordLink {
  const reference = canonicalPublicRecordReference(input);
  let url: URL;
  try {
    url = new URL(pageUrl.toString());
  } catch {
    throw new RecipientLinkError("The current page URL is not valid.");
  }
  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username ||
    url.password
  ) {
    throw new RecipientLinkError(
      "Recipient links can only be created for an HTTP(S) page URL.",
    );
  }
  // Page query parameters are not needed to identify the public record and may
  // contain unrelated state that should not be propagated to a recipient.
  url.search = "";
  url.hash = `record=${encodeURIComponent(reference)}`;
  return { reference, url: url.toString() };
}

export function parseRecipientRecordHash(
  hash: string,
): ParsedRecipientRecordHash {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return { kind: "unrelated" };

  const recordLike = raw
    .split("&")
    .some(
      (part) =>
        part === "record" ||
        part.startsWith("record=") ||
        part.startsWith("record%") ||
        part.startsWith("record["),
    );
  if (!recordLike) return { kind: "unrelated" };
  if (raw.length > MAX_RECIPIENT_HASH_LENGTH) {
    throw new RecipientLinkError("The recipient record fragment is too long.");
  }

  const parts = raw.split("&");
  if (parts.length !== 1 || !parts[0]?.startsWith("record=")) {
    throw new RecipientLinkError(
      "The recipient record fragment contains duplicate or unknown parameters.",
    );
  }
  const encodedReference = parts[0].slice("record=".length);
  if (!encodedReference) {
    throw new RecipientLinkError("The recipient record fragment is empty.");
  }

  let decodedReference: string;
  try {
    decodedReference = decodeURIComponent(encodedReference);
  } catch {
    throw new RecipientLinkError("The recipient record fragment is malformed.");
  }
  if (!decodedReference.trim()) {
    throw new RecipientLinkError("The recipient record fragment is empty.");
  }

  return {
    kind: "record",
    reference: canonicalPublicRecordReference(decodedReference),
  };
}
