import "./styles/main.css";
import { AppController } from "./app/controller";
import { renderApp } from "./components/render";
import { registerWebMcpTools } from "./webmcp/register";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Application root was not found.");

const controller = new AppController();
controller.subscribe((state) => renderApp(root, controller, state));

async function start(): Promise<void> {
  await controller.load("demo");
  await registerWebMcpTools(controller);
}

void start();
