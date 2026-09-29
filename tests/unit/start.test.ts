import { describe, expect, it, vi } from "vitest";
import { AppController } from "../../src/app/controller";
import { startApplication } from "../../src/app/start";
import { DEMO_RECORD_ID, demoRecord } from "../../src/records/demo";
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

    expect(events).toHaveLength(10);
    expect(
      events.slice(0, 8).every((event) => event.startsWith("register:")),
    ).toBe(true);
    expect(events[8]).toBe("discover");
    expect(events[9]).toBe("load:demo");
  });

  it("loads an incoming recipient record after registering tools", async () => {
    const events: string[] = [];
    const modelContext: DocumentModelContext = {
      registerTool(tool) {
        events.push(`register:${tool.name}`);
      },
      async getTools() {
        events.push("discover");
        return [];
      },
    };
    const controller = new AppController(fetch, chronologyVerifier);
    vi.spyOn(controller, "load").mockImplementation(async (source) => {
      events.push(`load:${source}`);
      return demoRecord;
    });
    const navigation = {
      location: {
        hash: `#record=${encodeURIComponent(DEMO_RECORD_ID)}`,
      },
      addEventListener: vi.fn(),
    };

    await startApplication(
      controller,
      { modelContext } as unknown as Document,
      navigation,
    );

    expect(events.at(-1)).toBe(
      `load:https://cbyuce.com/verify/${DEMO_RECORD_ID}?format=json`,
    );
    expect(navigation.addEventListener).toHaveBeenCalledWith(
      "hashchange",
      expect.any(Function),
    );
  });

  it("surfaces an invalid incoming record fragment without loading the demo", async () => {
    const controller = new AppController(fetch, chronologyVerifier);
    const load = vi.spyOn(controller, "load");
    const rejectRecipientLink = vi.spyOn(controller, "rejectRecipientLink");

    await startApplication(controller, {} as Document, {
      location: { hash: "#record=" },
      addEventListener: vi.fn(),
    });

    expect(load).not.toHaveBeenCalled();
    expect(rejectRecipientLink).toHaveBeenCalledWith(
      "The recipient record fragment is empty.",
    );
    expect(controller.getState().record).toBeUndefined();
    expect(controller.getState().error).toBe(
      "The recipient record fragment is empty.",
    );
  });

  it("handles later record hashes but ignores ordinary same-page hashes", async () => {
    let hashListener: (() => void) | undefined;
    const navigation = {
      location: { hash: "#main" },
      addEventListener(_type: "hashchange", listener: () => void) {
        hashListener = listener;
      },
    };
    const controller = new AppController(fetch, chronologyVerifier);
    const load = vi
      .spyOn(controller, "load")
      .mockResolvedValue(structuredClone(demoRecord));

    await startApplication(controller, {} as Document, navigation);
    expect(load).toHaveBeenLastCalledWith("demo");

    navigation.location.hash = `#record=${encodeURIComponent(DEMO_RECORD_ID)}`;
    hashListener?.();
    await vi.waitFor(() =>
      expect(load).toHaveBeenLastCalledWith(
        `https://cbyuce.com/verify/${DEMO_RECORD_ID}?format=json`,
      ),
    );

    const callCount = load.mock.calls.length;
    navigation.location.hash = "#main";
    hashListener?.();
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(callCount);
  });

  it("registers hash navigation before the initial record load finishes", async () => {
    let hashListener: (() => void) | undefined;
    let finishInitialLoad: (() => void) | undefined;
    const initialLoad = new Promise<void>((resolve) => {
      finishInitialLoad = resolve;
    });
    const navigation = {
      location: { hash: "" },
      addEventListener(_type: "hashchange", listener: () => void) {
        hashListener = listener;
      },
    };
    const controller = new AppController(fetch, chronologyVerifier);
    const load = vi
      .spyOn(controller, "load")
      .mockImplementation(async (source) => {
        if (source === "demo") await initialLoad;
        return structuredClone(demoRecord);
      });

    const startup = startApplication(controller, {} as Document, navigation);
    await vi.waitFor(() => expect(load).toHaveBeenCalledWith("demo"));

    navigation.location.hash = `#record=${encodeURIComponent(DEMO_RECORD_ID)}`;
    hashListener?.();
    await vi.waitFor(() =>
      expect(load).toHaveBeenCalledWith(
        `https://cbyuce.com/verify/${DEMO_RECORD_ID}?format=json`,
      ),
    );

    finishInitialLoad?.();
    await startup;
  });
});
