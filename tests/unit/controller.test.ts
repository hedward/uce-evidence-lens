import { describe, expect, it, vi } from "vitest";
import { AppController, type AppState } from "../../src/app/controller";
import { validPublicResponse } from "../fixtures/public-record";

const chronologyVerifier = vi.fn(async () => ({
  id: "independent_anchor",
  label: "Arweave chronology check",
  status: "retryable" as const,
  explanation: "Test gateway unavailable.",
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function publicResponse(id: string, title: string): Response {
  const data = structuredClone(validPublicResponse);
  data.manifest.hashes.manifestHash = id;
  data.manifest.work.title = title;
  return new Response(JSON.stringify(data));
}

describe("controller operation generations", () => {
  it("checks both the manifest and explicit file transaction on load and refresh", async () => {
    const seenTransactionIds: Array<string | undefined> = [];
    const verifier = vi.fn(async (record: { arweaveTxId?: string }) => {
      seenTransactionIds.push(record.arweaveTxId);
      return {
        id: "independent_anchor",
        label: "Arweave chronology check",
        status: "verified" as const,
        explanation: "Test transaction belongs to a public block.",
      };
    });
    const controller = new AppController(fetch, verifier);
    const states: AppState[] = [];
    controller.subscribe((state) => states.push(state as AppState));

    await controller.load("demo");

    expect(
      states.some(
        (state) =>
          state.verification?.checks.find((check) => check.id === "file_anchor")
            ?.status === "checking",
      ),
    ).toBe(true);
    expect(seenTransactionIds).toEqual([
      "uphFAj1E5Vw10LwFI-qTGrSRKJsWpr2m_mzSZQI8eDU",
      "A6QE2KzIM8lIdQwX1ReH4I2ZBRU-wE7vsXWQxfSYb6g",
    ]);
    expect(
      controller
        .getState()
        .verification?.checks.find((check) => check.id === "file_anchor"),
    ).toMatchObject({
      label: "File transaction chronology",
      status: "verified",
    });

    await controller.runVerification();

    expect(seenTransactionIds).toEqual([
      "uphFAj1E5Vw10LwFI-qTGrSRKJsWpr2m_mzSZQI8eDU",
      "A6QE2KzIM8lIdQwX1ReH4I2ZBRU-wE7vsXWQxfSYb6g",
      "uphFAj1E5Vw10LwFI-qTGrSRKJsWpr2m_mzSZQI8eDU",
      "A6QE2KzIM8lIdQwX1ReH4I2ZBRU-wE7vsXWQxfSYb6g",
    ]);
  });

  it("keeps the latest record and verification paired when loads finish out of order", async () => {
    const firstResponse = deferred<Response>();
    const secondResponse = deferred<Response>();
    const fetcher = vi.fn((input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      return url.pathname.includes("a".repeat(64))
        ? firstResponse.promise
        : secondResponse.promise;
    });
    const controller = new AppController(fetcher, chronologyVerifier);
    const states: AppState[] = [];
    controller.subscribe((state) => states.push(state as AppState));

    const first = controller.load("a".repeat(64));
    const second = controller.load("b".repeat(64));
    secondResponse.resolve(publicResponse("b".repeat(64), "Latest record"));
    await second;
    firstResponse.resolve(publicResponse("a".repeat(64), "Stale record"));
    await first;

    expect(controller.getState().record?.title).toBe("Latest record");
    expect(controller.getState().verification?.recordBinding.manifestHash).toBe(
      "b".repeat(64),
    );
    expect(controller.getState().busy).toBe(false);
    expect(
      states.every(
        (state) =>
          !state.record ||
          !state.verification ||
          (state.verification.recordBinding.source === state.record.source &&
            state.verification.recordBinding.manifestHash ===
              state.record.manifestHash),
      ),
    ).toBe(true);
  });

  it("does not let a stale load error overwrite the latest successful record", async () => {
    const firstResponse = deferred<Response>();
    const secondResponse = deferred<Response>();
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => firstResponse.promise)
      .mockImplementationOnce(() => secondResponse.promise);
    const controller = new AppController(fetcher, chronologyVerifier);

    const first = controller.load("a".repeat(64));
    const firstRejection = expect(first).rejects.toThrow(
      "The public source could not be reached.",
    );
    const second = controller.load("b".repeat(64));
    secondResponse.resolve(publicResponse("b".repeat(64), "Latest record"));
    await second;
    firstResponse.reject(new Error("stale failure"));
    await firstRejection;

    expect(controller.getState().record?.title).toBe("Latest record");
    expect(controller.getState().error).toBeUndefined();
    expect(controller.getState().busy).toBe(false);
  });

  it("does not attach a stale local-file digest to a newer record operation", async () => {
    const bytes = deferred<ArrayBuffer>();
    const file = {
      name: "delayed.txt",
      size: 5,
      arrayBuffer: () => bytes.promise,
    } as File;
    const controller = new AppController(fetch, chronologyVerifier);
    await controller.load("demo");

    const selection = controller.selectLocalFile(file);
    await controller.load("demo");
    bytes.resolve(new TextEncoder().encode("hello").buffer);
    await selection;

    expect(controller.getState().localFile).toBeUndefined();
    expect(controller.getState().localComparison).toBeUndefined();
    expect(controller.getState().busy).toBe(false);
  });
});
