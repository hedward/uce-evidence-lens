import { describe, expect, it, vi } from "vitest";
import { AppController } from "../../src/app/controller";
import { startApplication } from "../../src/app/start";
import type {
  DocumentModelContext,
  ModelContextToolDefinition,
} from "../../src/types/webmcp";

const chronologyVerifier = vi.fn(async () => ({
  id: "independent_anchor",
  label: "Arweave chronology check",
  status: "retryable" as const,
  explanation: "Test gateway unavailable.",
}));

describe("application startup", () => {
  it("registers and discovers WebMCP tools before loading the demo", async () => {
    const events: string[] = [];
    const registeredTools: ModelContextToolDefinition[] = [];
    const modelContext: DocumentModelContext = {
      registerTool(tool) {
        events.push(`register:${tool.name}`);
        registeredTools.push(tool);
      },
      async getTools() {
        events.push("discover");
        return registeredTools.map(({ name }) => ({ name }));
      },
    };
    const controller = new AppController(fetch, chronologyVerifier);
    const originalLoad = controller.load.bind(controller);
    vi.spyOn(controller, "load").mockImplementation(async (source) => {
      events.push(`load:${source}`);
      return originalLoad(source);
    });

    await startApplication(controller, {
      modelContext,
    } as unknown as Document);

    expect(events).toHaveLength(9);
    expect(
      events.slice(0, 7).every((event) => event.startsWith("register:")),
    ).toBe(true);
    expect(events[7]).toBe("discover");
    expect(events[8]).toBe("load:demo");
  });
});
