export interface ModelContextToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: true };
  execute: (input: unknown) => Promise<unknown> | unknown;
}

export interface DocumentModelContext {
  registerTool(definition: ModelContextToolDefinition): Promise<void> | void;
}

declare global {
  interface Document {
    modelContext?: DocumentModelContext;
  }
}
