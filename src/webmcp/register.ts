import type { AppController } from "../app/controller";
import type { ModelContextToolDefinition } from "../types/webmcp";
import { isPlainObject } from "../security/untrusted";
import { summarizeRecord } from "../verification/evidence";

const registeredDocuments = new WeakSet<Document>();

class WebMcpDiscoveryError extends Error {
  override readonly name = "WebMcpDiscoveryError";
}

function exactObject(
  input: unknown,
  allowed: readonly string[],
): Record<string, unknown> {
  if (!isPlainObject(input))
    throw new Error("Tool input must be a JSON object.");
  const unexpected = Object.keys(input).filter((key) => !allowed.includes(key));
  if (unexpected.length)
    throw new Error(`Unexpected tool input: ${unexpected.join(", ")}.`);
  return input;
}

function noInput(input: unknown): void {
  exactObject(input ?? {}, []);
}

function stringInput(input: unknown, key: string, fallback?: string): string {
  const object = exactObject(input ?? {}, [key]);
  const value = object[key] ?? fallback;
  if (typeof value !== "string" || value.length > 2_000) {
    throw new Error(`${key} must be a string under 2,000 characters.`);
  }
  return value;
}

function fileIndexInput(input: unknown): number {
  const object = exactObject(input ?? {}, ["fileIndex"]);
  const value = object.fileIndex ?? 0;
  if (
    !Number.isInteger(value) ||
    (value as number) < 0 ||
    (value as number) > 19
  ) {
    throw new Error("fileIndex must be an integer from 0 through 19.");
  }
  return value as number;
}

function output(
  structuredResult: unknown,
  explanation: string,
): Record<string, unknown> {
  return { structuredResult, explanation };
}

export function createToolDefinitions(
  controller: AppController,
): ModelContextToolDefinition[] {
  const emptySchema = {
    type: "object",
    properties: {},
    additionalProperties: false,
  } as const;
  const readOnly = { readOnlyHint: true } as const;
  return [
    {
      name: "load_uce_public_record",
      description:
        "Load a supported public UCE record or the bundled demo. This retrieves public evidence only and makes no legal determination.",
      inputSchema: {
        type: "object",
        properties: {
          source: {
            type: "string",
            description:
              "Public CbyUCE URL, record hash, Arweave URL, or 'demo'.",
          },
        },
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: async (input) => {
        const record = await controller.load(
          stringInput(input, "source", "demo"),
        );
        return output(
          summarizeRecord(record),
          `Loaded ${record.title}. Recorded assertions have not been proven.`,
        );
      },
    },
    {
      name: "get_uce_record_summary",
      description:
        "Return a concise summary of the currently loaded public UCE record without interpreting assertions as facts.",
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: (input) => {
        noInput(input);
        return output(
          controller.summary(),
          "Summary returned; identity, authorship, and rights values remain recorded assertions.",
        );
      },
    },
    {
      name: "verify_uce_record",
      description:
        "Run browser-based integrity, signature, and direct Arweave chronology checks. Retryable, reported, and unsupported items are not counted as verified.",
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: async (input) => {
        noInput(input);
        const result = await controller.runVerification();
        return output(result, result.summary);
      },
    },
    {
      name: "inspect_uce_chronology",
      description:
        "List claimed dates, system timestamps, and publisher-reported anchor time separately, with sources and limitations.",
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: (input) => {
        noInput(input);
        return output(
          controller.chronology(),
          "Chronology returned; a publisher-reported ledger timestamp is not an independent proof of the claimed creation date.",
        );
      },
    },
    {
      name: "list_uce_assertions",
      description:
        "List identity, authorship, creation-date, rights, and AI-policy values explicitly as recorded assertions, not legal conclusions.",
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: (input) => {
        noInput(input);
        return output(
          controller.assertions(),
          "These values are recorded assertions; their truth and legal effect were not determined.",
        );
      },
    },
    {
      name: "inspect_uce_rights_declaration",
      description:
        "Return recorded rights declarations and their sources without determining ownership, validity, or legal effect.",
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: (input) => {
        noInput(input);
        return output(
          controller.rightsAssertions(),
          "Rights declarations returned without a legal conclusion.",
        );
      },
    },
    {
      name: "compare_local_file_to_uce_record",
      description:
        "Compare the digest of the file the user already selected with a recorded digest. This tool cannot select, read, or return file contents.",
      inputSchema: {
        type: "object",
        properties: {
          fileIndex: { type: "integer", minimum: 0, maximum: 19, default: 0 },
        },
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: (input) => {
        const result = controller.compareSelectedFile(fileIndexInput(input));
        return output(result, result.explanation);
      },
    },
  ];
}

export async function registerWebMcpTools(
  controller: AppController,
  currentDocument: Document = document,
): Promise<"registered" | "unavailable" | "already_registered" | "failed"> {
  if (registeredDocuments.has(currentDocument)) return "already_registered";
  if (typeof currentDocument.modelContext?.registerTool !== "function") {
    controller.setWebMcp({
      status: "unavailable",
      detail:
        "AI-agent site tools are off or unavailable. Manual verification still works.",
    });
    return "unavailable";
  }
  const modelContext = currentDocument.modelContext;
  try {
    const definitions = createToolDefinitions(controller);
    for (const tool of definitions) {
      await modelContext.registerTool(tool);
    }
    if (typeof modelContext.getTools === "function") {
      const discoveredNames = new Set(
        (await modelContext.getTools()).map((tool) => tool.name),
      );
      const missingNames = definitions
        .map((tool) => tool.name)
        .filter((name) => !discoveredNames.has(name));
      if (missingNames.length) {
        throw new WebMcpDiscoveryError(
          `Registered tools were not discoverable: ${missingNames.join(", ")}.`,
        );
      }
    }
    registeredDocuments.add(currentDocument);
    controller.setWebMcp({
      status: "registered",
      detail:
        typeof modelContext.getTools === "function"
          ? "7 read-only AI-agent tools registered and discoverable."
          : "7 read-only AI-agent tools registered for this page.",
    });
    return "registered";
  } catch (error) {
    const reason =
      error instanceof Error && error.name ? ` (${error.name})` : "";
    controller.setWebMcp({
      status: "failed",
      detail: `The browser exposed site tools, but registration or discovery failed${reason}. Interactive verification still works.`,
    });
    return "failed";
  }
}
