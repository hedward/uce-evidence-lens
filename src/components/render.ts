import type { AppController, AppState } from "../app/controller";
import { RELEASE_EVIDENCE_URL, RELEASE_VERSION } from "../config/release";
import { DEMO_FILE_URL, DEMO_MANIFEST_URL } from "../records/demo";
import type { EvidenceCheck, EvidenceStatus } from "../types/record";
import {
  inspectChronology,
  listAssertions,
  LEGAL_NOTICE,
} from "../verification/evidence";

type Child = Node | string | null | undefined;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    className?: string;
    text?: string;
    attrs?: Record<string, string>;
  } = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  Object.entries(options.attrs ?? {}).forEach(([name, value]) =>
    element.setAttribute(name, value),
  );
  children.forEach((child) => {
    if (child instanceof Node) element.append(child);
    else if (child !== null && child !== undefined)
      element.append(document.createTextNode(child));
  });
  return element;
}

function formatDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "medium",
      });
}

function safeLink(url: string, label: string): HTMLElement {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") throw new Error("unsafe");
    return el("a", {
      text: label,
      attrs: { href: parsed.toString(), target: "_blank", rel: "noreferrer" },
    });
  } catch {
    return el("span", { text: label });
  }
}

const statusLabels: Record<EvidenceStatus, string> = {
  verified: "Verified",
  mismatch: "Mismatch",
  checking: "Checking",
  retryable: "Try again",
  reported: "Publisher reported",
  unsupported: "Not independently checked",
};

const technicalStatuses = new Set<EvidenceStatus>(["reported", "unsupported"]);

function checkCard(check: EvidenceCheck): HTMLElement {
  const status = el("span", {
    className: `status status--${check.status}`,
    text: statusLabels[check.status],
  });
  const card = el(
    "article",
    { className: "check-card" },
    el(
      "div",
      { className: "check-card__heading" },
      el("h3", { text: check.label }),
      status,
    ),
    el("p", { text: check.explanation }),
  );
  if (check.source)
    card.append(
      el(
        "p",
        { className: "source-line" },
        "Source: ",
        safeLink(check.source, check.source),
      ),
    );
  return card;
}

function definitionList(
  entries: Array<[string, string | undefined]>,
): HTMLElement {
  const list = el("dl", { className: "facts" });
  entries.forEach(([term, value]) => {
    if (!value) return;
    list.append(
      el("div", {}, el("dt", { text: term }), el("dd", { text: value })),
    );
  });
  return list;
}

function loader(controller: AppController, busy: boolean): HTMLElement {
  const input = el("input", {
    attrs: {
      id: "record-source",
      name: "source",
      type: "text",
      placeholder: "Public CbyUCE URL, record hash, or Arweave URL",
      autocomplete: "off",
      spellcheck: "false",
    },
  });
  const submit = el("button", {
    className: "button button--primary",
    text: busy ? "Loading…" : "Load record",
  });
  submit.type = "submit";
  submit.disabled = busy;
  const form = el(
    "form",
    {
      className: "load-form",
      attrs: { "aria-label": "Load a public UCE record" },
    },
    el("label", {
      text: "Public record source",
      attrs: { for: "record-source" },
    }),
    el("div", { className: "load-form__row" }, input, submit),
    el("p", {
      className: "field-note",
      text: "Approved public sources only: cbyuce.com and arweave.net. If live retrieval is unavailable, reload the bundled demo, use an Arweave URL, or paste public JSON.",
    }),
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void controller.load(input.value);
  });

  const demoButton = el("button", {
    className: "button button--quiet",
    text: "Reload bundled demo",
  });
  demoButton.type = "button";
  demoButton.disabled = busy;
  demoButton.addEventListener("click", () => void controller.load("demo"));

  const textarea = el("textarea", {
    attrs: {
      id: "record-json",
      rows: "5",
      placeholder:
        "Paste a public manifest or { manifest, verification } JSON response",
      spellcheck: "false",
    },
  });
  const pasteButton = el("button", {
    className: "button button--quiet",
    text: "Validate pasted JSON",
  });
  pasteButton.type = "button";
  pasteButton.disabled = busy;
  pasteButton.addEventListener(
    "click",
    () => void controller.loadJson(textarea.value),
  );
  const details = el(
    "details",
    { className: "paste-panel" },
    el("summary", { text: "Paste public JSON instead" }),
    el("label", { text: "Public record JSON", attrs: { for: "record-json" } }),
    textarea,
    pasteButton,
  );

  return el(
    "section",
    { className: "panel loader", attrs: { "aria-labelledby": "load-heading" } },
    el("h2", {
      text: "Open an evidence record",
      attrs: { id: "load-heading" },
    }),
    form,
    el("div", { className: "loader__actions" }, demoButton),
    details,
  );
}

