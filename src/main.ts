import "./styles/main.css";
import { AppController } from "./app/controller";
import { startApplication } from "./app/start";
import { renderApp } from "./components/render";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Application root was not found.");

const controller = new AppController();
controller.subscribe((state) => renderApp(root, controller, state));

void startApplication(controller);
