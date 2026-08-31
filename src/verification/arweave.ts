import type { EvidenceCheck, UceRecord } from "../types/record";
import type { FetchLike } from "../records/loader";
import { isArweaveId, isPlainObject } from "../security/untrusted";

const ARWEAVE_GATEWAY = "https://arweave.net";
const MAX_STATUS_BYTES = 16 * 1024;
const MAX_BLOCK_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;

interface ArweaveStatus {
  blockHeight: number;
  blockHash: string;
  confirmations: number;
}

interface ArweaveBlock {
  height: number;
  blockHash: string;
  timestamp: number;
  transactionIds: string[];
}

class AnchorResponseError extends Error {}

function isBlockHash(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43,128}$/.test(value);
}

async function readBoundedJson(
  response: Response,
  byteLimit: number,
  controller: AbortController,
): Promise<unknown> {
  const contentLength = response.headers.get("content-length");
  if (
    contentLength &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > byteLimit
  ) {
    controller.abort();
    throw new AnchorResponseError(
      "The gateway response exceeded its safety limit.",
    );
  }

  if (!response.body)
    throw new AnchorResponseError("The gateway returned no data.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      length += value.byteLength;
      if (length > byteLimit) {
        void reader.cancel().catch(() => undefined);
        controller.abort();
        throw new AnchorResponseError(
          "The gateway response exceeded its safety limit.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new AnchorResponseError("The gateway returned invalid JSON.");
  }
}

async function fetchGatewayJson(
  url: URL,
  fetcher: FetchLike,
  byteLimit: number,
  headers: Record<string, string> = {},
): Promise<{ response: Response; data?: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(url, {
      method: "GET",
      headers: { Accept: "application/json", ...headers },
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (response.url) {
      const finalUrl = new URL(response.url);
      if (
        finalUrl.protocol !== "https:" ||
        (finalUrl.hostname !== "arweave.net" &&
          !finalUrl.hostname.endsWith(".arweave.net"))
      ) {
        throw new AnchorResponseError(
          "The gateway redirected to an unapproved host.",
        );
      }
    }
    if (response.status === 202) return { response };
    if (!response.ok) {
      throw new AnchorResponseError(
        `The Arweave gateway returned HTTP ${response.status}.`,
      );
    }
    return {
      response,
      data: await readBoundedJson(response, byteLimit, controller),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseStatus(value: unknown): ArweaveStatus {
  if (!isPlainObject(value))
    throw new AnchorResponseError("The transaction status was malformed.");
  const height = value.block_height;
  const hash = value.block_indep_hash;
  const confirmations = value.number_of_confirmations;
  if (
    !Number.isSafeInteger(height) ||
    (height as number) < 0 ||
    !isBlockHash(hash) ||
    !Number.isSafeInteger(confirmations) ||
    (confirmations as number) < 0
  ) {
    throw new AnchorResponseError("The transaction status was malformed.");
  }
  return {
    blockHeight: height as number,
    blockHash: hash,
    confirmations: confirmations as number,
  };
}

function parseBlock(value: unknown): ArweaveBlock {
  if (!isPlainObject(value))
    throw new AnchorResponseError("The Arweave block was malformed.");
  const height = value.height;
  const hash = value.indep_hash;
  const timestamp = value.timestamp;
  const transactions = value.txs;
  if (
    !Number.isSafeInteger(height) ||
    (height as number) < 0 ||
    !isBlockHash(hash) ||
    !Number.isSafeInteger(timestamp) ||
    (timestamp as number) < 0 ||
    !Array.isArray(transactions) ||
    transactions.length > 100_000 ||
    !transactions.every(isArweaveId)
  ) {
    throw new AnchorResponseError("The Arweave block was malformed.");
  }
  return {
    height: height as number,
    blockHash: hash,
    timestamp: timestamp as number,
    transactionIds: transactions,
  };
}

function retryableCheck(txId: string, explanation: string): EvidenceCheck {
  return {
    id: "independent_anchor",
    label: "Arweave chronology check",
    status: "retryable",
    explanation,
    source: `${ARWEAVE_GATEWAY}/tx/${txId}/status`,
  };
}

export async function verifyArweaveChronology(
  record: UceRecord,
  fetcher: FetchLike = fetch,
): Promise<EvidenceCheck> {
  const txId = record.arweaveTxId;
  if (!txId) {
    return {
      id: "independent_anchor",
      label: "Arweave chronology check",
      status: "unsupported",
      explanation:
        "This record does not include an Arweave transaction identifier.",
    };
  }

  try {
    const statusResult = await fetchGatewayJson(
      new URL(`${ARWEAVE_GATEWAY}/tx/${txId}/status`),
      fetcher,
      MAX_STATUS_BYTES,
    );
    if (statusResult.response.status === 202) {
      return retryableCheck(
        txId,
        "The Arweave transaction is pending confirmation. Try this check again later.",
      );
    }
    const status = parseStatus(statusResult.data);
    const blockResult = await fetchGatewayJson(
      new URL(`${ARWEAVE_GATEWAY}/block/hash/${status.blockHash}`),
      fetcher,
      MAX_BLOCK_BYTES,
      { "X-Block-Format": "2" },
    );
    const block = parseBlock(blockResult.data);

    if (
      block.height !== status.blockHeight ||
      block.blockHash !== status.blockHash ||
      !block.transactionIds.includes(txId)
    ) {
      return {
        id: "independent_anchor",
        label: "Arweave chronology check",
        status: "mismatch",
        explanation:
          "The retrieved transaction status and block metadata do not bind this transaction to the same Arweave block.",
        source: `${ARWEAVE_GATEWAY}/tx/${txId}/status`,
      };
    }

    const reportedTimestamp = record.reportedArweaveBlockTimestamp
      ? Date.parse(record.reportedArweaveBlockTimestamp)
      : undefined;
    const timestampMismatch =
      reportedTimestamp !== undefined &&
      (!Number.isFinite(reportedTimestamp) ||
        Math.floor(reportedTimestamp / 1000) !== block.timestamp);
    const heightMismatch =
      record.reportedArweaveBlockHeight !== undefined &&
      record.reportedArweaveBlockHeight !== block.height;
    if (timestampMismatch || heightMismatch) {
      return {
        id: "independent_anchor",
        label: "Arweave chronology check",
        status: "mismatch",
        explanation:
          "Arweave confirmed the transaction, but its public block height or timestamp differs from the value reported by the publisher.",
        source: `${ARWEAVE_GATEWAY}/block/hash/${status.blockHash}`,
      };
    }

    return {
      id: "independent_anchor",
      label: "Arweave transaction confirmed",
      status: "verified",
      explanation: `A public Arweave gateway bound this transaction to block ${block.height.toLocaleString()} at ${new Date(block.timestamp * 1000).toISOString()} (${status.confirmations.toLocaleString()} confirmation${status.confirmations === 1 ? "" : "s"}).`,
      source: `${ARWEAVE_GATEWAY}/block/hash/${status.blockHash}`,
    };
  } catch {
    return retryableCheck(
      txId,
      "The public Arweave gateway could not complete this check. No mismatch was found; try again when the gateway or network is available.",
    );
  }
}