function recordView(
  controller: AppController,
  state: Readonly<AppState>,
): HTMLElement | null {
  const record = state.record;
  if (!record) return null;
  const verification =
    state.verification?.recordBinding.source === record.source &&
    state.verification.recordBinding.manifestHash === record.manifestHash
      ? state.verification
      : undefined;
  const summary = el(
    "section",
    {
      className: "panel hero-record",
      attrs: { "aria-labelledby": "record-heading" },
    },
    el("p", {
      className: "eyebrow",
      text: `${record.schema} · v${record.schemaVersion}`,
    }),
    el("h2", { text: record.title, attrs: { id: "record-heading" } }),
    el("p", {
      className: "assertion-callout",
      text: `Recorded author assertion: ${record.authorName}`,
    }),
    definitionList([
      ["Record identifier", record.id],
      ["Recorded manifest hash", record.manifestHash],
      ["Registration timestamp", formatDate(record.registrationTimestamp)],
      ["Claimed creation date", record.creationDate],
      ["Work category", record.workCategory],
      ["Loaded from", record.loadedFrom.replaceAll("_", " ")],
    ]),
    el(
      "p",
      { className: "source-line" },
      "Public source: ",
      safeLink(record.source, record.source),
    ),
  );

  const primaryChecks = (verification?.checks ?? []).filter(
    (check) => !technicalStatuses.has(check.status),
  );
  const technicalChecks = (verification?.checks ?? []).filter((check) =>
    technicalStatuses.has(check.status),
  );
  const summaryStatus = verification?.checks.some(
    (check) => check.status === "mismatch",
  )
    ? "mismatch"
    : verification?.checks.some((check) => check.status === "checking")
      ? "checking"
      : verification?.checks.some((check) => check.status === "retryable")
        ? "retryable"
        : "verified";

  const checks = el(
    "section",
    {
      className: "section-block",
      attrs: { "aria-labelledby": "checks-heading" },
    },
    el(
      "div",
      { className: "section-heading" },
      el(
        "div",
        {},
        el("p", { className: "eyebrow", text: "Browser-performed operations" }),
        el("h2", {
          text: "Verification checks",
          attrs: { id: "checks-heading" },
        }),
      ),
    ),
    verification
      ? el(
          "div",
          {
            className: `verification-summary verification-summary--${summaryStatus}`,
            attrs: {
              role: summaryStatus === "mismatch" ? "alert" : "status",
            },
          },
          el("strong", { text: verification.summary }),
          summaryStatus === "retryable"
            ? el("span", {
                text: " The record remains usable; retrying may add independent confirmation.",
              })
            : null,
        )
      : null,
    el("div", { className: "check-grid" }, ...primaryChecks.map(checkCard)),
    technicalChecks.length
      ? el(
          "details",
          { className: "technical-details" },
          el("summary", {
            text: `Technical details and publisher statements (${technicalChecks.length})`,
          }),
          el("p", {
            className: "technical-details__intro",
            text: "These items add context but are not counted as independent verification results.",
          }),
          el(
            "div",
            { className: "check-grid" },
            ...technicalChecks.map(checkCard),
          ),
        )
      : null,
  );

  const firstFile = record.files[0];
  const fileInput = el("input", { attrs: { id: "local-file", type: "file" } });
  fileInput.disabled = state.busy;
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) void controller.selectLocalFile(file);
  });
  const filePanel = el(
    "section",
    {
      className: "panel local-file",
      attrs: { "aria-labelledby": "local-heading" },
    },
    el("p", { className: "eyebrow", text: "Private by design" }),
    el("h2", { text: "Compare a local file", attrs: { id: "local-heading" } }),
    el("p", {
      text: "The selected file is hashed with SHA-256 in this browser. Its contents are not uploaded, stored, or exposed to agent tools.",
    }),
    firstFile
      ? definitionList([
          ["Recorded filename", firstFile.filename],
          ["Recorded SHA-256", firstFile.sha256],
          ["Recorded size", `${firstFile.bytes.toLocaleString()} bytes`],
        ])
      : el("p", { text: "This record contains no supported file entry." }),
    record.loadedFrom === "bundled_demo"
      ? el(
          "div",
          { className: "loader__actions bundled-demo__actions" },
          el("a", {
            className: "button button--quiet",
            text: "Download bundled demo file",
            attrs: {
              href: DEMO_FILE_URL,
              download: "uce-evidence-lens-logo-tagline-v1.0.png",
            },
          }),
          el("a", {
            className: "button button--quiet",
            text: "View bundled manifest JSON",
            attrs: {
              href: DEMO_MANIFEST_URL,
              target: "_blank",
              rel: "noreferrer",
            },
          }),
        )
      : null,
    el("label", {
      className: "file-label",
      text: "Choose a file to hash",
      attrs: { for: "local-file" },
    }),
    fileInput,
    state.localFile
      ? definitionList([
          ["Selected filename", state.localFile.name],
          ["Selected size", `${state.localFile.bytes.toLocaleString()} bytes`],
          ["Computed SHA-256", state.localFile.sha256],
        ])
      : null,
    state.localComparison ? checkCard(state.localComparison) : null,
  );

  const chronology = inspectChronology(record);
  const timeline = el(
    "section",
    {
      className: "section-block",
      attrs: { "aria-labelledby": "chronology-heading" },
    },
    el("p", { className: "eyebrow", text: "Claims are not anchors" }),
    el("h2", { text: "Chronology", attrs: { id: "chronology-heading" } }),
    el(
      "ol",
      { className: "timeline" },
      ...chronology.map((item) =>
        el(
          "li",
          { className: `timeline__item timeline__item--${item.kind}` },
          el(
            "div",
            { className: "timeline__meta" },
            el("span", {
              className: "timeline__kind",
              text: item.kind.replaceAll("_", " "),
            }),
            el("time", {
              text: formatDate(item.timestamp),
              attrs: { datetime: item.timestamp },
            }),
          ),
          el("h3", { text: item.label }),
          el("p", { text: item.limitation }),
          el(
            "p",
            { className: "source-line" },
            "Source: ",
            item.source.startsWith("https://")
              ? safeLink(item.source, item.source)
              : el("code", { text: item.source }),
          ),
        ),
      ),
    ),
  );

  const assertions = el(
    "section",
    {
      className: "section-block",
      attrs: { "aria-labelledby": "assertions-heading" },
    },
    el("p", { className: "eyebrow", text: "What the record says" }),
    el("h2", {
      text: "Recorded assertions",
      attrs: { id: "assertions-heading" },
    }),
    el(
      "div",
      { className: "assertion-grid" },
      ...listAssertions(record).map((assertion) =>
        el(
          "article",
          { className: "assertion-card" },
          el("span", {
            className: "assertion-card__category",
            text: assertion.category.replaceAll("_", " "),
          }),
          el("h3", { text: assertion.label }),
          el("p", {
            className: "assertion-card__value",
            text: assertion.value,
          }),
          el("p", { text: assertion.limitation }),
          el("code", { text: assertion.source }),
        ),
      ),
    ),
  );
  return el("div", {}, summary, checks, filePanel, timeline, assertions);
}

