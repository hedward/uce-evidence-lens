import { describe, expect, it, vi } from "vitest";
import { demoRecord } from "../../src/records/demo";
import {
  arweaveIndexUrl,
  verifyArweaveChronology,
  verifyFileArweaveChronology,
} from "../../src/verification/arweave";
import bundle from "../fixtures/arweave-extended-bundle.json";
import manifest from "../fixtures/extended-production.json";
import { parseUceRecord } from "../../src/records/parser";

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
    expect(result.explanation).toContain("no mismatch was established");
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

const sample = parseUceRecord(manifest, {
  source:
    "https://cbyuce.com/verify/d16afbafda0ef0bf1be29d4f89e8629fc2aa0eae55da30103aeb5e6a59abd9a5?format=json",
  loadedFrom: "cbyuce",
});
const fileRecord = { ...sample, arweaveTxId: bundle.file };

function bundledFetcher(
  options: { index?: unknown; block?: unknown; status?: number } = {},
) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === `https://arweave.net/tx/${bundle.file}/status`)
      return new Response(null, { status: options.status ?? 404 });
    if (url === arweaveIndexUrl(bundle.file).toString())
      return jsonResponse(options.index ?? bundle.index);
    if (url === `https://arweave.net/tx/${bundle.parent}/status`)
      return jsonResponse(bundle.status);
    if (url === `https://arweave.net/block/hash/${bundle.block.indep_hash}`)
      return jsonResponse(options.block ?? bundle.block);
    throw new Error(`Unexpected destination: ${url}`);
  });
}

