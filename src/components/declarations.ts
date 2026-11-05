import type { UceRecord, VerificationSnapshot } from "../types/record";
import { isPlainObject } from "../security/untrusted";
import { listAssertions } from "../verification/evidence";
import { EXTENDED_HASH_PROFILE } from "../verification/manifest-hash";

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function object(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

function source(path: string): HTMLElement {
  return element("p", `Source: ${path}`, "declaration-source");
}

/** The parser retains bounded JSON. Render its values as inert text, never HTML. */
function exactValues(value: unknown, path: string): HTMLDListElement {
  const list = element("dl", undefined, "recorded-values");
  const add = (entry: unknown, entryPath: string): void => {
    if (Array.isArray(entry) && entry.length) {
      entry.forEach((item, index) => add(item, `${entryPath}[${index}]`));
      return;
    }
    if (isPlainObject(entry) && Object.keys(entry).length) {
      Object.entries(entry).forEach(([key, item]) => {
        const suffix = /^[A-Za-z_$][\w$]*$/.test(key)
          ? `.${key}`
          : `[${JSON.stringify(key)}]`;
        add(item, `${entryPath}${suffix}`);
      });
      return;
    }
    list.append(
      element("dt", `Source: ${entryPath}`),
      element(
        "dd",
        typeof entry === "string"
          ? entry
          : (JSON.stringify(entry) ?? "Not provided"),
      ),
    );
  };
  add(value, path);
  return list;
}

function disclosure(
  id: string,
  label: string,
  ...children: Node[]
): HTMLDetailsElement {
  const details = element("details");
  details.id = id;
  details.append(element("summary", label), ...children);
  return details;
}

function presentValues(
  values: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  );
}

function policyStatus(
  value: unknown,
  separateTermsNeedReview = false,
): [string, string] {
  const policy = object(value);
  if (
    !separateTermsNeedReview &&
    (value === undefined ||
      (isPlainObject(value) && !Object.keys(value).length))
  ) {
    return [
      "No AI-training policy provided",
      "Missing information does not mean permission. Ask the claimant about the intended use.",
    ];
  }
  const flags = [policy.aiOptOut, policy.doNotTrain];
  const hasTrue = flags.includes(true);
  const hasFalse = flags.includes(false);
  // Recognize only reviewed literal fields and values. Do not interpret a
  // free-text notice, infer permission, or choose between conflicting terms.
  const familiarFields = new Set([
    "aiOptOut",
    "doNotTrain",
    "policyVersion",
    "effectiveAt",
    "license",
    "rights",
    "robotsMeta",
  ]);
  const needsReview =
    separateTermsNeedReview ||
    !isPlainObject(value) ||
    (hasTrue && hasFalse) ||
    flags.some((flag) => flag !== undefined && typeof flag !== "boolean") ||
    Object.keys(policy).some((key) => !familiarFields.has(key)) ||
    [policy.policyVersion, policy.effectiveAt].some(
      (field) => field !== undefined && typeof field !== "string",
    ) ||
    (policy.license !== undefined &&
      policy.license !== "All Rights Reserved") ||
    (policy.rights !== undefined && policy.rights !== "TDM-RESERVED") ||
    (policy.robotsMeta !== undefined &&
      policy.robotsMeta !== "noai, noimageai") ||
    (hasFalse &&
      (policy.rights !== undefined || policy.robotsMeta !== undefined));
  if (needsReview) {
    return [
      "Recorded policy requires review",
      "Lens cannot resolve this declaration's meaning or legal effect. Read the exact text and values.",
    ];
  }
  return hasTrue
    ? [
        "AI-training restriction recorded",
        "Read the exact declaration below. Lens does not decide its legal effect.",
      ]
    : [
        "Different policy recorded - read its terms",
        "These values alone do not establish permission. Review the exact notice and ask the claimant about your intended use.",
      ];
}

