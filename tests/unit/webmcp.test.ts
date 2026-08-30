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

function fakeDocument(modelContext?: DocumentModelContext): Document {
  return { modelContext } as unknown as Document;
}

describe("WebMCP integration", () => {
  it("gracefully reports WebMCP unavailable", async () => {
    const controller = new AppController();
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
    const controller = new AppController();
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
});
