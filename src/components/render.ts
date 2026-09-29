import type { AppController, AppState } from "../app/controller";
import {
  HISTORICAL_EVIDENCE_URL,
  HISTORICAL_EVIDENCE_VERSION,
  RELEASE_VERSION,
} from "../config/release";
import { createRecipientRecordLink } from "../records/recipient-link";
import { MANIFEST_COMPATIBILITY } from "../records/manifest-compatibility";
import {
  createVerificationReport,
  serializeVerificationReport,
  type VerificationReport,
} from "../reports/verification-report";
import { DEMO_FILE_URL, DEMO_MANIFEST_URL } from "../records/demo";
import type { EvidenceCheck, EvidenceStatus } from "../types/record";
import {
  inspectChronology,
  listAssertions,
  LEGAL_NOTICE,
} from "../verification/evidence";

type Child = Node | string | null | undefined;

type FieldAction = "source" | "json" | null;
interface InteractionState {
  action: FieldAction;
  pending: boolean;
  fieldError: FieldAction;
  resetPrivacy: boolean;
}
const interactions = new WeakMap<AppController, InteractionState>();

function interactionFor(controller: AppController): InteractionState {
  let interaction = interactions.get(controller);
  if (!interaction) {
    interaction = {
      action: null,
      pending: false,
      fieldError: null,
      resetPrivacy: false,
    };
    interactions.set(controller, interaction);
  }
  return interaction;
}

function beginAction(controller: AppController, action: FieldAction): void {
  const interaction = interactionFor(controller);
  interaction.action = action;
  interaction.pending = true;
  interaction.fieldError = null;
}

interface RenderMemory {
  content: HTMLElement;
  live: HTMLElement;
  recordKey?: string;
  localFileKey?: string;
}
const renderMemory = new WeakMap<HTMLElement, RenderMemory>();

function recordKey(state: Readonly<AppState>): string | undefined {
  return state.record
    ? `${state.record.source}\u0000${state.record.manifestHash}`
    : undefined;
}

function localFileKey(state: Readonly<AppState>): string | undefined {
  return state.localFile
    ? `${state.localFile.name}\u0000${state.localFile.sha256}\u0000${state.localFile.computedAt}`
    : undefined;
}

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
        check.signatureProvenance ? "Record inspected: " : "Source: ",
        safeLink(check.source, check.source),
      ),
    );
  if (check.signatureProvenance) {
    const provenance = check.signatureProvenance;
    card.append(
      el(
        "details",
        { className: "key-provenance" },
        el("summary", { text: "Signing key provenance" }),
        definitionList([
          ["Reviewed key ID", provenance.keyId],
          ["JWK thumbprint (SHA-256)", provenance.keyThumbprint],
          ["Key reviewed on", provenance.reviewedAt],
        ]),
        el(
          "p",
          { className: "source-line" },
          "Public key material: ",
          safeLink(provenance.publicKeySource, provenance.publicKeySource),
        ),
        el(
          "p",
          { className: "source-line" },
          "Historical key review reference (not the inspected record): ",
          safeLink(provenance.keyReviewSource, provenance.keyReviewSource),
        ),
      ),
    );
  }
  if (check.signatureComponents?.length) {
    const details = el(
      "details",
      { className: "hybrid-provenance" },
      el("summary", { text: "Both hybrid signatures and reviewed keys" }),
    );
    for (const component of check.signatureComponents) {
      details.append(
        el("h4", {
          text: `${component.algorithm}: ${statusLabels[component.status]}`,
        }),
        el("p", { text: component.explanation }),
        definitionList([
          ["Reviewed key ID", component.keyId],
          ["Key fingerprint (SHA-256)", component.keyFingerprint],
          ["Key reviewed on", component.reviewedAt],
        ]),
      );
      if (component.publicKeySource)
        details.append(
          el(
            "p",
            { className: "source-line" },
            "Reviewed public key: ",
            safeLink(component.publicKeySource, component.publicKeySource),
          ),
        );
    }
    card.append(details);
  }
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

