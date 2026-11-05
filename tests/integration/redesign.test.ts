// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppController } from "../../src/app/controller";
import { startApplication } from "../../src/app/start";
import { renderApp } from "../../src/components/render";
import { DEMO_RECORD_ID } from "../../src/records/demo";
import type { FetchLike } from "../../src/records/loader";
import { parseRecipientRecordHash } from "../../src/records/recipient-link";
import type { EvidenceCheck } from "../../src/types/record";
import { validPublicResponse } from "../fixtures/public-record";

const publicId = validPublicResponse.manifest.hashes.manifestHash;
const publicSource = `https://cbyuce.com/verify/${publicId}?format=json`;
const unavailableChronology: EvidenceCheck = {
  id: "independent_anchor",
  label: "Arweave chronology check",
  status: "retryable",
  explanation: "Test public chronology source is unavailable.",
};

const subscriptions: Array<() => void> = [];
const initialUrl = window.location.href;

function publicFetcher() {
  return vi.fn<FetchLike>(async () => Response.json(validPublicResponse));
}

function mount(controller: AppController): HTMLElement {
  const root = document.createElement("div");
  document.body.append(root);
  subscriptions.push(
    controller.subscribe((state) => renderApp(root, controller, state)),
  );
  return root;
}

function find<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const node = root.querySelector<T>(selector);
  expect(node, `${selector} should exist`).not.toBeNull();
  return node!;
}

function submitReference(root: HTMLElement, value: string): void {
  const input = find<HTMLInputElement>(root, "#record-source");
  input.value = value;
  input.focus();
  find<HTMLFormElement>(root, ".load-form").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true }),
  );
}

