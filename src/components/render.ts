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
import {
  DEMO_FILE_URL,
  DEMO_MANIFEST_URL,
  DEMO_VERIFICATION_URL,
} from "../records/demo";
import type { EvidenceCheck, EvidenceStatus } from "../types/record";
import { inspectChronology, LEGAL_NOTICE } from "../verification/evidence";
import {
  audienceExamples,
  educationContent,
  type AudienceKey,
} from "./education";
import { renderDeclarations } from "./declarations";

type Child = Node | string | null | undefined;

type FieldAction = "source" | "json" | null;
interface InteractionState {
  action: FieldAction;
  pending: boolean;
  fieldError: FieldAction;
  resetPrivacy: boolean;
  resultsRequested: boolean;
  focusResult: boolean;
  audience?: AudienceKey;
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
      resultsRequested: false,
      focusResult: false,
    };
    interactions.set(controller, interaction);
  }
  return interaction;
}

function beginAction(
  controller: AppController,
  action: FieldAction,
  inspect = false,
): void {
  const interaction = interactionFor(controller);
  interaction.action = action;
  interaction.pending = true;
  interaction.fieldError = null;
  if (inspect) {
    interaction.resultsRequested = true;
    interaction.focusResult = true;
  }
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
  verified: "Check passed",
  mismatch: "Mismatch",
  checking: "Checking",
  retryable: "Could not complete",
  reported: "Source reported",
  unsupported: "Not independently checked",
};

const technicalStatuses = new Set<EvidenceStatus>(["reported", "unsupported"]);

const checkQuestions: Record<string, string> = {
  schema: "Can Lens read this record?",
  identifier: "Does the reference agree with the record?",
  canonical_manifest_hash: "Do the covered record contents match?",
  platform_signature: "Does the platform signature check pass?",
  independent_anchor: "What chronology can Lens check?",
  file_anchor: "What supports the file's chronology?",
};
const completedCheckHelp: Record<string, string> = {
  schema:
    "Lens recognizes this record format. Readability is separate from checking the contents.",
  identifier:
    "The record reference matches the hash value written in the record. This alone does not validate the contents.",
  canonical_manifest_hash:
    "Lens reproduced the recorded fingerprint from the fields covered by this reviewed profile. Read the coverage and exclusions below.",
  platform_signature:
    "A reviewed platform key validates the signature over the recorded fingerprint. It does not prove the creator's identity or the truth of the claims.",
};