describe("bundled Arweave chronology", () => {
  it("resolves the real sample's bundle date as reported while retaining its evidence scope", async () => {
    const fetcher = bundledFetcher();
    const result = await verifyFileArweaveChronology(sample, fetcher);
    expect(result.status).toBe("reported");
    expect(result.id).toBe("file_anchor");
    expect(result.chronologyProvenance).toEqual({
      referenceType: "bundled_item",
      transactionId: bundle.file,
      rootTransactionId: bundle.parent,
      parentPath: [bundle.file, bundle.parent],
      block: {
        height: 2005758,
        hash: bundle.block.indep_hash,
        timestamp: "2026-09-21T21:08:55.000Z",
      },
      relationship: "gateway_index",
      indexSource: arweaveIndexUrl(bundle.file).toString(),
    });
    expect(result.explanation).toContain(
      "cryptographic bundle inclusion and original file bytes were not checked",
    );
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(
      fetcher.mock.calls.every(([url]) =>
        /\/status$|\/graphql\?|\/block\/hash\//.test(String(url)),
      ),
    ).toBe(true);
  });

  it("does not apply a manifest timestamp to the file check", async () => {
    const r = await verifyFileArweaveChronology(
      {
        ...sample,
        reportedArweaveBlockTimestamp: "2000-01-01T00:00:00Z",
        reportedArweaveBlockHeight: 1,
      },
      bundledFetcher(),
    );
    expect(r.status).toBe("reported");
  });

  it("still detects a publisher timestamp conflict for a bundled manifest", async () => {
    const r = await verifyArweaveChronology(
      { ...fileRecord, reportedArweaveBlockHeight: 1 },
      bundledFetcher(),
    );
    expect(r.status).toBe("mismatch");
  });

  it("requires the parent transaction to appear in the confirmed block", async () => {
    const r = await verifyArweaveChronology(
      fileRecord,
      bundledFetcher({ block: { ...bundle.block, txs: [bundle.file] } }),
    );
    expect(r.status).toBe("mismatch");
  });

  it("detects disagreement between index and root block metadata", async () => {
    const index = structuredClone(bundle.index);
    index.data.transaction.block.timestamp += 1;
    const r = await verifyArweaveChronology(
      fileRecord,
      bundledFetcher({ index }),
    );
    expect(r.status).toBe("mismatch");
    expect(r.explanation).toContain("conflicts");
  });

  it("does not infer top-level status or absence from missing index data", async () => {
    for (const transaction of [
      null,
      { ...bundle.index.data.transaction, bundledIn: null },
    ]) {
      const r = await verifyArweaveChronology(
        fileRecord,
        bundledFetcher({ index: { data: { transaction } } }),
      );
      expect(r.status).toBe("retryable");
      expect(r.explanation).toContain(
        "does not establish that the file is missing",
      );
      expect(r.chronologyProvenance).toBeUndefined();
    }
  });

  it.each(["", "https://127.0.0.1/private", "bad-id"])(
    "rejects malformed parent %s without following it",
    async (parent) => {
      const index = structuredClone(bundle.index);
      index.data.transaction.bundledIn.id = parent;
      const fetcher = bundledFetcher({ index });
      expect((await verifyArweaveChronology(fileRecord, fetcher)).status).toBe(
        "unsupported",
      );
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );

  it("rejects an index result for a different item", async () => {
    const index = structuredClone(bundle.index);
    index.data.transaction.id = "X".repeat(43);
    expect(
      (await verifyArweaveChronology(fileRecord, bundledFetcher({ index })))
        .status,
    ).toBe("unsupported");
  });

  it("rejects cyclic relationships", async () => {
    const index = structuredClone(bundle.index);
    index.data.transaction.bundledIn.id = bundle.file;
    expect(
      (await verifyArweaveChronology(fileRecord, bundledFetcher({ index })))
        .explanation,
    ).toContain("cyclic");
  });

  it("resolves nested bundles with a bounded parent path", async () => {
    const middle = "M".repeat(43);
    const index = structuredClone(bundle.index);
    index.data.transaction.bundledIn.id = middle;
    const base = bundledFetcher({ index });
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === `https://arweave.net/tx/${middle}/status`)
        return new Response(null, { status: 404 });
      if (url === arweaveIndexUrl(middle).toString())
        return jsonResponse({
          data: {
            transaction: { ...bundle.index.data.transaction, id: middle },
          },
        });
      return base(input);
    });
    const r = await verifyArweaveChronology(fileRecord, fetcher);
    expect(r.status).toBe("reported");
    expect(r.chronologyProvenance?.parentPath).toEqual([
      bundle.file,
      middle,
      bundle.parent,
    ]);
  });

  it("stops excessive bundle nesting without a pass", async () => {
    let next = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/status"))
        return new Response(null, { status: 404 });
      const id = /id:"([^"]+)"/.exec(url.searchParams.get("query")!)![1];
      return jsonResponse({
        data: {
          transaction: {
            id,
            bundledIn: { id: String(++next).repeat(43) },
            block: null,
          },
        },
      });
    });
    const r = await verifyArweaveChronology(fileRecord, fetcher);
    expect(r.status).toBe("unsupported");
    expect(r.explanation).toContain("depth");
    expect(fetcher.mock.calls.length).toBeLessThanOrEqual(10);
  });

  it("keeps rate limits retryable without pretending they establish a bundle", async () => {
    const fetcher = bundledFetcher({ status: 429 });
    const r = await verifyArweaveChronology(fileRecord, fetcher);
    expect(r.status).toBe("retryable");
    expect(r.explanation).toContain("429");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("retains pending parent confirmation as incomplete", async () => {
    const base = bundledFetcher();
    const r = await verifyArweaveChronology(fileRecord, async (input) =>
      String(input).includes(bundle.parent)
        ? new Response(null, { status: 202 })
        : base(input),
    );
    expect(r.status).toBe("retryable");
    expect(r.explanation).toContain("pending");
  });

  it("bounds index responses and refuses metadata redirects", async () => {
    for (const response of [
      new Response("x".repeat(65537)),
      Object.defineProperty(jsonResponse(bundle.index), "url", {
        value: "https://untrusted.example/",
      }),
    ]) {
      const r = await verifyArweaveChronology(fileRecord, async (input) =>
        String(input).includes("/graphql")
          ? response
          : new Response(null, { status: 404 }),
      );
      expect(r.status).toBe("unsupported");
    }
  });

  it("rejects an invalid record identifier before fetching", async () => {
    const fetcher = vi.fn();
    const r = await verifyArweaveChronology(
      { ...sample, arweaveTxId: "https://127.0.0.1/" },
      fetcher,
    );
    expect(r.status).toBe("unsupported");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