function printableReport(report: VerificationReport): HTMLElement {
  const printable = el(
    "section",
    { className: "print-report", attrs: { id: "uce-print-report" } },
    el("h1", { text: "UCE Evidence Lens · dated inspection report" }),
    el("h2", { text: report.publicMetadata.title }),
    el("p", { text: report.datedSnapshotDisclaimer }),
    definitionList([
      ["Report format", `${report.reportSchema} · ${report.reportVersion}`],
      ["Lens version", report.verifierVersion],
      ["Public-record checks completed (UTC)", report.checkedAt],
      ["Report created (UTC)", report.createdAt],
      ["Record inspected", report.recordBinding.source],
      ["Recorded manifest hash", report.recordBinding.manifestHash],
    ]),
    el("h2", { text: report.summary }),
    el("h3", { text: "Verification limits" }),
    ...report.coverage.limitations.map((text) => el("p", { text })),
    ...report.checks.map(checkCard),
  );
  if (report.localComparison)
    printable.append(
      checkCard(report.localComparison),
      el("p", { text: report.localComparison.binding }),
    );
  else
    printable.append(
      el("p", { text: "No local file comparison was included." }),
    );
  if (report.localFile)
    printable.append(
      definitionList([
        [
          "Selected local filename (included by request)",
          report.localFile.name,
        ],
        ["Local SHA-256", report.localFile.sha256],
        ["Local size", `${report.localFile.bytes} bytes`],
        ["Local digest computed (UTC)", report.localFile.computedAt],
      ]),
    );
  if (report.recheckLink)
    printable.append(
      el(
        "p",
        { className: "source-line" },
        "Recheck: ",
        safeLink(report.recheckLink, report.recheckLink),
      ),
    );
  printable.append(el("p", { text: report.legalNotice }));
  printable.querySelectorAll("details").forEach((details) => {
    details.open = true;
  });
  return printable;
}

function reportActions(
  controller: AppController,
  state: Readonly<AppState>,
): HTMLElement {
  const includeLocal = el("input", {
    attrs: { type: "checkbox", id: "report-local-details" },
  });
  includeLocal.disabled = !state.localFile;
  const status = el("p", {
    className: "field-note",
    attrs: { role: "status" },
    text: "Reports preserve incomplete checks and publisher statements. Selected local filenames and digests are excluded unless you choose to include them.",
  });
  const actions = el("div", { className: "loader__actions" });
  for (const [action, label, id] of [
    ["json", "Download report JSON", "download-report-button"],
    ["print", "Print / Save report as PDF", "print-report-button"],
  ] as const) {
    const button = el("button", {
      className: "button button--quiet",
      text: label,
      attrs: { type: "button", id },
    });
    button.disabled =
      state.busy ||
      !state.verification ||
      state.verification.checks.some((check) => check.status === "checking");
    button.addEventListener("click", () => {
      try {
        const report = createVerificationReport(controller.getState(), {
          includeLocalFileDetails: includeLocal.checked,
        });
        if (action === "json") {
          const blobUrl = URL.createObjectURL(
            new Blob([serializeVerificationReport(report)], {
              type: "application/json",
            }),
          );
          const anchor = el("a", {
            attrs: {
              href: blobUrl,
              download: `uce-verification-${report.recordBinding.manifestHash.slice(0, 12)}.json`,
            },
          });
          anchor.click();
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1_000);
          status.textContent =
            "Report prepared locally. No file contents were uploaded.";
        } else {
          document.getElementById("uce-print-report")?.remove();
          const printable = printableReport(report);
          document.body.append(printable);
          window.addEventListener("afterprint", () => printable.remove(), {
            once: true,
          });
          window.print();
        }
      } catch (error) {
        status.textContent =
          error instanceof Error
            ? error.message
            : "The report could not be prepared.";
      }
    });
    actions.append(button);
  }
  return el(
    "section",
    {
      className: "panel report-actions",
      attrs: { "aria-labelledby": "report-heading" },
    },
    el("h2", {
      text: "Save a dated inspection",
      attrs: { id: "report-heading" },
    }),
    el(
      "label",
      {},
      includeLocal,
      " Include my selected local filename, size, digest and check time in this export",
    ),
    status,
    actions,
    el("p", {
      className: "field-note",
      text: "PDF export uses your browser's print dialog. If printing is unavailable in an embedded browser, open Lens in Chrome or download the JSON report.",
    }),
  );
}