function checkCard(check: EvidenceCheck, approachable = false): HTMLElement {
  const status = el("span", {
    className: `status status--${check.status}`,
    text:
      check.status === "reported" &&
      check.chronologyProvenance?.relationship === "gateway_index"
        ? "Gateway reported"
        : statusLabels[check.status],
  });
  const card = el(
    "article",
    { className: "check-card" },
    el(
      "div",
      { className: "check-card__heading" },
      el("h3", {
        text: approachable
          ? (checkQuestions[check.id] ?? check.label)
          : check.label,
      }),
      status,
    ),
    approachable && checkQuestions[check.id]
      ? el("p", { className: "check-technical-label", text: check.label })
      : null,
    approachable && check.status === "verified" && completedCheckHelp[check.id]
      ? el(
          "div",
          {},
          el("p", { text: completedCheckHelp[check.id] }),
          el(
            "details",
            {
              className: "check-explanation",
              attrs: { id: `check-explanation-${check.id}` },
            },
            el("summary", { text: "Full check result and coverage" }),
            el("p", { text: check.explanation }),
          ),
        )
      : el("p", { text: check.explanation }),
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
  if (check.chronologyProvenance) {
    const provenance = check.chronologyProvenance;
    card.append(
      el(
        "details",
        { className: "chronology-provenance" },
        el("summary", { text: "Chronology source and relationship" }),
        definitionList([
          [
            "Reference type",
            provenance.referenceType === "bundled_item"
              ? "Bundled data item"
              : "Layer 1 transaction",
          ],
          ["Referenced transaction ID", provenance.transactionId],
          ["Root transaction ID", provenance.rootTransactionId],
          [
            "Parent path",
            provenance.parentPath.length
              ? provenance.parentPath.join(" → ")
              : "Direct root transaction",
          ],
          ["Root block height", String(provenance.block.height)],
          ["Root block hash", provenance.block.hash],
          ["Root block time (UTC)", provenance.block.timestamp],
          [
            "Relationship evidence",
            provenance.relationship === "direct_block_membership"
              ? "Direct transaction membership in the reported block"
              : "Public gateway index metadata",
          ],
        ]),
        provenance.indexSource
          ? el(
              "p",
              { className: "source-line" },
              "Gateway index source: ",
              safeLink(provenance.indexSource, provenance.indexSource),
            )
          : null,
      ),
    );
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
    ...report.checks.map((check) => checkCard(check)),
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
      attrs: { id: "report-heading", tabindex: "-1" },
    }),
    el("p", {
      text: "Save an unsigned, dated snapshot of this inspection. It is not a new UCE Certificate or a permanent evidence record. The report includes checks and their coverage, not a full archive of the work's declarations.",
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
      placeholder: "https://cbyuce.com/verify/...",
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
    text: busy ? "Opening record..." : "Inspect record",
    attrs: { id: "load-record-button", type: "submit" },
  });
  submit.disabled = busy;
  const demoButton = el("button", {
    className: "button button--quiet",
    text: "Try an example",
    attrs: { id: "reload-demo-button", type: "button" },
  });
  demoButton.disabled = busy;
  demoButton.addEventListener("click", () => {
    beginAction(controller, null, true);
    void controller.load("demo").catch(() => undefined);
  });
  const form = el(
    "form",
    {
      className: "load-form",
      attrs: { "aria-label": "Inspect a public UCE record" },
    },
    el("label", {
      text: "Public UCE record link",
      attrs: { for: "record-source" },
    }),
    input,
    el("div", { className: "loader__actions" }, submit, demoButton),
    el("p", {
      className: "field-note",
      attrs: { id: "record-source-help" },
      text: "Use a cbyuce.com record link, its 64-character record hash, or a full https://arweave.net/ transaction URL. UCE means Universal Creation Evidence.",
    }),
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    beginAction(controller, "source", true);
    void controller.load(input.value).catch(() => undefined);
  });
  const textarea = el("textarea", {
    attrs: {
      id: "record-json",
      rows: "5",
      placeholder:
        "Paste a public manifest or { manifest, verification } JSON response",
      spellcheck: "false",
      "aria-describedby":
        fieldError === "json"
          ? "record-json-help record-error"
          : "record-json-help",
      ...(fieldError === "json" ? { "aria-invalid": "true" } : {}),
    },
  });
  const pasteButton = el("button", {
    className: "button button--quiet",
    text: "Inspect pasted JSON",
    attrs: { id: "validate-json-button", type: "button" },
  });
  pasteButton.disabled = busy;
  pasteButton.addEventListener("click", () => {
    beginAction(controller, "json", true);
    void controller.loadJson(textarea.value).catch(() => undefined);
  });
  return el(
    "section",
    {
      className: "panel loader",
      attrs: { "aria-labelledby": "load-heading" },
    },
    el("h2", { text: "Inspect a UCE record", attrs: { id: "load-heading" } }),
    form,
    el(
      "details",
      { attrs: { id: "source-help" } },
      el("summary", { text: "Where do I find a record link?" }),
      el("p", {
        text: "Ask the person who shared the work for its UCE link, or copy it from their public CbyUCE record. You do not need the original file to inspect a record.",
      }),
      el("p", { text: "Example accepted link:" }),
      el("code", { text: DEMO_VERIFICATION_URL }),
      el("p", {
        className: "field-note",
        text: "This example uses the bundled record. If live retrieval is unavailable, try the bundled example, use an Arweave URL, or paste public JSON. A bare Arweave identifier or a Lens sharing link is not an input here. Open a Lens sharing link directly.",
      }),
    ),
    el(
      "details",
      { className: "paste-panel", attrs: { id: "paste-panel" } },
      el("summary", { text: "Paste public JSON instead" }),
      el("label", {
        text: "Public record JSON",
        attrs: { for: "record-json" },
      }),
      textarea,
      el("p", {
        className: "field-note",
        attrs: { id: "record-json-help" },
        text: "Use public record JSON only. Pasted data has no independently retrieved public location to share.",
      }),
      pasteButton,
    ),
    el(
      "details",
      { className: "input-technical", attrs: { id: "input-technical" } },
      el("summary", { text: "Supported formats and network requests" }),
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

      el("p", {
        className: "field-note",
        text: "Record inputs are limited to cbyuce.com and arweave.net. For a bundled Arweave item, Lens may query turbo-gateway.com for public parent metadata. Public records and metadata are retrieved over the network; selected local file contents are not uploaded.",
      }),
    ),
    el(
      "p",
      { className: "create-record-note" },
      "Need a record first? ",
      el("a", {
        text: "Create a UCE with CbyUCE",
        attrs: { href: "https://cbyuce.com/" },
      }),
      " (separate service). Lens inspects existing records.",
    ),
  );
}