function aiStatus(
  values: unknown[],
  hasProcess: boolean,
  recordedKeys: string[],
): [string, string] {
  const provided = values.filter((value) => value !== undefined);
  if (!provided.length) {
    if (hasProcess)
      return [
        "AI declaration requires review",
        "A creative-process description is recorded without an explicit AI-assistance value. Read the creator's exact description below.",
      ];
    if (recordedKeys.length)
      return [
        "AI declaration requires review",
        "AI-related information is recorded without a supported explicit AI-assistance value. Read the exact recorded values.",
      ];
    return [
      "No AI-assistance declaration provided",
      "This record provides no statement about AI assistance. It does not establish whether AI was used.",
    ];
  }
  if (
    provided.some((value) => typeof value !== "boolean") ||
    (provided.includes(true) && provided.includes(false)) ||
    recordedKeys.some(
      (key) =>
        ![
          "isAIAssisted",
          "aiCreativeProcess",
          "disclosedAt",
          "humanCreatedPercentage",
        ].includes(key),
    )
  ) {
    return [
      "AI declaration requires review",
      "Read the exact recorded values. Lens cannot resolve conflicting or unsupported declarations here.",
    ];
  }
  return provided[0]
    ? [
        "AI assistance declared",
        "This is the creator's declaration. Lens does not detect AI use in the work.",
      ]
    : [
        "Creator declares no AI assistance",
        "This is an explicit recorded declaration, not an independent finding about how the work was made.",
      ];
}

function statusCard(title: string, state: [string, string]): HTMLElement {
  const card = element("article", undefined, "declaration-card");
  const status = element("p", undefined, "declaration-status");
  status.append(element("strong", state[0]));
  card.append(element("h3", title), status, element("p", state[1]));
  return card;
}

