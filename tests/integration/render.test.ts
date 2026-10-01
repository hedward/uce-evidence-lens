// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { TRUSTED_PLATFORM_KEYS } from "../../src/security/trusted-platform-keys";
import { AppController } from "../../src/app/controller";
import { renderApp } from "../../src/components/render";
import { MANIFEST_COMPATIBILITY } from "../../src/records/manifest-compatibility";

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
  it("renders both hybrid component outcomes and key provenance without hiding a failed component", async () => {
    const controller = testController();
    await controller.load("demo");
    const state = controller.getState();
    const root = document.createElement("div");
    // Presentation fixture only: does not enable the runtime hybrid gate.
    renderApp(root, controller, {
      ...state,
      verification: {
        ...state.verification!,
        checks: [
          {
            id: "platform_signature",
            label: "Hybrid presentation test",
            status: "mismatch",
            explanation: "Both components are required.",
            signatureComponents: [
              {
                algorithm: "ES256",
                status: "verified",
                explanation: "Classical test pass.",
                keyId: "test-ec",
                publicKeySource: "https://example.invalid/public-key",
              },
              {
                algorithm: "ML-DSA-65",
                status: "mismatch",
                explanation: "Synthetic failing component <script>",
              },
            ],
          },
        ],
      },
    });
    const details =
      root.querySelector<HTMLDetailsElement>(".hybrid-provenance")!;
    expect(details.open).toBe(false);
    expect(details.textContent).toContain("ES256: Verified");
    expect(details.textContent).toContain("ML-DSA-65: Mismatch");
    expect(details.textContent).toContain("test-ec");
    expect(details.textContent).toContain(
      "Synthetic failing component <script>",
    );
    expect(details.querySelector("script")).toBeNull();
  });
  it("lists readable versions from the registry separately from verification coverage", () => {
    const controller = testController();
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());
    const compatibility = root.querySelector(".manifest-compatibility");
    expect(compatibility?.querySelector("p")?.textContent).toBe(
      `Readable manifest versions: ${new Intl.ListFormat("en", { type: "conjunction" }).format(Object.keys(MANIFEST_COMPATIBILITY))}.`,
    );
    expect(compatibility?.textContent).toContain(
      "Verification coverage varies by format",
    );
    const details = compatibility?.querySelector("details");
    expect(details?.open).toBe(false);
    expect(details?.textContent).toContain(
      "reviewed standard 1.0.0 ES256 profile",
    );
    expect(details?.textContent).toContain(
      "Hybrid 2.0.0 and 2.1.0 signatures remain readable but are not independently verified",
    );
    expect(details?.textContent).toContain(
      "Independent manifest-hash recomputation is supported for the reviewed Extended 1.1.0 profile",
    );
  });

  it.each(["1.0.0", "1.1.0", "2.0.0", "2.1.0"] as const)(
    "labels a displayed %s record with its own schema version, not the app version",
    async (schemaVersion) => {
      const controller = testController();
      await controller.load("demo");
      const state = controller.getState();
      const root = document.createElement("div");
      // Display-only projection: do not attach the demo's verification to a changed record.
      renderApp(root, controller, {
        ...state,
        record: { ...state.record!, schemaVersion },
        verification: undefined,
      });
      expect(root.querySelector(".hero-record .eyebrow")?.textContent).toBe(
        `Record schema: uce.evidence.manifest · v${schemaVersion}`,
      );
      expect(root.querySelector(".record-version-note")?.textContent).toContain(
        "describes this record, not the Lens application",
      );
      expect(root.querySelector(".hero-record h2")?.textContent).toBe(
        "UCE Evidence Lens — Logo and Tagline v1.0",
      );
    },
  );

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

  it("labels v1.1.1 while linking only to the historical v1.0.0 evidence", () => {
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
    expect(evidenceLink?.getAttribute("href")).not.toContain("v1.1.1");
    expect(evidenceLink?.getAttribute("aria-label")).toBe(
      "View historical UCE evidence for submitted release 1.0.0; it does not cover UCE Evidence Lens release 1.1.1",
    );
    expect(evidenceLink?.textContent).toContain(
      "UCE Evidence Lens release 1.1.1",
    );
    expect(evidenceLink?.textContent).toContain(
      "Historical v1.0.0 evidence — does not cover this release",
    );
  });

  it("keeps bundled file chronology visible and labels gateway-index provenance", async () => {
    const controller = testController();
    await controller.load("demo");
    const state = controller.getState();
    const root = document.createElement("div");
    renderApp(root, controller, {
      ...state,
      verification: {
        ...state.verification!,
        summary:
          "No problems found in completed checks. A result is reported from its public source but is not independently verified.",
        checks: [
          ...state.verification!.checks.filter(
            (check) =>
              check.id !== "file_anchor" && check.id !== "independent_anchor",
          ),
          {
            id: "file_anchor",
            label: "File transaction chronology",
            status: "reported",
            explanation:
              "A public gateway index reports the bundled item under this confirmed root transaction.",
            chronologyProvenance: {
              referenceType: "bundled_item",
              transactionId: "A".repeat(43),
              rootTransactionId: "B".repeat(43),
              parentPath: ["A".repeat(43), "B".repeat(43)],
              block: {
                height: 1_234,
                hash: "block-hash",
                timestamp: "2026-09-30T12:00:00.000Z",
              },
              relationship: "gateway_index",
              indexSource: "https://turbo-gateway.com/graphql",
            },
          },
        ],
      },
    });

    const card = Array.from(root.querySelectorAll(".check-card")).find(
      (candidate) =>
        candidate.textContent?.includes("File transaction chronology"),
    );
    expect(card).toBeDefined();
    expect(card?.closest("details.technical-details")).toBeNull();
    expect(card?.textContent).toContain("Gateway reported");
    expect(card?.textContent).toContain("Bundled data item");
    expect(card?.textContent).toContain("Public gateway index metadata");
    expect(card?.querySelector("a")?.getAttribute("href")).toBe(
      "https://turbo-gateway.com/graphql",
    );
    expect(root.querySelector(".verification-summary")?.className).toContain(
      "verification-summary--incomplete",
    );
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
      "No problems found in completed checks.",
    );
    expect(root.querySelector(".status--retryable")?.textContent).toBe(
      "Try again",
    );
    const details =
      root.querySelector<HTMLDetailsElement>(".technical-details");
    expect(details?.open).toBe(false);
    expect(details?.textContent).toContain("Publisher reported");
    expect(details?.textContent).not.toContain(
      "Independent manifest recomputation",
    );
    expect(root.textContent).toContain("Independent manifest recomputation");
  });

  it("shows the standard hash coverage exclusions outside collapsed details", async () => {
    const controller = testController();
    await controller.load("demo");
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());
    const coverage = root.querySelector(".verification-coverage");
    expect(coverage?.closest("details")).toBeNull();
    expect(coverage?.textContent).toContain(
      "excludes work, policy, AI disclosures, file names",
    );
    const signature = Array.from(root.querySelectorAll(".check-card")).find(
      (card) => card.textContent?.includes("Platform ES256 signature"),
    )!;
    expect(
      signature.querySelector(".source-line a")?.getAttribute("href"),
    ).toBe(controller.getState().record!.source);
    const keyDetails =
      signature.querySelector<HTMLDetailsElement>(".key-provenance");
    expect(keyDetails?.open).toBe(false);
    expect(keyDetails?.textContent).toContain(
      "Historical key review reference (not the inspected record)",
    );
    expect(keyDetails?.textContent).toContain(
      TRUSTED_PLATFORM_KEYS[0]!.approvalSource,
    );
  });

  it("prints a dated snapshot with all checks and no default local-file details", async () => {
    const controller = testController();
    await controller.load("demo");
    const root = document.createElement("div");
    renderApp(root, controller, controller.getState());
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const button = Array.from(root.querySelectorAll("button")).find(
      (item) => item.textContent === "Print / Save report as PDF",
    )!;
    button.click();
    expect(print).toHaveBeenCalledOnce();
    const report = document.querySelector("#uce-print-report")!;
    expect(report.querySelectorAll(".check-card")).toHaveLength(
      controller.getState().verification!.checks.length,
    );
    expect(report.textContent).toContain(
      controller.getState().verification!.checkedAt,
    );
    expect(report.textContent).toContain("unsigned");
    expect(report.textContent).toContain("Independent manifest recomputation");
    expect(report.textContent).toContain("excludes work, policy");
    expect(
      report.querySelector<HTMLDetailsElement>(".key-provenance")?.open,
    ).toBe(true);
    expect(report.textContent).not.toContain("Selected local filename");
    window.dispatchEvent(new Event("afterprint"));
    expect(document.querySelector("#uce-print-report")).toBeNull();
    print.mockRestore();
  });
});
