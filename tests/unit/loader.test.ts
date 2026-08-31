import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyPublicInput,
  loadPublicRecord,
  MAX_RESPONSE_BYTES,
} from "../../src/records/loader";
import { validPublicResponse } from "../fixtures/public-record";

describe("public loading", () => {
  afterEach(() => vi.useRealTimers());

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

  it("rejects an oversized response from Content-Length before reading it", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(validPublicResponse), {
        status: 200,
        headers: { "content-length": String(MAX_RESPONSE_BYTES + 1) },
      }),
    );
    await expect(loadPublicRecord("a".repeat(64), fetcher)).rejects.toThrow(
      /exceeds the 1 MB safety limit/,
    );
  });

  it("cancels a streamed response as soon as it exceeds the byte limit", async () => {
    let canceled = false;
    const body = new ReadableStream<Uint8Array>({
      start(streamController) {
        streamController.enqueue(new Uint8Array(MAX_RESPONSE_BYTES + 1));
      },
      cancel() {
        canceled = true;
      },
    });
    const fetcher = vi.fn().mockResolvedValue(new Response(body));
    await expect(loadPublicRecord("a".repeat(64), fetcher)).rejects.toThrow(
      /exceeds the 1 MB safety limit/,
    );
    expect(canceled).toBe(true);
  });

  it("keeps the timeout active while a response body is streaming", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(streamController) {
              init?.signal?.addEventListener("abort", () =>
                streamController.error(
                  new DOMException("Aborted", "AbortError"),
                ),
              );
            },
          }),
        ),
    );
    const pending = loadPublicRecord("a".repeat(64), fetcher);
    const rejection = expect(pending).rejects.toThrow(/within 10 seconds/);
    await vi.advanceTimersByTimeAsync(10_000);
    await rejection;
  });

  it("rejects a response with no JSON body", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null));
    await expect(loadPublicRecord("a".repeat(64), fetcher)).rejects.toThrow(
      /no JSON body/,
    );
  });

  it("rejects an Arweave response redirected to a different transaction", async () => {
    const requestedTxId = "Oagba5o2yoEn-JT1C1RbVr0VVKdcxH797tHk9Xao8kg";
    const response = new Response(JSON.stringify(validPublicResponse));
    Object.defineProperty(response, "url", {
      value: "https://arweave.net/7agba5o2yoEn-JT1C1RbVr0VVKdcxH797tHk9Xao8kg",
    });
    const fetcher = vi.fn().mockResolvedValue(response);
    await expect(
      loadPublicRecord(`https://arweave.net/${requestedTxId}`, fetcher),
    ).rejects.toThrow(/does not match the requested transaction/);
  });

  it("loads a direct Arweave manifest when the final transaction remains bound", async () => {
    const requestedTxId = "Oagba5o2yoEn-JT1C1RbVr0VVKdcxH797tHk9Xao8kg";
    const response = new Response(JSON.stringify(validPublicResponse));
    Object.defineProperty(response, "url", {
      value: `https://arweave.net/${requestedTxId}`,
    });
    const record = await loadPublicRecord(
      `https://arweave.net/${requestedTxId}`,
      vi.fn().mockResolvedValue(response),
    );
    expect(record.arweaveTxId).toBe(requestedTxId);
    expect(record.id).toBeUndefined();
  });
});