async function waitForCompletedChecks(
  controller: AppController,
): Promise<void> {
  await vi.waitFor(() => {
    expect(controller.getState().record).toBeDefined();
    expect(controller.getState().busy).toBe(false);
    expect(
      controller
        .getState()
        .verification?.checks.some((check) => check.status === "checking"),
    ).toBe(false);
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

afterEach(() => {
  subscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
  document.body.replaceChildren();
  window.history.replaceState(null, "", initialUrl);
  vi.restoreAllMocks();
});

describe("approachable inspection workflows", () => {
  it("offers a labeled input before audience and integration content while the startup example stays available", async () => {
    const fetcher = publicFetcher();
    const controller = new AppController(
      fetcher,
      async () => unavailableChronology,
    );
    const root = mount(controller);
    await controller.load("demo");

    const input = find<HTMLInputElement>(root, "#record-source");
    expect(input.labels?.[0]?.textContent).toBe("Public UCE record link");
    expect(input.closest("details")).toBeNull();
    expect(input.required).toBe(false);
    for (const selector of ["#audience-examples", "#ai-integrations"]) {
      expect(
        input.compareDocumentPosition(find(root, selector)) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).not.toBe(0);
    }
    expect(find(root, ".inspection-results").hidden).toBe(true);
    expect(controller.summary().recordedManifestHash).toBe(DEMO_RECORD_ID);
    expect(find<HTMLButtonElement>(root, "#reload-demo-button").disabled).toBe(
      false,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("lets all eight audience groups select a situation without loading a record and retains the selection on a background update", async () => {
    const controller = new AppController(
      publicFetcher(),
      async () => unavailableChronology,
    );
    const root = mount(controller);
    await controller.load("demo");
    const load = vi.spyOn(controller, "load");
    const loadJson = vi.spyOn(controller, "loadJson");
    const record = controller.getState().record;
    const buttons = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".audience-grid button"),
    );
    expect(buttons).toHaveLength(8);
    expect(buttons.map((button) => button.textContent)).toEqual(
      expect.arrayContaining([
        "Influencers & social creators",
        "Clients, brands & publishers",
      ]),
    );
    const status = find(root, "#audience-status");
    // Native button focus and activation are exercised here. Real Enter/Space
    // behavior remains a browser check because jsdom has no keyboard defaults.
    for (const button of buttons) {
      expect(button.type).toBe("button");
      button.focus();
      button.click();
      expect(document.activeElement).toBe(button);
      expect(button.getAttribute("aria-pressed")).toBe("true");
      expect(
        root.querySelectorAll('.audience-button[aria-pressed="true"]'),
      ).toHaveLength(1);
      expect(find(root, "#audience-scenario").hidden).toBe(false);
      expect(find(root, "#audience-status")).toBe(status);
      expect(status.textContent).toContain(button.textContent);
    }
    const social = find<HTMLButtonElement>(root, "#audience-social");
    social.focus();
    social.click();
    controller.setWebMcp({ status: "registered", detail: "Tools ready." });

    expect(find(root, "#audience-social").getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(find(root, "#audience-scenario").textContent).toContain(
      "reposted or compressed copy",
    );
    expect(document.activeElement).toBe(find(root, "#audience-social"));
    find<HTMLButtonElement>(root, "#audience-inspect-record").click();
    expect(document.activeElement).toBe(find(root, "#record-source"));
    expect(controller.getState().record).toBe(record);
    expect(load).not.toHaveBeenCalled();
    expect(loadJson).not.toHaveBeenCalled();
  });

  it.each(["#reload-demo-button", "#explore-example"])(
    "opens the bundled example from %s and gives the result heading keyboard focus",
    async (selector) => {
      const controller = new AppController(
        publicFetcher(),
        async () => unavailableChronology,
      );
      const root = mount(controller);
      await controller.load("demo");
      const button = find<HTMLButtonElement>(root, selector);
      button.focus();
      button.click();
      await waitForCompletedChecks(controller);

      expect(find(root, ".inspection-results").hidden).toBe(false);
      expect(root.querySelector(".welcome")).toBeNull();
      expect(root.querySelector("#audience-examples")).toBeNull();
      expect(find(root, "#record-heading").tagName).toBe("H1");
      expect(document.activeElement).toBe(find(root, "#record-heading"));
      expect(find<HTMLDetailsElement>(root, "#inspect-another").open).toBe(
        false,
      );
      controller.setWebMcp({
        status: "unavailable",
        detail: "Tools unavailable.",
      });
      expect(document.activeElement).toBe(find(root, "#record-heading"));
      expect(find(root, ".inspection-results").hidden).toBe(false);
    },
  );

  it("loads a supplied recipient link directly into results without routing through first-visit marketing", async () => {
    window.history.replaceState(
      null,
      "",
      `#record=${encodeURIComponent(publicSource)}`,
    );
    const fetcher = publicFetcher();
    const controller = new AppController(
      fetcher,
      async () => unavailableChronology,
    );
    const root = mount(controller);
    const navigation = {
      location: window.location,
      addEventListener: vi.fn(),
    };
    await startApplication(controller, document, navigation);

    expect(controller.getState().record?.loadedFrom).toBe("cbyuce");
    expect(find(root, "#record-heading").textContent).toBe(
      validPublicResponse.manifest.work.title,
    );
    expect(find(root, ".inspection-results").hidden).toBe(false);
    expect(root.querySelector(".welcome")).toBeNull();
    expect(root.querySelector("#audience-examples")).toBeNull();
    expect(root.querySelector(".example-teaser")).toBeNull();
    expect(find(root, "#how-lens-helps").closest("[hidden]")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0].toString()).toBe(publicSource);
  });

  it("accepts a full record hash through the visible form and creates a share link for that same public record", async () => {
    const fetcher = publicFetcher();
    const controller = new AppController(
      fetcher,
      async () => unavailableChronology,
    );
    const root = mount(controller);
    submitReference(root, publicId.toUpperCase());
    await waitForCompletedChecks(controller);

    expect(fetcher.mock.calls[0]?.[0].toString()).toBe(publicSource);
    expect(controller.getState().record?.source).toBe(publicSource);
    expect(document.activeElement).toBe(find(root, "#record-heading"));
    const recipient = new URL(
      find<HTMLInputElement>(root, "#recipient-link").value,
    );
    expect(parseRecipientRecordHash(recipient.hash)).toEqual({
      kind: "record",
      reference: publicSource,
    });
    expect(
      find<HTMLButtonElement>(root, "#download-report-button").disabled,
    ).toBe(false);
    expect(find<HTMLButtonElement>(root, "#print-report-button").disabled).toBe(
      false,
    );
    expect(find<HTMLInputElement>(root, "#report-local-details").checked).toBe(
      false,
    );
  });

  it("opens pasted public JSON without creating a public sharing reference or contacting a record source", async () => {
    const fetcher = publicFetcher();
    const controller = new AppController(
      fetcher,
      async () => unavailableChronology,
    );
    const root = mount(controller);
    find<HTMLDetailsElement>(root, "#paste-panel").open = true;
    find<HTMLTextAreaElement>(root, "#record-json").value =
      JSON.stringify(validPublicResponse);
    find<HTMLButtonElement>(root, "#validate-json-button").click();
    await waitForCompletedChecks(controller);

    expect(controller.getState().record?.loadedFrom).toBe("pasted_json");
    expect(find(root, ".inspection-results").hidden).toBe(false);
    expect(document.activeElement).toBe(find(root, "#record-heading"));
    expect(root.querySelector("#recipient-link")).toBeNull();
    expect(
      root.querySelector('.result-actions a[href="#share-record"]'),
    ).toBeNull();
    expect(
      find<HTMLButtonElement>(root, "#download-report-button").disabled,
    ).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps a rejected reference editable and focused after moving from the welcome form into recovery", async () => {
    const fetcher = publicFetcher();
    const controller = new AppController(
      fetcher,
      async () => unavailableChronology,
    );
    const root = mount(controller);
    const rejected = "https://unapproved.example/record";
    submitReference(root, rejected);
    await vi.waitFor(() =>
      expect(root.querySelector("#record-error")).not.toBeNull(),
    );

    const input = find<HTMLInputElement>(root, "#record-source");
    expect(input.value).toBe(rejected);
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain("record-error");
    expect(find<HTMLDetailsElement>(root, "#inspect-another").open).toBe(true);
    expect(find(root, "#record-error").getAttribute("role")).toBe("alert");
    expect(root.querySelector(".inspection-results")).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reopens both recovery disclosures and focuses an invalid JSON draft when inspecting another record", async () => {
    const controller = new AppController(
      publicFetcher(),
      async () => unavailableChronology,
    );
    const root = mount(controller);
    await controller.load(publicId);
    find<HTMLDetailsElement>(root, "#inspect-another").open = true;
    find<HTMLDetailsElement>(root, "#paste-panel").open = true;
    const text = '{"unfinished":';
    find<HTMLTextAreaElement>(root, "#record-json").value = text;
    const button = find<HTMLButtonElement>(root, "#validate-json-button");
    button.focus();
    button.click();
    await vi.waitFor(() =>
      expect(root.querySelector("#record-error")).not.toBeNull(),
    );

    const input = find<HTMLTextAreaElement>(root, "#record-json");
    expect(input.value).toBe(text);
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-describedby")).toContain("record-error");
    expect(find<HTMLDetailsElement>(root, "#inspect-another").open).toBe(true);
    expect(find<HTMLDetailsElement>(root, "#paste-panel").open).toBe(true);
    expect(root.querySelector("#record-heading")).toBeNull();
  });

  it("keeps inspect-another open with the user's drafts and focus when pending chronology completes", async () => {
    const chronology = deferred<EvidenceCheck>();
    const controller = new AppController(
      publicFetcher(),
      async () => chronology.promise,
    );
    const root = mount(controller);
    const loading = controller.load(publicId);
    await vi.waitFor(() => expect(controller.getState().record).toBeDefined());
    expect(
      find<HTMLButtonElement>(root, "#download-report-button").disabled,
    ).toBe(true);
    find<HTMLDetailsElement>(root, "#inspect-another").open = true;
    find<HTMLDetailsElement>(root, "#paste-panel").open = true;
    const source = find<HTMLInputElement>(root, "#record-source");
    source.value = "https://arweave.net/a-new-record-draft";
    source.focus();
    source.setSelectionRange(8, 15);
    find<HTMLTextAreaElement>(root, "#record-json").value = '{"draft":true}';

    chronology.resolve(unavailableChronology);
    await loading;

    expect(find<HTMLDetailsElement>(root, "#inspect-another").open).toBe(true);
    expect(find<HTMLDetailsElement>(root, "#paste-panel").open).toBe(true);
    const restored = find<HTMLInputElement>(root, "#record-source");
    expect(restored.value).toBe(source.value);
    expect(document.activeElement).toBe(restored);
    expect([restored.selectionStart, restored.selectionEnd]).toEqual([8, 15]);
    expect(find<HTMLTextAreaElement>(root, "#record-json").value).toBe(
      '{"draft":true}',
    );
    expect(find(root, ".inspection-results").hidden).toBe(false);
    expect(controller.getState().record?.id).toBe(publicId);
    expect(
      find<HTMLButtonElement>(root, "#download-report-button").disabled,
    ).toBe(false);
    expect(find<HTMLButtonElement>(root, "#print-report-button").disabled).toBe(
      false,
    );
    expect(root.querySelector("#retry-checks")).not.toBeNull();
  });
  it("keeps the recipient reference while keyboard-accessible section links move focus", async () => {
    const hash = `#record=${encodeURIComponent(publicSource)}`;
    window.history.replaceState(null, "", hash);
    const skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#main";
    document.body.append(skip);
    const controller = new AppController(
      publicFetcher(),
      async () => unavailableChronology,
    );
    const root = mount(controller);
    await controller.load(publicSource);
    const targets = [
      "local-heading",
      "share-record",
      "report-heading",
      "how-lens-helps",
      "ai-integrations",
    ];
    for (const id of targets) {
      const link = find<HTMLAnchorElement>(
        root,
        `a[data-section-target="${id}"]`,
      );
      expect(new URL(link.href).hash).toBe(hash);
      link.click();
      expect(window.location.hash).toBe(hash);
      expect(document.activeElement).toBe(find(root, `#${id}`));
    }
    skip.click();
    expect(document.activeElement).toBe(find(root, "#main"));
    expect(window.location.hash).toBe(hash);
    expect(parseRecipientRecordHash(window.location.hash)).toEqual({
      kind: "record",
      reference: publicSource,
    });
  });

  it("keeps a local-file failure visible beside comparison when the record inspector is closed", async () => {
    const controller = new AppController(
      publicFetcher(),
      async () => unavailableChronology,
    );
    const root = mount(controller);
    await controller.load(publicSource);
    const inspector = find<HTMLDetailsElement>(root, "#inspect-another");
    inspector.open = false;
    const tooLarge = new File(["test"], "too-large.txt");
    Object.defineProperty(tooLarge, "size", { value: 513 * 1024 * 1024 });
    const input = find<HTMLInputElement>(root, "#local-file");
    Object.defineProperty(input, "files", { value: [tooLarge] });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(controller.getState().error).toBeDefined());
    const error = find(root, "#record-error");
    expect(error.closest(".local-file")).not.toBeNull();
    expect(error.closest("details")).toBeNull();
    expect(error.closest("[hidden]")).toBeNull();
    expect(error.textContent).toContain(controller.getState().error);
    expect(find<HTMLDetailsElement>(root, "#inspect-another").open).toBe(false);
  });
});
