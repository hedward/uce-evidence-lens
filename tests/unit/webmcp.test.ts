import { describe, expect, it, vi } from "vitest";
import { AppController } from "../../src/app/controller";
import {
  createToolDefinitions,
  registerWebMcpTools,
} from "../../src/webmcp/register";
import type {
  DocumentModelContext,
  ModelContextToolDefinition,
} from "../../src/types/webmcp";
import { validPublicResponse } from "../fixtures/public-record";

const chronologyVerifier = vi.fn(async () => ({
  id: "independent_anchor",
  label: "Arweave chronology check",
  status: "retryable" as const,
  explanation: "Test gateway unavailable.",
}));

function fakeDocument(modelContext?: DocumentModelContext): Document {
  return { modelContext } as unknown as Document;
}

function recordResponse(id: string, title: string): Response {
  const data = structuredClone(validPublicResponse);
  data.manifest.hashes.manifestHash = id;
  data.manifest.work.title = title;
  return new Response(JSON.stringify(data));
}

describe("WebMCP integration", () => {
  it("gracefully reports WebMCP unavailable", async () => {
    const controller = new AppController(fetch, chronologyVerifier);
    const result = await registerWebMcpTools(controller, fakeDocument());
    expect(result).toBe("unavailable");
    expect(controller.getState().webmcp.status).toBe("unavailable");
  });

  it("registers seven read-only tools once", async () => {
    const registerTool = vi.fn<(tool: ModelContextToolDefinition) => void>();
    const doc = fakeDocument({ registerTool });
    const controller = new AppController();
    expect(await registerWebMcpTools(controller, doc)).toBe("registered");
    expect(registerTool).toHaveBeenCalledTimes(7);
    expect(
      registerTool.mock.calls.every(([tool]) => tool.annotations.readOnlyHint),
    ).toBe(true);
    expect(await registerWebMcpTools(controller, doc)).toBe(
      "already_registered",
    );
    expect(registerTool).toHaveBeenCalledTimes(7);
  });

  it("rejects unexpected tool properties", async () => {
    const controller = new AppController(fetch, chronologyVerifier);
    await controller.load("demo");
    const summaryTool = createToolDefinitions(controller).find(
      (tool) => tool.name === "get_uce_record_summary",
    );
    expect(() => summaryTool?.execute({ unexpected: true })).toThrow(
      /Unexpected tool input/,
    );
  });

  it("does not give the local comparison tool file content or selection inputs", () => {
    const controller = new AppController();
    const tool = createToolDefinitions(controller).find(
      (definition) => definition.name === "compare_local_file_to_uce_record",
    );
    expect(tool?.inputSchema).toEqual(
      expect.objectContaining({
        properties: { fileIndex: expect.any(Object) },
        additionalProperties: false,
      }),
    );
  });

  it("summarizes the record loaded by that tool invocation during concurrent loads", async () => {
    let resolveFirst!: (response: Response) => void;
    let resolveSecond!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    const secondResponse = new Promise<Response>((resolve) => {
      resolveSecond = resolve;
    });
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => firstResponse)
      .mockImplementationOnce(() => secondResponse);
    const controller = new AppController(fetcher, chronologyVerifier);
    const loadTool = createToolDefinitions(controller).find(
      (tool) => tool.name === "load_uce_public_record",
    )!;

    const first = Promise.resolve(loadTool.execute({ source: "a".repeat(64) }));
    const second = Promise.resolve(
      loadTool.execute({ source: "b".repeat(64) }),
    );
    resolveSecond(recordResponse("b".repeat(64), "Second tool record"));
    const secondOutput = (await second) as {
      structuredResult: { title: string };
    };
    resolveFirst(recordResponse("a".repeat(64), "First tool record"));
    const firstOutput = (await first) as {
      structuredResult: { title: string };
    };

    expect(secondOutput.structuredResult.title).toBe("Second tool record");
    expect(firstOutput.structuredResult.title).toBe("First tool record");
    expect(controller.getState().record?.title).toBe("Second tool record");
  });
});