function webMcpStatus(state: Readonly<AppState>): HTMLElement {
  const status = el(
    "div",
    {
      className: `webmcp-badge webmcp-badge--${state.webmcp.status}`,
      attrs: { role: "status" },
    },
    el("span", {
      className: "webmcp-badge__dot",
      attrs: { "aria-hidden": "true" },
    }),
    el("span", { text: state.webmcp.detail }),
  );

  const container = el("div", { className: "webmcp-status" }, status);
  if (state.webmcp.status === "registered") return container;

  container.append(
    el(
      "details",
      { className: "webmcp-help" },
      el("summary", { text: "Enable AI-agent site tools" }),
      el("p", {
        text: "Open this page in ChatGPT desktop’s built-in browser using GPT-5.6 Sol or Terra.",
      }),
      el(
        "ol",
        {},
        el("li", {
          text: "Update the ChatGPT desktop app to the latest version.",
        }),
        el("li", {
          text: "Go to Settings → Browser → Permissions and turn on Enable site tools.",
        }),
        el("li", {
          text: "Reload this page, then use Site tools in the address bar to view the available tools.",
        }),
      ),
      el(
        "p",
        { className: "webmcp-help__chrome" },
        el("strong", { text: "Testing in Chrome? " }),
        "Open ",
        el("code", { text: "chrome://flags/#enable-webmcp-testing" }),
        ", set the flag to Enabled, relaunch Chrome, and reload this page.",
      ),
      el(
        "p",
        { className: "webmcp-help__note" },
        "Current availability and setup can change. ",
        safeLink(
          "https://learn.chatgpt.com/docs/webmcp",
          "Read the official WebMCP guide",
        ),
        ".",
      ),
    ),
  );
  return container;
}

