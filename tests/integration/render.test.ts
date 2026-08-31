// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { AppController } from "../../src/app/controller";
import { renderApp } from "../../src/components/render";

describe("visible evidence interface", () => {
  it("presents network recovery paths as resilience options", () => {
    const controller = new AppController();
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());
    const note = root.querySelector(".load-form .field-note");
    expect(note?.textContent).toContain("If live retrieval is unavailable");
    expect(note?.textContent).toContain("reload the bundled demo");
    expect(note?.textContent).toContain("use an Arweave URL");
    expect(note?.textContent).toContain("paste public JSON");
    expect(note?.textContent).not.toContain("blocked by CORS");
  });

  it("uses the official alternate company name for product branding", async () => {
    const controller = new AppController();
    await controller.load("demo");
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());
    const eyebrow = root.querySelector(".site-header .eyebrow");
    expect(eyebrow?.textContent).toBe("Copyright by UCE");
    expect(eyebrow?.textContent).not.toContain("5 Race Street LLC");
  });

  it("shows the authorized UCE mark with an honest pending evidence link", () => {
    const controller = new AppController();
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());
    const footer = root.querySelector("footer");
    const mark = footer?.querySelector("img");
    const pending = footer?.querySelector('[data-verification-link="pending"]');
    expect(mark?.getAttribute("src")).toBe("/favicon.svg");
    expect(mark?.getAttribute("alt")).toBe("UCE Mark");
    expect(pending?.textContent).toBe("CbyUCE verification link pending");
    expect(footer?.querySelector('a[href="#"]')).toBeNull();
  });

  it("shows official setup guidance when AI-agent site tools are unavailable", () => {
    const controller = new AppController();
    controller.setWebMcp({
      status: "unavailable",
      detail: "AI-agent site tools are off or unavailable.",
    });
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());
    const help = root.querySelector(".webmcp-help");
    expect(help?.textContent).toContain("Enable AI-agent site tools");
    expect(help?.textContent).toContain("Settings → Browser → Permissions");
    expect(help?.textContent).toContain(
      "chrome://flags/#enable-webmcp-testing",
    );
    expect(help?.querySelector("a")?.href).toBe(
      "https://learn.chatgpt.com/docs/webmcp",
    );
  });

  it("hides setup guidance after site tools register", () => {
    const controller = new AppController();
    controller.setWebMcp({
      status: "registered",
      detail: "7 read-only AI-agent tools registered for this page.",
    });
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());
    expect(root.querySelector(".webmcp-help")).toBeNull();
  });

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

  it("never renders verification results bound to a different record", async () => {
    const controller = new AppController();
    await controller.load("demo");
    const state = controller.getState();
    const root = document.createElement("div");
    renderApp(root, controller, {
      ...state,
      verification: {
        ...state.verification!,
        recordBinding: {
          source: "https://cbyuce.com/verify/a-different-record?format=json",
          manifestHash: "0".repeat(64),
        },
      },
    });
    expect(root.querySelectorAll(".check-card")).toHaveLength(0);
    expect(root.querySelector(".section-summary")).toBeNull();
  });
});
