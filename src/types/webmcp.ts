export interface ModelContextToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: true };
  execute: (input: unknown) => Promise<unknown> | unknown;
}

export interface RegisteredModelContextTool {
  name: string;
}

export interface DocumentModelContext {
  registerTool(definition: ModelContextToolDefinition): Promise<void> | void;
  getTools?(): Promise<RegisteredModelContextTool[]>;
}

declare global {
  interface Document {
    modelContext?: DocumentModelContext;
  }
}