export function renderApp(
  root: HTMLElement,
  controller: AppController,
  state: Readonly<AppState>,
): void {
  const currentVerification =
    state.record &&
    state.verification?.recordBinding.source === state.record.source &&
    state.verification.recordBinding.manifestHash === state.record.manifestHash
      ? state.verification
      : undefined;
  const header = el(
    "header",
    { className: "site-header" },
    el("img", {
      className: "brand-mark",
      attrs: {
        src: "/uce-mark.svg",
        alt: "UCE Mark",
        width: "84",
        height: "84",
      },
    }),
    el(
      "div",
      {},
      el("p", {
        className: "eyebrow",
        text: "Copyright by UCE",
      }),
      el("h1", { text: "UCE Evidence Lens" }),
      el("p", {
        className: "lede",
        text: "Inspect integrity, chronology, signatures, rights assertions, and local file matches—without uploading the underlying work.",
      }),
    ),
    webMcpStatus(state),
  );
  const notice = el(
    "aside",
    { className: "legal-notice" },
    el("strong", { text: "Evidence, not a legal verdict. " }),
    LEGAL_NOTICE,
  );
  const error = state.error
    ? el(
        "div",
        { className: "error-banner", attrs: { role: "alert" } },
        el("strong", { text: "Could not complete that request. " }),
        state.error,
      )
    : null;
  const main = el(
    "main",
    { attrs: { id: "main" } },
    loader(controller, state.busy),
    error,
    recordView(controller, state),
  );
  const footer = el(
    "footer",
    {},
    el(
      "div",
      { className: "footer__uce-mark" },
      el(
        "a",
        {
          className: "footer__evidence-link",
          attrs: {
            href: RELEASE_EVIDENCE_URL,
            "aria-label": `View the UCE evidence record for UCE Evidence Lens release ${RELEASE_VERSION}`,
          },
        },
        el("img", {
          attrs: {
            src: "/uce-mark.svg",
            alt: "",
            width: "48",
            height: "48",
          },
        }),
        el(
          "p",
          { className: "footer__evidence" },
          el("strong", {
            text: `UCE Evidence Lens release ${RELEASE_VERSION}`,
          }),
          el("span", {
            className: "footer__evidence-record",
            text: "View UCE release evidence",
          }),
        ),
      ),
    ),
    el(
      "div",
      { className: "footer__copy" },
      el("p", { text: "Immutable • Identifiable • Verifiable" }),
      el("p", {
        text: "Read-only reference verifier · no account · no upload · no legal determination",
      }),
    ),
  );
  const live = el("div", {
    className: "sr-only",
    text: state.busy
      ? "Verification work in progress"
      : (state.error ?? currentVerification?.summary ?? "Ready"),
    attrs: { "aria-live": "polite" },
  });
  root.replaceChildren(header, notice, main, footer, live);
}