function recordView(
  controller: AppController,
  state: Readonly<AppState>,
  active: boolean,
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
    el(active ? "h1" : "h2", {
      text: record.title,
      attrs: { id: "record-heading", tabindex: "-1" },
    }),
    record.loadedFrom === "bundled_demo"
      ? el("p", {
          className: "demo-record-note",
          text: "Bundled example. This record data came from the copy included with Lens. Public chronology checks may still use the network.",
        })
      : null,
    el("p", {
      className: "field-note record-version-note",
      text: "The schema version above describes this record, not the Lens application. Work titles are displayed as recorded; the Lens app version is shown in the footer.",
    }),
    el("p", {
      className: "assertion-callout",
      text: `Who makes the claim? ${record.authorName}`,
    }),
    el(
      "details",
      {
        className: "record-source-details",
        attrs: { id: "record-source-details" },
      },
      el("summary", { text: "Record details and public source" }),
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
    ),
    el("p", {
      className: "record-meaning",
      text: "The name above is a recorded author assertion. Inspect the supporting checks below. A matching fingerprint or valid signature does not establish authorship, ownership, or permission.",
    }),
    el(
      "nav",
      {
        className: "result-actions",
        attrs: { "aria-label": "Inspection actions" },
      },
      el("a", {
        className: "button button--primary",
        text: "Compare my file",
        attrs: { href: "#local-heading" },
      }),
      record.loadedFrom !== "pasted_json"
        ? el("a", {
            className: "button button--quiet",
            text: "Share record link",
            attrs: { href: "#share-record" },
          })
        : null,
      verification
        ? el("a", {
            className: "button button--quiet",
            text: "Save inspection",
            attrs: { href: "#report-heading" },
          })
        : null,
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
        text: "Copy record link",
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
          { className: "recipient-link", attrs: { id: "share-record" } },
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
        el("h2", { className: "format-heading", text: "Format support" }),
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
    (check) =>
      !technicalStatuses.has(check.status) || check.chronologyProvenance,
  );
  const technicalChecks = (verification?.checks ?? []).filter(
    (check) =>
      technicalStatuses.has(check.status) && !check.chronologyProvenance,
  );
  const summaryStatus = verification?.checks.some(
    (check) => check.status === "mismatch",
  )
    ? "mismatch"
    : verification?.checks.some((check) => check.status === "checking")
      ? "checking"
      : verification?.checks.some((check) => check.status === "retryable")
        ? "retryable"
        : verification?.checks.some(
              (check) =>
                check.status === "reported" &&
                check.chronologyProvenance?.relationship === "gateway_index",
            )
          ? "incomplete"
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
        el("p", {
          className: "eyebrow",
          text: "Browser checks and clearly labeled source reports",
        }),
        el("h2", {
          text: "Which checks completed?",
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
    el("p", {
      className: "field-note",
      text: "Each result applies only to its stated check. A network problem leaves a check incomplete; it does not show that a claim is false.",
    }),
    el(
      "div",
      { className: "check-grid" },
      ...primaryChecks.map((check) => checkCard(check, true)),
    ),
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
            ...technicalChecks.map((check) => checkCard(check, true)),
          ),
        )
      : null,
  );

  if (verification?.checks.some((check) => check.status === "retryable")) {
    const retry = el("button", {
      className: "button button--quiet",
      text: "Retry available checks",
      attrs: { id: "retry-checks", type: "button" },
    });
    retry.disabled =
      state.busy ||
      verification.checks.some((check) => check.status === "checking");
    retry.addEventListener("click", () => {
      void controller.runVerification().catch(() => undefined);
    });
    checks.append(retry);
  }

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
    el("p", {
      className: "eyebrow",
      text: "File contents stay in your browser",
    }),
    el("h2", {
      text: "Does my file match the record?",
      attrs: { id: "local-heading", tabindex: "-1" },
    }),
    el("p", {
      text: "Choose a file to compare its digital fingerprint (SHA-256) with the first file listed in this record. The comparison runs in your browser. File contents are not uploaded, stored, or exposed to agent tools.",
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
      text: "Choose a file to compare",
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
    state.localComparison
      ? checkCard(state.localComparison)
      : el("p", { text: "No local file has been compared." }),
  );

  const chronology = inspectChronology(record);
  const timeline = el(
    "section",
    {
      className: "section-block",
      attrs: { "aria-labelledby": "chronology-heading" },
    },
    el("p", { className: "eyebrow", text: "Dates and their sources" }),
    el("h2", {
      text: "What dates are available?",
      attrs: { id: "chronology-heading" },
    }),
    el("p", {
      text: "A claimed creation date, a registration timestamp, and checked ledger chronology describe different events. Gateway reports do not establish the exact creation or upload time, or prove file inclusion.",
    }),
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

  return el(
    "div",
    { className: "inspection-results" },
    summary,
    checks,
    renderDeclarations(record, verification),
    filePanel,
    timeline,
    verification ? reportActions(controller, state) : null,
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
      details.open = snapshot.openDetails.get(key) ?? details.open;
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

function aiIntegrations(): HTMLElement {
  return el(
    "section",
    {
      className: "ai-integrations",
      attrs: {
        id: "ai-integrations",
        "aria-labelledby": "ai-integrations-heading",
      },
    },
    el(
      "div",
      {},
      el("p", { className: "eyebrow", text: "AI integrations" }),
      el("h2", {
        text: "Use UCE Evidence Lens with your AI assistant",
        attrs: { id: "ai-integrations-heading" },
      }),
      el("p", {
        className: "ai-integrations__description",
        text: "Inspect public UCE records, understand the checks and their limits, and request an unsigned inspection report. Choose an integration for setup and availability.",
      }),
    ),
    el(
      "nav",
      {
        className: "ai-integrations__links",
        attrs: { "aria-label": "AI integration setup and availability" },
      },
      ...(
        [
          ["ChatGPT", "Setup and availability", "/gpt/"],
          ["Claude", "Setup and availability", "/claude/"],
          ["Gemini", "Preview setup", "/gemini/"],
        ] as const
      ).map(([name, availability, href]) =>
        el(
          "a",
          { className: "ai-integration", attrs: { href } },
          el("strong", { text: name }),
          el("span", {
            className: "ai-integration__availability",
            text: availability,
          }),
        ),
      ),
    ),
  );
}

// Recipient URLs use the fragment for record selection. Keep that reference
// while ordinary section links move keyboard focus within the inspection.
function preserveRecordNavigation(content: HTMLElement): void {
  const links = Array.from(
    content.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'),
  );
  const skip = document.querySelector<HTMLAnchorElement>(".skip-link");
  if (skip) links.push(skip);
  for (const link of links) {
    const targetId =
      link.dataset.sectionTarget ?? link.getAttribute("href")!.slice(1);
    link.dataset.sectionTarget = targetId;
    link.href = window.location.hash.startsWith("#record=")
      ? window.location.href
      : `#${targetId}`;
    link.onclick = (event) => {
      if (
        !window.location.hash.startsWith("#record=") ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = document.getElementById(targetId);
      if (!target) return;
      event.preventDefault();
      if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
      target.focus({ preventScroll: true });
      target.scrollIntoView?.({ block: "start" });
    };
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
    root.replaceChildren(live, content);
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
  // Presentation state only. Startup, record selection and verification remain
  // owned by the controller and its existing deep-link/agent entry points.
  if (memory.recordKey && !nextRecordKey && state.busy) {
    interaction.resultsRequested = true;
  }
  const active =
    interaction.resultsRequested ||
    window.location.hash.startsWith("#record=") ||
    (!!state.record && state.record.loadedFrom !== "bundled_demo");
  const header = el(
    "header",
    { className: "site-header" },
    el(
      "a",
      {
        className: "site-brand",
        attrs: { href: "/", "aria-label": "UCE Evidence Lens home" },
      },
      el("img", {
        className: "brand-mark",
        attrs: {
          src: "/uce-mark.svg",
          alt: "UCE Mark",
          width: "48",
          height: "48",
        },
      }),
      el(
        "div",
        {},
        el("span", { className: "brand-name", text: "UCE Evidence Lens" }),
        el("span", { className: "eyebrow", text: "Copyright by UCE" }),
      ),
    ),
    el(
      "nav",
      { className: "site-nav", attrs: { "aria-label": "Main navigation" } },
      el("a", { text: "How Lens helps", attrs: { href: "#how-lens-helps" } }),
      el("a", { text: "AI integrations", attrs: { href: "#ai-integrations" } }),
      el("a", {
        text: "Create a UCE",
        attrs: {
          href: "https://cbyuce.com/",
          "aria-label": "Create a UCE with CbyUCE, a separate service",
        },
      }),
    ),
  );
  const error = state.error
    ? el(
        "div",
        {
          className: "error-banner",
          attrs: { role: "alert", id: "record-error", tabindex: "-1" },
        },
        el("strong", { text: "Could not complete that request. " }),
        state.error,
        el("p", {
          text: state.record
            ? "The file comparison could not complete. Review the error and choose a readable file within the size limit."
            : "Check the input and try again, or try the bundled example. A loading failure does not establish that a claim is false.",
        }),
      )
    : null;
  const inputPanel = loader(controller, state.busy, interaction.fieldError);
  if (error && !state.record)
    inputPanel.insertBefore(error, inputPanel.querySelector("form"));
  const inspector = el(
    "details",
    { className: "inspect-another", attrs: { id: "inspect-another" } },
    el("summary", {
      text: "Inspect another record",
      attrs: { id: "inspect-another-control" },
    }),
    inputPanel,
  );
  inspector.open = !state.record;
  const hero = el(
    "section",
    { className: "welcome", attrs: { "aria-labelledby": "welcome-heading" } },
    el(
      "div",
      { className: "welcome-copy" },
      el("p", {
        className: "eyebrow",
        text: "For creators and the people they share with",
      }),
      el("h1", {
        text: "Understand the record behind the work.",
        attrs: { id: "welcome-heading" },
      }),
      el("p", {
        className: "lede",
        text: "See what was declared about a creative work, which checks Lens can complete, and what still needs a closer look.",
      }),
      el("p", {
        className: "welcome-note",
        text: "Have a UCE link? Open it here. No Lens account needed.",
      }),
    ),
    !active ? inputPanel : null,
  );
  const focusInput = () => {
    const field = root.querySelector<HTMLInputElement>("#record-source");
    field?.focus();
    field?.scrollIntoView?.({ block: "center" });
  };
  const audience = audienceExamples(focusInput, {
    selected: interaction.audience,
    onSelect: (key) => {
      interaction.audience = key;
    },
  });
  const example = el(
    "section",
    {
      className: "example-teaser",
      attrs: { "aria-labelledby": "example-heading" },
    },
    el(
      "div",
      {},
      el("p", { className: "eyebrow", text: "Start with a real example" }),
      el("h2", {
        text: "See what an inspection can tell you.",
        attrs: { id: "example-heading" },
      }),
      el("p", {
        text: "Explore the bundled UCE record for the original Lens artwork. See separate checks, recorded declarations, and what remains unconfirmed.",
      }),
    ),
  );
  const explore = el("button", {
    className: "button button--quiet",
    text: "Explore the example",
    attrs: { id: "explore-example", type: "button" },
  });
  explore.disabled = state.busy;
  explore.addEventListener("click", () => {
    beginAction(controller, null, true);
    void controller.load("demo").catch(() => undefined);
  });
  example.append(explore);
  const results = recordView(controller, state, active);
  if (results) results.hidden = !active;
  if (error && state.record)
    results?.querySelector(".local-file")?.prepend(error);
  const main = el(
    "main",
    { attrs: { id: "main", tabindex: "-1" } },
    active ? inspector : hero,
    active && !state.record
      ? el("h1", {
          className: "loading-heading",
          text: state.error
            ? "Open a record to continue"
            : "Opening the public record...",
        })
      : null,
    !active ? audience : null,
    !active ? example : null,
    results,
    educationContent(),
    aiIntegrations(),
    webMcpStatus(state),
    el(
      "aside",
      { className: "legal-notice" },
      el("strong", { text: "Evidence and its limits. " }),
      LEGAL_NOTICE,
    ),
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
            text: `Historical v${HISTORICAL_EVIDENCE_VERSION} evidence - does not cover this release`,
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
      el("a", {
        text: "Lens for ChatGPT - preview, privacy, and support",
        attrs: { href: "/gpt/" },
      }),
      el("a", {
        text: "Lens for Claude - plugin, privacy, and support",
        attrs: { href: "/claude/" },
      }),
      el("a", {
        text: "Lens for Gemini - preview, privacy, and support",
        attrs: { href: "/gemini/" },
      }),
    ),
  );
  memory.content.replaceChildren(header, main, footer);
  preserveRecordNavigation(memory.content);
  restoreUi(memory.content, snapshot, preserveRecordState, preservePrivacy);
  if (state.error && interaction.focusResult) {
    inspector.open = true;
    const fieldId =
      interaction.fieldError === "json"
        ? "record-json"
        : interaction.fieldError === "source"
          ? "record-source"
          : "record-error";
    if (fieldId === "record-json")
      memory.content.querySelector<HTMLDetailsElement>("#paste-panel")!.open =
        true;
    memory.content.querySelector<HTMLElement>(`#${fieldId}`)?.focus();
    interaction.focusResult = false;
  } else if (interaction.focusResult && state.record && !state.busy) {
    inspector.open = false;
    memory.content.querySelector<HTMLElement>("#record-heading")?.focus();
    interaction.focusResult = false;
  }
  memory.recordKey = nextRecordKey;
  memory.localFileKey = nextLocalFileKey;
  const liveText =
    !active && !state.error
      ? state.busy
        ? "Preparing the bundled example."
        : "Ready to inspect a public UCE record. An example is available."
      : state.busy
        ? "Verification work in progress"
        : (state.error ?? currentVerification?.summary ?? "Ready");
  if (memory.live.textContent !== liveText) memory.live.textContent = liveText;
}
