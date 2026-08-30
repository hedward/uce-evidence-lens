const MAX_JSON_CHARS = 1_000_000;
const MAX_STRING_CHARS = 20_000;
const MAX_DEPTH = 12;
const MAX_ARRAY_LENGTH = 100;
const MAX_OBJECT_KEYS = 100;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function inspect(value: unknown, depth: number): void {
  if (depth > MAX_DEPTH) throw new ValidationError("JSON nesting is too deep.");
  if (typeof value === "string" && value.length > MAX_STRING_CHARS) {
    throw new ValidationError("A JSON string exceeds the safe display limit.");
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_LENGTH)
      throw new ValidationError("A JSON array is too large.");
    value.forEach((item) => inspect(item, depth + 1));
  } else if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length > MAX_OBJECT_KEYS)
      throw new ValidationError("A JSON object has too many fields.");
    keys.forEach((key) => inspect(value[key], depth + 1));
  }
}

export function parseUntrustedJson(text: string): unknown {
  if (!text.trim()) throw new ValidationError("Paste a JSON record first.");
  if (text.length > MAX_JSON_CHARS)
    throw new ValidationError("JSON input exceeds 1 MB.");
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new ValidationError("The supplied text is not valid JSON.");
  }
  inspect(value, 0);
  return value;
}

export function requiredObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!isPlainObject(value))
    throw new ValidationError(`${label} must be a JSON object.`);
  return value;
}

export function requiredString(
  value: unknown,
  label: string,
  max = 500,
): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new ValidationError(
      `${label} must be a non-empty string under ${max} characters.`,
    );
  }
  return value;
}

export function optionalString(
  value: unknown,
  label: string,
  max = 500,
): string | undefined {
  return value === undefined || value === null
    ? undefined
    : requiredString(value, label, max);
}

export function requiredInteger(
  value: unknown,
  label: string,
  min = 0,
): number {
  if (!Number.isSafeInteger(value) || (value as number) < min) {
    throw new ValidationError(
      `${label} must be an integer of at least ${min}.`,
    );
  }
  return value as number;
}

export function optionalBoolean(
  value: unknown,
  label: string,
): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean")
    throw new ValidationError(`${label} must be a boolean.`);
  return value;
}

export function optionalNumber(
  value: unknown,
  label: string,
): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${label} must be a finite number.`);
  }
  return value;
}

export function isSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

export function isArweaveId(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function safeHttpsUrl(
  value: string,
  allowedHosts: readonly string[],
): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ValidationError("Enter a valid URL.");
  }
  if (url.protocol !== "https:")
    throw new ValidationError("Only HTTPS public sources are supported.");
  const allowed = allowedHosts.some(
    (host) =>
      url.hostname === host ||
      (host === "arweave.net" && url.hostname.endsWith(".arweave.net")),
  );
  if (!allowed)
    throw new ValidationError(
      "That host is not an approved public UCE source.",
    );
  if (url.username || url.password)
    throw new ValidationError("URLs containing credentials are not allowed.");
  return url;
}