export function renderDeclarations(
  record: UceRecord,
  verification: VerificationSnapshot | undefined,
): HTMLElement {
  const section = element(
    "section",
    undefined,
    "section-block declaration-section",
  );
  section.setAttribute("aria-labelledby", "assertions-heading");
  const heading = element("h2", "What was declared?");
  heading.id = "assertions-heading";
  section.append(
    heading,
    element("p", "Statements in the record, with their sources."),
  );

  const bound =
    verification?.recordBinding.source === record.source &&
    verification.recordBinding.manifestHash === record.manifestHash
      ? verification
      : undefined;
  const hashCheck = bound?.checks.find(
    (check) => check.id === "canonical_manifest_hash",
  );
  const successfulHash =
    bound?.coverage.manifestContents === "recomputed" &&
    hashCheck?.status === "verified" &&
    hashCheck.hashProvenance?.computedHash === record.manifestHash;
  const extendedCovered =
    successfulHash &&
    record.schemaVersion === "1.1.0" &&
    hashCheck.hashProvenance?.profile === EXTENDED_HASH_PROFILE;
  const standardCovered =
    successfulHash &&
    record.schemaVersion === "1.0.0" &&
    hashCheck.hashProvenance?.profile ===
      "cbyuce-standard-1.0-public-projection-81abec26";
  const coverage = element("div", undefined, "declaration-coverage");
  if (record.schemaVersion === "1.0.0" || record.schemaVersion === "2.0.0") {
    coverage.append(
      element(
        "p",
        "The rights policy and AI disclosures shown here are outside the reviewed Standard hash coverage. A signature pass does not validate these fields.",
      ),
    );
  }
  if (
    bound?.coverage.manifestContents === "mismatch" ||
    hashCheck?.status === "mismatch"
  ) {
    coverage.append(
      element(
        "p",
        "The manifest hash did not match. Do not rely on these declarations as integrity-checked contents; review the mismatch in the checks.",
      ),
    );
  } else if (extendedCovered) {
    coverage.append(
      element(
        "p",
        "These fields are included in the reviewed Extended hash projection. A matching hash checks integrity within that coverage; it does not prove the declarations are true or legally effective.",
      ),
    );
  } else if (!standardCovered) {
    coverage.append(
      element(
        "p",
        "These declarations are not independently verified. The required content check is incomplete, unavailable, or unsupported; review its current result in the checks.",
      ),
    );
  }
  if (bound) {
    const limits = element("ul");
    bound.coverage.limitations.forEach((limit) =>
      limits.append(element("li", limit)),
    );
    coverage.append(
      disclosure(
        "declaration-coverage-details",
        "Read the actual coverage and limits",
        limits,
      ),
    );
  }
  section.append(coverage);

  const raw = record.publicManifest;
  const policyValue = raw
    ? raw.policy
    : presentValues({
        license: record.policyLicense,
        rights: record.policyRights,
        aiOptOut: record.aiOptOut,
        doNotTrain: record.doNotTrain,
      });
  const aiValue = raw
    ? raw.aiProvenance
    : presentValues({
        isAIAssisted: record.isAiAssisted,
        humanCreatedPercentage: record.humanCreatedPercentage,
      });
  const detailsValue = raw ? raw.recordDetails : record.recordDetails;
  const ai = object(aiValue);
  const copyright = object(object(detailsValue).copyright);
  const grid = element("div", undefined, "declaration-grid");
  const policyCard = statusCard(
    "Use of the work for AI training",
    policyStatus(
      policyValue,
      (object(detailsValue).license !== undefined &&
        object(detailsValue).license !== object(policyValue).license) ||
        (copyright.rightsDeclaration !== undefined &&
          copyright.rightsDeclaration !== "all_rights_reserved"),
    ),
  );
  if (policyValue !== undefined) {
    policyCard.append(
      disclosure(
        "declaration-policy-values",
        "Exact recorded policy values and notices",
        exactValues(policyValue, "manifest.policy"),
      ),
    );
  }
  const aiCard = statusCard(
    "The creator's use of AI",
    aiStatus(
      [
        ai.isAIAssisted,
        copyright.isAIAssisted,
        aiValue !== undefined && !isPlainObject(aiValue) ? aiValue : undefined,
      ],
      ai.aiCreativeProcess !== undefined ||
        copyright.aiCreativeProcess !== undefined,
      Object.keys(ai),
    ),
  );
  const processes = [
    {
      value: ai.aiCreativeProcess,
      path: "manifest.aiProvenance.aiCreativeProcess",
    },
    {
      value: copyright.aiCreativeProcess,
      path: "manifest.recordDetails.copyright.aiCreativeProcess",
    },
  ].filter(
    (entry) => typeof entry.value === "string" && entry.value.length > 0,
  );
  if (processes.length) {
    aiCard.append(
      element(
        "p",
        "Recorded description of the creative process",
        "declaration-label",
      ),
    );
    const displayed = new Set<string>();
    for (const process of processes) {
      const text = process.value as string;
      if (!displayed.has(text))
        aiCard.append(element("blockquote", text, "recorded-text"));
      displayed.add(text);
      aiCard.append(source(process.path));
    }
  } else {
    aiCard.append(
      element(
        "p",
        "No separate creative-process description is provided in these AI fields.",
      ),
    );
  }
  if (aiValue !== undefined) {
    aiCard.append(
      disclosure(
        "declaration-ai-values",
        "Exact recorded AI declaration values",
        exactValues(aiValue, "manifest.aiProvenance"),
      ),
    );
  }
  grid.append(policyCard, aiCard);
  section.append(grid);

  const statement = element(
    "article",
    undefined,
    "declaration-card declaration-statement",
  );
  statement.append(element("h3", "The creator's statement"));
  const claimant = object(object(raw?.attestations).claimantAdoption);
  if (typeof claimant.text === "string" && claimant.text.length) {
    statement.append(
      element("blockquote", claimant.text, "recorded-text"),
      source("manifest.attestations.claimantAdoption.text"),
      element(
        "p",
        claimant.accepted === true
          ? "Claimant adoption: recorded as accepted."
          : claimant.accepted === false
            ? "Claimant adoption: recorded as not accepted."
            : "Claimant adoption: acceptance not provided or unsupported.",
      ),
      disclosure(
        "declaration-claimant-values",
        "Exact recorded claimant attestation",
        exactValues(claimant, "manifest.attestations.claimantAdoption"),
      ),
    );
    if (standardCovered)
      statement.append(
        element(
          "p",
          "The completed Standard hash check includes recorded attestations. It does not prove that the statements are true.",
        ),
      );
  } else {
    statement.append(
      element("p", "No separate creator statement is provided in this record."),
    );
    if (Object.keys(claimant).length)
      statement.append(
        disclosure(
          "declaration-claimant-values",
          "Exact recorded claimant attestation",
          exactValues(claimant, "manifest.attestations.claimantAdoption"),
        ),
      );
  }
  statement.append(
    element(
      "p",
      "A statement can be useful evidence without establishing that it is true. Read it alongside the available supporting checks.",
    ),
  );
  section.append(statement);
  if (detailsValue !== undefined) {
    section.append(
      disclosure(
        "declaration-extended-values",
        "Read all recorded extended details",
        exactValues(detailsValue, "manifest.recordDetails"),
      ),
    );
  }
  const assertions = element("div", undefined, "assertion-grid");
  for (const assertion of listAssertions(record).filter(
    (item) => item.category !== "ai_policy",
  )) {
    const card = element("article", undefined, "assertion-card");
    card.append(
      element("h3", assertion.label),
      element("p", assertion.value, "assertion-card__value"),
      element("p", assertion.limitation),
      source(assertion.source),
    );
    assertions.append(card);
  }
  section.append(
    disclosure(
      "declaration-other-assertions",
      "Other recorded claims and their sources",
      assertions,
    ),
  );
  if (!raw)
    section.append(
      element(
        "p",
        "The complete public manifest is unavailable here. The displayed values come from the available record summary.",
      ),
    );
  return section;
}
