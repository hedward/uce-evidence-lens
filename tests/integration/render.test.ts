// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { AppController } from "../../src/app/controller";
import { renderApp } from "../../src/components/render";

describe("visible evidence interface", () => {
  it("renders hostile record strings as text instead of markup", async () => {
    const controller = new AppController();
    await controller.load("demo");
    const record = controller.getState().record!;
    record.title = '<img data-hostile="true" src=x>';
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());
    expect(root.textContent).toContain('<img data-hostile="true" src=x>');
    expect(root.querySelector("img[data-hostile]")).toBeNull();
  });

  it("labels author and rights values as assertions", async () => {
    const controller = new AppController();
    await controller.load("demo");
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());
    expect(root.textContent).toContain("Recorded author assertion");
    expect(root.textContent).toContain("not a legal determination");
  });
});
