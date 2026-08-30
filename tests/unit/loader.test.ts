import { describe, expect, it, vi } from "vitest";
import {
  classifyPublicInput,
  loadPublicRecord,
} from "../../src/records/loader";
import { validPublicResponse } from "../fixtures/public-record";

describe("public loading", () => {
  it("restricts live retrieval to approved HTTPS routes", () => {
    expect(() => classifyPublicInput("http://cbyuce.com/verify/foo")).toThrow(
      /HTTPS/,
    );
    expect(() => classifyPublicInput("https://example.com/record")).toThrow(
      /approved/,
    );
  });

  it("surfaces network and CORS-style failure with a recovery path", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(
      loadPublicRecord(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        fetcher,
      ),
    ).rejects.toThrow(/bundled demo.*Arweave URL.*paste public JSON/i);
  });

  it("rejects a non-JSON public response", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("<html>not json</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );
    await expect(
      loadPublicRecord(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        fetcher,
      ),
    ).rejects.toThrow(/not valid JSON/);
  });

  it("loads a validated mocked public response", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(validPublicResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const record = await loadPublicRecord(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      fetcher,
    );
    expect(record.id).toBe("a".repeat(64));
  });
});
