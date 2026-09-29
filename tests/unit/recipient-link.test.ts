import { describe, expect, it } from "vitest";
import { DEMO_RECORD_ID, DEMO_VERIFICATION_URL } from "../../src/records/demo";
import {
  canonicalPublicRecordReference,
  createRecipientRecordLink,
  parseRecipientRecordHash,
} from "../../src/records/recipient-link";

const arweaveId = "a".repeat(43);

describe("recipient record links", () => {
  it("normalizes approved public inputs without sharing unrelated URL details", () => {
    expect(canonicalPublicRecordReference(DEMO_RECORD_ID)).toBe(
      `${DEMO_VERIFICATION_URL}?format=json`,
    );
    expect(
      canonicalPublicRecordReference(
        `https://cbyuce.com/verify/${DEMO_RECORD_ID}?format=json#private`,
      ),
    ).toBe(`${DEMO_VERIFICATION_URL}?format=json`);
    expect(
      canonicalPublicRecordReference(
        `https://arweave.net/${arweaveId}/ignored?contact=hidden`,
      ),
    ).toBe(`https://arweave.net/${arweaveId}`);
  });

  it("uses the live public demo reference rather than the bundled-demo alias", () => {
    expect(canonicalPublicRecordReference(DEMO_VERIFICATION_URL)).toBe(
      `${DEMO_VERIFICATION_URL}?format=json`,
    );
    expect(() => canonicalPublicRecordReference("demo")).toThrow(
      /approved public record reference/i,
    );
    expect(() => canonicalPublicRecordReference("manifest.json")).toThrow();
  });

  it("creates an encoded same-page record fragment and round trips it", () => {
    const link = createRecipientRecordLink(
      `https://arweave.net/${arweaveId}`,
      "https://lens.example/view?contact=private#main",
    );

    expect(link.reference).toBe(`https://arweave.net/${arweaveId}`);
    expect(link.url).toBe(
      `https://lens.example/view#record=${encodeURIComponent(link.reference)}`,
    );
    expect(parseRecipientRecordHash(new URL(link.url).hash)).toEqual({
      kind: "record",
      reference: link.reference,
    });
  });

  it.each([
    "#record=",
    "#record=%",
    "#record%ZZ=value",
    "#record[]=value",
    `#record=${encodeURIComponent(DEMO_VERIFICATION_URL)}&record=${encodeURIComponent(DEMO_VERIFICATION_URL)}`,
    `#record=${encodeURIComponent(DEMO_VERIFICATION_URL)}&other=value`,
    `#other=value&record=${encodeURIComponent(DEMO_VERIFICATION_URL)}`,
  ])("rejects an invalid recipient fragment: %s", (hash) => {
    expect(() => parseRecipientRecordHash(hash)).toThrow();
  });

  it("bounds recipient fragments before decoding them", () => {
    expect(() =>
      parseRecipientRecordHash(`#record=${"a".repeat(2_100)}`),
    ).toThrow(/too long/i);
  });

  it("leaves ordinary same-page navigation alone", () => {
    expect(parseRecipientRecordHash("#main")).toEqual({ kind: "unrelated" });
    expect(parseRecipientRecordHash("#details=verification")).toEqual({
      kind: "unrelated",
    });
  });
});
