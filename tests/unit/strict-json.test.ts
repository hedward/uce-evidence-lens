import { describe, expect, it } from "vitest";
import {
  parseStrictJson,
  ValidationError,
} from "../../src/security/strict-json";
import { parseUntrustedJson } from "../../src/security/untrusted";
import { validPublicResponse } from "../fixtures/public-record";

describe("strict raw JSON parsing", () => {
  it("preserves a standard public response and ordinary decimal spellings", () => {
    expect(parseUntrustedJson(JSON.stringify(validPublicResponse))).toEqual(
      validPublicResponse,
    );
    expect(parseStrictJson('{"a":1.0,"b":1e0,"c":0.25,"d":1e-7}')).toEqual({
      a: 1,
      b: 1,
      c: 0.25,
      d: 1e-7,
    });
    expect(parseStrictJson('{"nested":{"same":1},"other":{"same":2}}')).toEqual(
      {
        nested: { same: 1 },
        other: { same: 2 },
      },
    );
  });

  it.each([
    '{"a":1,"a":2}',
    '{"a":1,"\\u0061":2}',
    '{"\\u0061":1,"a":2}',
    '{"nested":{"x":1,"x":2}}',
  ])("rejects duplicate object names in %s", (input) => {
    expect(() => parseStrictJson(input)).toThrow(/duplicate field names/);
  });

  it.each(['{"__proto__":{}}', '{"\\u005f_proto__":{}}', '{"constructor":1}'])(
    "rejects prototype-affecting names in %s",
    (input) => {
      expect(() => parseStrictJson(input)).toThrow(/prohibited field name/);
    },
  );

  it.each([
    '"\\ud800"',
    '"\\udc00"',
    '"\\ud800x"',
    '"\ud800"',
    '{"\\udc00":1}',
  ])("rejects unpaired Unicode surrogate in %s", (input) => {
    expect(() => parseStrictJson(input)).toThrow(/unpaired surrogate/);
  });

  it("accepts paired literal and escaped surrogate code units", () => {
    expect(parseStrictJson('"\\ud83d\\ude00"')).toBe("😀");
    expect(parseStrictJson('"😀"')).toBe("😀");
    expect(parseStrictJson('"\\ud83d\ude00"')).toBe("😀");
  });

  it.each([
    "9007199254740992",
    "1e400",
    "1e-400",
    "0.10000000000000001",
    "1.0000000000000001",
    "123456789012345678901234567890",
  ])("rejects unsafe or lossy numeric literal %s", (input) => {
    expect(() => parseStrictJson(input)).toThrow(
      /safe range|decimal precision/,
    );
  });

  it("keeps prior size, depth, collection, and string bounds", () => {
    expect(() => parseStrictJson("[]", { maxChars: 1 })).toThrow(
      /exceeds 1 MB/,
    );
    expect(() => parseStrictJson("[]", { maxChars: 1_000_001 })).toThrow(
      /Invalid JSON size limit/,
    );
    expect(() => parseStrictJson('"' + "x".repeat(20_001) + '"')).toThrow(
      /safe display limit/,
    );
    expect(() =>
      parseStrictJson("[".repeat(13) + "0" + "]".repeat(13)),
    ).toThrow(/nesting is too deep/);
    expect(() => parseStrictJson(JSON.stringify(Array(101).fill(0)))).toThrow(
      /array is too large/,
    );
    expect(() =>
      parseStrictJson(
        JSON.stringify(
          Object.fromEntries(
            Array.from({ length: 101 }, (_, i) => [`k${i}`, i]),
          ),
        ),
      ),
    ).toThrow(/too many fields/);
  });

  it("returns safe errors without echoing attacker-controlled values", () => {
    const secret = "attacker-secret";
    try {
      parseStrictJson(`{"${secret}":1,"${secret}":2}`);
      throw new Error("Expected a validation error");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).not.toContain(secret);
    }
  });
});
