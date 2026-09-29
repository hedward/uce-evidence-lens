// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import axe from "axe-core";
import { AppController } from "../../src/app/controller";
import { renderApp } from "../../src/components/render";
import extendedProduction from "../fixtures/extended-production.json";

const chronologyVerifier = async () => ({
  id: "independent_anchor",
  label: "Arweave chronology check",
  status: "retryable" as const,
  explanation: "Test gateway unavailable.",
});

function mount(controller: AppController) {
  const root = document.createElement("div");
  document.body.append(root);
  controller.subscribe((state) => renderApp(root, controller, state));
  return root;
}

afterEach(() => {
  document.body.replaceChildren();
});

async function expectSemanticAccessibility() {
  const previousTitle = document.title;
  const previousLang = document.documentElement.lang;
  document.title = "UCE Evidence Lens";
  document.documentElement.lang = "en";
  try {
    const result = await axe.run(document, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(
      result.violations.map((violation) => ({
        id: violation.id,
        targets: violation.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  } finally {
    document.title = previousTitle;
    document.documentElement.lang = previousLang;
  }
}

describe("accessible asynchronous rendering", () => {
  it("has no axe semantic violations for the loaded bundled record", async () => {
    const controller = new AppController(fetch, chronologyVerifier);
    mount(controller);
    await controller.load("demo");
    await expectSemanticAccessibility();
  });

  it("has no axe semantic violations for an invalid-JSON retry", async () => {
    const controller = new AppController(fetch, chronologyVerifier);
    const root = mount(controller);
    root.querySelector<HTMLDetailsElement>("#paste-panel")!.open = true;
    root.querySelector<HTMLTextAreaElement>("#record-json")!.value =
      "{ invalid JSON";
    root.querySelector<HTMLButtonElement>("#validate-json-button")!.click();
    await vi.waitFor(() =>
      expect(root.querySelector("#record-error")).not.toBeNull(),
    );
    await expectSemanticAccessibility();
  });

  it("has no axe semantic violations for a displayed Extended record", async () => {
    const controller = new AppController(fetch, chronologyVerifier);
    mount(controller);
    await controller.loadJson(JSON.stringify(extendedProduction));
    await expectSemanticAccessibility();
  });

  it("keeps a mounted live region, input drafts, selection, disclosure and focus on same-record updates", async () => {
    const controller = new AppController(fetch, chronologyVerifier);
    const root = mount(controller);
    await controller.load("demo");
    const live = root.querySelector<HTMLElement>("[aria-live]")!;
    const source = root.querySelector<HTMLInputElement>("#record-source")!;
    const paste = root.querySelector<HTMLDetailsElement>("#paste-panel")!;
    source.value = "https://cbyuce.com/verify/example?format=json";
    source.focus();
    source.setSelectionRange(8, 14);
    paste.open = true;
    root.querySelector<HTMLTextAreaElement>("#record-json")!.value =
      '{"draft":true}';

    controller.setWebMcp({
      status: "unavailable",
      detail: "Site tools unavailable.",
    });

    expect(root.querySelector("[aria-live]")).toBe(live);
    expect(root.querySelector<HTMLInputElement>("#record-source")?.value).toBe(
      source.value,
    );
    expect(document.activeElement).toBe(root.querySelector("#record-source"));
    expect(
      root.querySelector<HTMLInputElement>("#record-source")?.selectionStart,
    ).toBe(8);
    expect(
      root.querySelector<HTMLInputElement>("#record-source")?.selectionEnd,
    ).toBe(14);
    expect(root.querySelector<HTMLDetailsElement>("#paste-panel")?.open).toBe(
      true,
    );
    expect(root.querySelector<HTMLTextAreaElement>("#record-json")?.value).toBe(
      '{"draft":true}',
    );
  });

  it("restores a focused URL input without trying to set an unsupported text selection", async () => {
    const controller = new AppController(fetch, chronologyVerifier);
    const root = mount(controller);
    await controller.load("demo");
    root.querySelector<HTMLInputElement>("#recipient-link")!.focus();
    expect(() =>
      controller.setWebMcp({ status: "registered", detail: "Tools ready." }),
    ).not.toThrow();
    expect(document.activeElement).toBe(root.querySelector("#recipient-link"));
  });

  it("preserves the correct disclosures when optional WebMCP help shifts their positions", async () => {
    const controller = new AppController(fetch, chronologyVerifier);
    const root = mount(controller);
    await controller.load("demo");
    root.querySelector<HTMLDetailsElement>("#paste-panel")!.open = true;
    const signing = root.querySelector<HTMLDetailsElement>(".key-provenance")!;
    signing.open = true;
    signing.querySelector("summary")!.focus();

    controller.setWebMcp({ status: "registered", detail: "Tools ready." });
    expect(root.querySelector<HTMLDetailsElement>("#paste-panel")?.open).toBe(
      true,
    );
    expect(
      root.querySelector<HTMLDetailsElement>(".key-provenance")?.open,
    ).toBe(true);
    expect(document.activeElement).toBe(
      root.querySelector(".key-provenance summary"),
    );

    controller.setWebMcp({
      status: "unavailable",
      detail: "Tools unavailable.",
    });
    expect(root.querySelector<HTMLDetailsElement>("#paste-panel")?.open).toBe(
      true,
    );
    expect(
      root.querySelector<HTMLDetailsElement>(".key-provenance")?.open,
    ).toBe(true);
    expect(root.querySelector<HTMLDetailsElement>("#webmcp-help")?.open).toBe(
      false,
    );
    expect(document.activeElement).toBe(
      root.querySelector(".key-provenance summary"),
    );
  });

  it("retains focus on the corresponding public-source link after an update", async () => {
    const controller = new AppController(fetch, chronologyVerifier);
    const root = mount(controller);
    await controller.load("demo");
    const source = root.querySelector<HTMLAnchorElement>(
      ".hero-record .source-line a",
    )!;
    source.focus();
    controller.setWebMcp({ status: "registered", detail: "Tools ready." });
    expect(document.activeElement).toBe(
      root.querySelector(".hero-record .source-line a"),
    );
  });

  it("keeps pasted JSON and associates a failed validation with that field", async () => {
    const controller = new AppController(fetch, chronologyVerifier);
    const root = mount(controller);
    const paste = root.querySelector<HTMLDetailsElement>("#paste-panel")!;
    paste.open = true;
    const json = root.querySelector<HTMLTextAreaElement>("#record-json")!;
    json.value = "{ invalid JSON";
    json.focus();
    root.querySelector<HTMLButtonElement>("#validate-json-button")!.click();
    await vi.waitFor(() =>
      expect(root.querySelector("#record-error")).not.toBeNull(),
    );
    expect(root.querySelector<HTMLTextAreaElement>("#record-json")?.value).toBe(
      "{ invalid JSON",
    );
    expect(
      root
        .querySelector<HTMLTextAreaElement>("#record-json")
        ?.getAttribute("aria-invalid"),
    ).toBe("true");
    expect(
      root
        .querySelector<HTMLTextAreaElement>("#record-json")
        ?.getAttribute("aria-describedby"),
    ).toContain("record-error");
    expect(
      root
        .querySelector<HTMLInputElement>("#record-source")
        ?.hasAttribute("aria-invalid"),
    ).toBe(false);
    expect(root.querySelector<HTMLDetailsElement>("#paste-panel")?.open).toBe(
      true,
    );
  });

  it("does not label an unrelated controller error as a source-field error", () => {
    const controller = new AppController(fetch, chronologyVerifier);
    const root = mount(controller);
    controller.rejectRecipientLink("Bad recipient link");
    expect(root.querySelector("#record-error")?.textContent).toContain(
      "Bad recipient link",
    );
    expect(
      root.querySelector("#record-source")?.hasAttribute("aria-invalid"),
    ).toBe(false);
    expect(
      root.querySelector("#record-json")?.hasAttribute("aria-invalid"),
    ).toBe(false);
  });

  it("preserves opt-in only while record and local-file identities stay unchanged", async () => {
    const controller = new AppController(fetch, chronologyVerifier);
    const root = mount(controller);
    await controller.load("demo");
    const base = controller.getState();
    const localFile = {
      name: "one.txt",
      bytes: 3,
      sha256: "a".repeat(64),
      computedAt: "2026-09-21T00:00:00Z",
    };
    renderApp(root, controller, { ...base, localFile });
    const checkbox = root.querySelector<HTMLInputElement>(
      "#report-local-details",
    )!;
    checkbox.checked = true;
    renderApp(root, controller, { ...base, localFile });
    expect(
      root.querySelector<HTMLInputElement>("#report-local-details")?.checked,
    ).toBe(true);
    renderApp(root, controller, {
      ...base,
      localFile: { ...localFile, sha256: "b".repeat(64) },
    });
    expect(
      root.querySelector<HTMLInputElement>("#report-local-details")?.checked,
    ).toBe(false);

    root.querySelector<HTMLInputElement>("#report-local-details")!.checked =
      true;
    const record = {
      ...base.record!,
      source: "https://cbyuce.com/verify/different?format=json",
    };
    const verification = {
      ...base.verification!,
      recordBinding: {
        source: record.source,
        manifestHash: record.manifestHash,
      },
    };
    renderApp(root, controller, { ...base, record, verification, localFile });
    expect(
      root.querySelector<HTMLInputElement>("#report-local-details")?.checked,
    ).toBe(false);
  });

  it("moves focus to an enabled field when the active submit button becomes disabled", () => {
    const controller = new AppController(fetch, chronologyVerifier);
    const root = mount(controller);
    root.querySelector<HTMLButtonElement>("#load-record-button")!.focus();
    renderApp(root, controller, { ...controller.getState(), busy: true });
    expect(document.activeElement).toBe(root.querySelector("#record-source"));
    expect(root.querySelector("#main")?.getAttribute("tabindex")).toBe("-1");
  });

  it("does not style an all-unsupported result as verified", async () => {
    const controller = new AppController(fetch, chronologyVerifier);
    const root = mount(controller);
    await controller.load("demo");
    const state = controller.getState();
    renderApp(root, controller, {
      ...state,
      verification: {
        ...state.verification!,
        checks: [
          {
            id: "unsupported",
            label: "Unavailable",
            status: "unsupported",
            explanation: "Not checked.",
          },
        ],
      },
    });
    expect(
      root
        .querySelector(".verification-summary")
        ?.classList.contains("verification-summary--incomplete"),
    ).toBe(true);
    expect(
      root
        .querySelector(".verification-summary")
        ?.classList.contains("verification-summary--verified"),
    ).toBe(false);
  });
});
