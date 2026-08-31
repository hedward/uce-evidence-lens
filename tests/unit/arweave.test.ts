import { describe, expect, it, vi } from "vitest";
import { demoRecord } from "../../src/records/demo";
import { verifyArweaveChronology } from "../../src/verification/arweave";

const blockHash = "B".repeat(64);
const txId = demoRecord.arweaveTxId!;
const blockHeight = 1_975_060;
const blockTimestamp = 1_786_108_342;

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function recordWithReportedAnchor() {
  return {
    ...structuredClone(demoRecord),
    reportedArweaveBlockHeight: blockHeight,
    reportedArweaveBlockTimestamp: new Date(
      blockTimestamp * 1000,
    ).toISOString(),
  };
}

function confirmedFetcher(
  options: { txs?: string[]; timestamp?: number } = {},
) {
  return vi
    .fn()
    .mockResolvedValueOnce(
      jsonResponse({
        block_height: blockHeight,
        block_indep_hash: blockHash,
        number_of_confirmations: 24,
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        height: blockHeight,
        indep_hash: blockHash,
        timestamp: options.timestamp ?? blockTimestamp,
        txs: options.txs ?? [txId],
      }),
    );
}

describe("direct Arweave chronology verification", () => {
  it("treats an offline gateway as retryable, not a mismatch", async () => {
    const result = await verifyArweaveChronology(
      recordWithReportedAnchor(),
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    expect(result.status).toBe("retryable");
    expect(result.explanation).toContain("No mismatch was found");
  });

  it("treats a pending transaction as retryable", async () => {
    const result = await verifyArweaveChronology(
      recordWithReportedAnchor(),
      vi.fn().mockResolvedValue(new Response(null, { status: 202 })),
    );
    expect(result.status).toBe("retryable");
    expect(result.explanation).toContain("pending confirmation");
  });

  it("verifies a transaction bound to matching public block metadata", async () => {
    const fetcher = confirmedFetcher();
    const result = await verifyArweaveChronology(
      recordWithReportedAnchor(),
      fetcher,
    );
    expect(result.status).toBe("verified");
    expect(result.label).toBe("Arweave transaction confirmed");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Block-Format": "2" }),
      }),
    );
  });

  it("reports a confirmed publisher-timestamp conflict as a mismatch", async () => {
    const result = await verifyArweaveChronology(
      recordWithReportedAnchor(),
      confirmedFetcher({ timestamp: blockTimestamp + 1 }),
    );
    expect(result.status).toBe("mismatch");
    expect(result.explanation).toContain("differs");
  });

  it("reports a transaction missing from its claimed block as a mismatch", async () => {
    const result = await verifyArweaveChronology(
      recordWithReportedAnchor(),
      confirmedFetcher({ txs: ["X".repeat(43)] }),
    );
    expect(result.status).toBe("mismatch");
  });
});
