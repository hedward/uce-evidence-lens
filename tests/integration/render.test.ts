// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { AppController } from "../../src/app/controller";
import { renderApp } from "../../src/components/render";

const chronologyVerifier = async () => ({
  id: "independent_anchor",
  label: "Arweave chronology check",
  status: "retryable" as const,
  explanation: "Test gateway unavailable.",
});

function testController(): AppController {
  return new AppController(fetch, chronologyVerifier);
}

describe("visible evidence interface", () => {
  it("presents network recovery paths as resilience options", () => {
    const controller = testController();
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
    const controller = testController();
    await controller.load("demo");
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());
    const eyebrow = root.querySelector(".site-header .eyebrow");
    expect(eyebrow?.textContent).toBe("Copyright by UCE");
    expect(eyebrow?.textContent).not.toContain("5 Race Street LLC");
  });

  it("uses the official UCE Mark v1.0 asset throughout the site chrome", () => {
    const controller = testController();
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());

    const headerMark = root.querySelector<HTMLImageElement>(
      ".site-header .brand-mark",
    );
    const footerMark = root.querySelector<HTMLImageElement>(
      ".footer__uce-mark img",
    );

    expect(headerMark?.tagName).toBe("IMG");
    expect(headerMark?.getAttribute("src")).toBe("/uce-mark.svg");
    expect(headerMark?.getAttribute("alt")).toBe("UCE Mark");
    expect(footerMark?.getAttribute("src")).toBe("/uce-mark.svg");
  });

  it("loads the registered Evidence Lens artwork as the bundled demo", async () => {
    const controller = testController();
    await controller.load("demo");
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());

    expect(root.querySelector(".hero-record h2")?.textContent).toBe(
      "UCE Evidence Lens — Logo and Tagline v1.0",
    );
    expect(root.querySelector(".assertion-callout")?.textContent).toContain(
      "Copyright by UCE/CbyUCE",
    );
    expect(
      root
        .querySelector<HTMLAnchorElement>(
          'a[download="uce-evidence-lens-logo-tagline-v1.0.png"]',
        )
        ?.getAttribute("href"),
    ).toBe("/demo/uce-evidence-lens-logo-tagline-v1.0.png");
    expect(
      root.querySelector<HTMLAnchorElement>(
        'a[href="/demo/uce-evidence-lens-logo-tagline-v1.0.uce.json"]',
      )?.textContent,
    ).toBe("View bundled manifest JSON");
  });

  it("links the authorized UCE mark to the stable v1.0.0 release evidence route", () => {
    const controller = testController();
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());
    const footer = root.querySelector("footer");
    const mark = footer?.querySelector("img");
    const evidenceLink = footer?.querySelector<HTMLAnchorElement>(
      ".footer__evidence-link",
    );
    expect(mark?.getAttribute("src")).toBe("/uce-mark.svg");
    expect(mark?.getAttribute("alt")).toBe("");
    expect(evidenceLink?.getAttribute("href")).toBe(
      "https://uceevidencelens.com/evidence/v1.0.0",
    );
    expect(evidenceLink?.getAttribute("aria-label")).toContain("release 1.0.0");
    expect(evidenceLink?.textContent).toContain(
      "UCE Evidence Lens release 1.0.0",
    );
    expect(evidenceLink?.textContent).toContain("View UCE release evidence");
  });

  it("shows official setup guidance when AI-agent site tools are unavailable", () => {
    const controller = testController();
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
    const controller = testController();
    controller.setWebMcp({
      status: "registered",
      detail: "7 read-only AI-agent tools registered for this page.",
    });
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());
    expect(root.querySelector(".webmcp-help")).toBeNull();
  });

  it("renders hostile record strings as text instead of markup", async () => {
    const controller = testController();
    await controller.load("demo");
    const record = controller.getState().record!;
    record.title = '<img data-hostile="true" src=x>';
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());
    expect(root.textContent).toContain('<img data-hostile="true" src=x>');
    expect(root.querySelector("img[data-hostile]")).toBeNull();
  });

  it("labels author and rights values as assertions", async () => {
    const controller = testController();
    await controller.load("demo");
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());
    expect(root.textContent).toContain("Recorded author assertion");
    expect(root.textContent).toContain("not a legal determination");
  });

  it("never renders verification results bound to a different record", async () => {
    const controller = testController();
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
    expect(root.querySelector(".verification-summary")).toBeNull();
  });

  it("uses a consumer summary and collapses non-independent technical items", async () => {
    const controller = testController();
    await controller.load("demo");
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());

    expect(root.querySelector(".verification-summary")?.textContent).toContain(
      "No integrity problems found.",
    );
    expect(root.querySelector(".status--retryable")?.textContent).toBe(
      "Try again",
    );
    const details =
      root.querySelector<HTMLDetailsElement>(".technical-details");
    expect(details?.open).toBe(false);
    expect(details?.textContent).toContain("Publisher reported");
    expect(details?.textContent).toContain("Not independently checked");
  });
});