function loader(
  controller: AppController,
  busy: boolean,
  fieldError: FieldAction,
): HTMLElement {
  const input = el("input", {
    attrs: {
      id: "record-source",
      name: "source",
      type: "text",
      placeholder: "Public CbyUCE URL, record hash, or Arweave URL",
      autocomplete: "off",
      spellcheck: "false",
      "aria-describedby":
        fieldError === "source"
          ? "record-source-help record-error"
          : "record-source-help",
      ...(fieldError === "source" ? { "aria-invalid": "true" } : {}),
    },
  });
  const submit = el("button", {
    className: "button button--primary",
    text: busy ? "Loading…" : "Load record",
    attrs: { id: "load-record-button" },
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
      attrs: { id: "record-source-help" },
      text: "Approved public sources only: cbyuce.com and arweave.net. If live retrieval is unavailable, reload the bundled demo, use an Arweave URL, or paste public JSON.",
    }),
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    beginAction(controller, "source");
    void controller.load(input.value).catch(() => undefined);
  });

  const demoButton = el("button", {
    className: "button button--quiet",
    text: "Reload bundled demo",
    attrs: { id: "reload-demo-button" },
  });
  demoButton.type = "button";
  demoButton.disabled = busy;
  demoButton.addEventListener("click", () => {
    beginAction(controller, null);
    void controller.load("demo").catch(() => undefined);
  });

  const textarea = el("textarea", {
    attrs: {
      id: "record-json",
      rows: "5",
      placeholder:
        "Paste a public manifest or { manifest, verification } JSON response",
      spellcheck: "false",
      "aria-describedby":
        fieldError === "json" ? "record-error" : "record-json-help",
      ...(fieldError === "json" ? { "aria-invalid": "true" } : {}),
    },
  });
  const pasteButton = el("button", {
    className: "button button--quiet",
    text: "Validate pasted JSON",
    attrs: { id: "validate-json-button" },
  });
  pasteButton.type = "button";
  pasteButton.disabled = busy;
  pasteButton.addEventListener("click", () => {
    beginAction(controller, "json");
    void controller.loadJson(textarea.value).catch(() => undefined);
  });
  const details = el(
    "details",
    { className: "paste-panel", attrs: { id: "paste-panel" } },
    el("summary", { text: "Paste public JSON instead" }),
    el("label", { text: "Public record JSON", attrs: { for: "record-json" } }),
    textarea,
    el("p", {
      className: "field-note",
      attrs: { id: "record-json-help" },
      text: "Paste public record JSON only.",
    }),
    pasteButton,
  );

  return el(
    "section",
    { className: "panel loader", attrs: { "aria-labelledby": "load-heading" } },
    el("h2", {
      text: "Open an evidence record",
      attrs: { id: "load-heading" },
    }),
    el(
      "div",
      { className: "manifest-compatibility" },
      el(
        "p",
        {},
        el("strong", { text: "Readable manifest versions: " }),
        `${new Intl.ListFormat("en", { type: "conjunction" }).format(Object.keys(MANIFEST_COMPATIBILITY))}.`,
      ),
      el("p", {
        className: "field-note",
        text: "Lens can read and display these formats. Verification coverage varies by format; each record shows which checks were completed.",
      }),
      el(
        "details",
        {
          className: "compatibility-details",
          attrs: { id: "compatibility-details" },
        },
        el("summary", { text: "Current verification coverage" }),
        el("p", {
          className: "field-note",
          text: "This build verifies the reviewed standard 1.0.0 ES256 profile and the Extended 1.1.0 critical-profile ES256 signature. Hybrid 2.0.0 and 2.1.0 signatures remain readable but are not independently verified.",
        }),
        el("p", {
          className: "field-note",
          text: "Independent manifest-hash recomputation is supported for the reviewed Extended 1.1.0 profile and, on an exact match, the narrow Standard 1.0.0 public projection. Older Standard non-matches remain unresolved because original preimage timestamps may be missing. Hybrid 2.x verification awaits real publisher-issued qualification records. A match covers only the profile's stated fields, not every displayed field or the truth of assertions.",
        }),
      ),
    ),
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
      text: `Record schema: ${record.schema} · v${record.schemaVersion}`,
    }),
    el("h2", { text: record.title, attrs: { id: "record-heading" } }),
    el("p", {
      className: "field-note record-version-note",
      text: "The schema version above describes this record, not the Lens application. Work titles are displayed as recorded; the Lens app version is shown in the footer.",
    }),
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

  // A pasted manifest has no independently retrieved public location to share.
  if (record.loadedFrom !== "pasted_json") {
    try {
      const recipient = createRecipientRecordLink(
        record.source,
        window.location.href,
      );
      const linkInput = el("input", {
        attrs: {
          id: "recipient-link",
          type: "url",
          readonly: "",
          "aria-label": "Recipient link to this public record",
        },
      });
      linkInput.value = recipient.url;
      const copyButton = el("button", {
        className: "button button--quiet",
        text: "Copy recipient link",
        attrs: { type: "button", id: "copy-recipient-button" },
      });
      const copyStatus = el("p", {
        className: "field-note",
        attrs: { role: "status" },
        text: "Shares only the public record reference; never your selected local file.",
      });
      copyButton.addEventListener("click", () => {
        void navigator.clipboard?.writeText(recipient.url).then(
          () => {
            copyStatus.textContent = "Recipient link copied.";
          },
          () => {
            copyStatus.textContent =
              "Copy was unavailable. Select and copy the link above.";
            linkInput.select();
          },
        );
        if (!navigator.clipboard) {
          copyStatus.textContent = "Select and copy the link above.";
          linkInput.select();
        }
      });
      summary.append(
        el(
          "div",
          { className: "recipient-link" },
          el("label", {
            text: "Share this public record in Lens",
            attrs: { for: "recipient-link" },
          }),
          linkInput,
          copyButton,
          copyStatus,
        ),
      );
    } catch {
      // Non-shareable sources remain inspectable; never invent a public URL.
    }
  }

  if (record.compatibilityNotes?.length) {
    summary.append(
      el(
        "div",
        { className: "compatibility-notes" },
        el("h3", { text: "Format support" }),
        ...record.compatibilityNotes.map((text) => el("p", { text })),
      ),
    );
  }
  for (const [label, data] of [
    ["Recorded connector provenance", record.connectorSource],
    ["Full recorded public details", record.recordDetails],
  ] as const) {
    if (data)
      summary.append(
        el(
          "details",
          { className: "technical-details" },
          el("summary", { text: label }),
          el("p", {
            text: "Publisher-recorded information. Reading this data does not independently authenticate it or determine its legal effect.",
          }),
          el("pre", {
            className: "public-details",
            text: JSON.stringify(data, null, 2),
          }),
        ),
      );
  }

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
        : verification?.checks.some((check) => check.status === "verified")
          ? "verified"
          : "incomplete";

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
          el("p", {
            className: "verification-coverage",
            text: verification.coverage.limitations[0],
          }),
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
    if (file) {
      const interaction = interactionFor(controller);
      interaction.resetPrivacy = true;
      beginAction(controller, null);
      void controller.selectLocalFile(file).catch(() => undefined);
    }
  });
  const filePanel = el(
    "section",
    {
      className: "panel local-file",
      attrs: { "aria-labelledby": "local-heading" },
    },
    el("p", { className: "eyebrow", text: "Private by design" }),
    el("h2", {
      text: "Compare a local file",
      attrs: { id: "local-heading", tabindex: "-1" },
    }),
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
  return el(
    "div",
    {},
    summary,
    checks,
    verification ? reportActions(controller, state) : null,
    filePanel,
    timeline,
    assertions,
  );
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
      { className: "webmcp-help", attrs: { id: "webmcp-help" } },
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

interface UiSnapshot {
  source: string;
  json: string;
  includeLocal: boolean;
  openDetails: Map<string, boolean>;
  focusId?: string;
  focusDetailsKey?: string;
  focusLinkKey?: string;
  selection?: [number, number, "forward" | "backward" | "none"];
}

function disclosureKey(details: HTMLDetailsElement): string {
  if (details.id) return `id:${details.id}`;
  const label = details.querySelector("summary")?.textContent ?? "";
  const article = details.closest("article");
  const context =
    article?.querySelector("h3")?.textContent ??
    details.closest("section")?.querySelector("h2")?.textContent ??
    "";
  return `summary:${context}:${label}`;
}

function linkKey(link: HTMLAnchorElement): string {
  const section = link.closest("section");
  const context =
    section?.getAttribute("aria-labelledby") ??
    link.closest("article")?.querySelector("h3")?.textContent ??
    "";
  return `${context}\u0000${link.getAttribute("href") ?? ""}\u0000${link.textContent ?? ""}`;
}

function snapshotUi(content: HTMLElement): UiSnapshot {
  const active = document.activeElement;
  const focused =
    active instanceof HTMLElement && content.contains(active) ? active : null;
  const summaryDetails =
    focused?.tagName === "SUMMARY" ? focused.parentElement : null;
  let selection: UiSnapshot["selection"];
  if (
    focused instanceof HTMLTextAreaElement ||
    (focused instanceof HTMLInputElement && focused.type === "text")
  ) {
    selection = [
      focused.selectionStart ?? 0,
      focused.selectionEnd ?? 0,
      focused.selectionDirection ?? "none",
    ];
  }
  return {
    source:
      content.querySelector<HTMLInputElement>("#record-source")?.value ?? "",
    json:
      content.querySelector<HTMLTextAreaElement>("#record-json")?.value ?? "",
    includeLocal:
      content.querySelector<HTMLInputElement>("#report-local-details")
        ?.checked ?? false,
    openDetails: new Map(
      Array.from(
        content.querySelectorAll<HTMLDetailsElement>("details"),
        (details) => [disclosureKey(details), details.open],
      ),
    ),
    focusId: focused?.id || undefined,
    focusDetailsKey:
      summaryDetails instanceof HTMLDetailsElement
        ? disclosureKey(summaryDetails)
        : undefined,
    focusLinkKey:
      focused instanceof HTMLAnchorElement ? linkKey(focused) : undefined,
    selection,
  };
}

function restoreUi(
  content: HTMLElement,
  snapshot: UiSnapshot,
  preserveRecordState: boolean,
  preservePrivacy: boolean,
): void {
  const source = content.querySelector<HTMLInputElement>("#record-source");
  const json = content.querySelector<HTMLTextAreaElement>("#record-json");
  if (source) source.value = snapshot.source;
  if (json) json.value = snapshot.json;
  if (preservePrivacy) {
    const includeLocal = content.querySelector<HTMLInputElement>(
      "#report-local-details",
    );
    if (includeLocal) includeLocal.checked = snapshot.includeLocal;
  }
  content.querySelectorAll<HTMLDetailsElement>("details").forEach((details) => {
    const key = disclosureKey(details);
    if (
      preserveRecordState ||
      key === "id:paste-panel" ||
      key === "id:compatibility-details" ||
      key === "id:webmcp-help"
    ) {
      details.open = snapshot.openDetails.get(key) ?? false;
    }
  });

  let target: HTMLElement | null = snapshot.focusId
    ? content.querySelector<HTMLElement>(`#${snapshot.focusId}`)
    : null;
  if (!target && snapshot.focusDetailsKey) {
    const details = Array.from(
      content.querySelectorAll<HTMLDetailsElement>("details"),
    ).find((item) => disclosureKey(item) === snapshot.focusDetailsKey);
    target = details?.querySelector("summary") ?? null;
  }
  if (!target && snapshot.focusLinkKey) {
    target =
      Array.from(content.querySelectorAll<HTMLAnchorElement>("a")).find(
        (link) => linkKey(link) === snapshot.focusLinkKey,
      ) ?? null;
  }
  if (target instanceof HTMLButtonElement && target.disabled) {
    target = target.id === "validate-json-button" ? json : source;
  } else if (target instanceof HTMLInputElement && target.disabled) {
    target = content.querySelector<HTMLElement>("#local-heading") ?? source;
  }
  if (target) {
    target.focus({ preventScroll: true });
    if (
      snapshot.selection &&
      (target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && target.type === "text"))
    ) {
      target.setSelectionRange(...snapshot.selection);
    }
  }
}

