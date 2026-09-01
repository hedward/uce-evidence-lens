import type { AppController } from "./controller";
import { registerWebMcpTools } from "../webmcp/register";

export async function startApplication(
  controller: AppController,
  currentDocument: Document = document,
): Promise<void> {
  await registerWebMcpTools(controller, currentDocument);
  await controller.load("demo");
}