export function renderApp(
  root: HTMLElement,
  controller: AppController,
  state: Readonly<AppState>,
): void {
  const interaction = interactionFor(controller);
  if (state.error && interaction.pending) {
    interaction.fieldError = interaction.action;
    interaction.pending = false;
  } else if (!state.error && !state.busy) {
    interaction.action = null;
    interaction.pending = false;
    interaction.fieldError = null;
  } else if (state.busy && !interaction.pending) {
    interaction.fieldError = null;
  }
  let memory = renderMemory.get(root);
  if (!memory) {
    const content = el("div");
    const live = el("div", {
      className: "sr-only",
      attrs: { "aria-live": "polite", "aria-atomic": "true" },
    });
    root.replaceChildren(content, live);
    memory = { content, live };
    renderMemory.set(root, memory);
  }
  const snapshot = snapshotUi(memory.content);
  const nextRecordKey = recordKey(state);
  const nextLocalFileKey = localFileKey(state);
  const preserveRecordState = memory.recordKey === nextRecordKey;
  const preservePrivacy =
    preserveRecordState &&
    memory.localFileKey === nextLocalFileKey &&
    !interaction.resetPrivacy;
  interaction.resetPrivacy = false;
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
        {
          className: "error-banner",
          attrs: { role: "alert", id: "record-error" },
        },
        el("strong", { text: "Could not complete that request. " }),
        state.error,
      )
    : null;
  const main = el(
    "main",
    { attrs: { id: "main", tabindex: "-1" } },
    loader(controller, state.busy, interaction.fieldError),
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
            href: HISTORICAL_EVIDENCE_URL,
            "aria-label": `View historical UCE evidence for submitted release ${HISTORICAL_EVIDENCE_VERSION}; it does not cover UCE Evidence Lens release ${RELEASE_VERSION}`,
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
            text: `Historical v${HISTORICAL_EVIDENCE_VERSION} evidence — does not cover this release`,
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
  memory.content.replaceChildren(header, notice, main, footer);
  restoreUi(memory.content, snapshot, preserveRecordState, preservePrivacy);
  memory.recordKey = nextRecordKey;
  memory.localFileKey = nextLocalFileKey;
  const liveText = state.busy
    ? "Verification work in progress"
    : (state.error ?? currentVerification?.summary ?? "Ready");
  if (memory.live.textContent !== liveText) memory.live.textContent = liveText;
}
