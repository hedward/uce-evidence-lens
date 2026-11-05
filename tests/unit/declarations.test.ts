// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderDeclarations } from "../../src/components/declarations";
import { parseUceRecord } from "../../src/records/parser";
import { demoRecord } from "../../src/records/demo";
import { listAssertions, verifyRecord } from "../../src/verification/evidence";
import type { UceRecord, VerificationSnapshot } from "../../src/types/record";
import { validPublicResponse } from "../fixtures/public-record";
import extended from "../fixtures/extended-production.json";

function standard(changes: Record<string, unknown> = {}): UceRecord {
  const manifest = Object.fromEntries(
    Object.entries({
      ...structuredClone(validPublicResponse.manifest),
      ...changes,
    }).filter(([, value]) => value !== undefined),
  );
  return parseUceRecord(manifest, {
    source: "https://cbyuce.com/verify/test",
    loadedFrom: "pasted_json",
  });
}

function extendedRecord(): UceRecord {
  return parseUceRecord(structuredClone(extended), {
    source: `https://cbyuce.com/verify/${extended.hashes.manifestHash}`,
    loadedFrom: "cbyuce",
  });
}

function card(root: HTMLElement, index: number): Element {
  return root.querySelectorAll(".declaration-grid > .declaration-card")[index]!;
}

describe("recorded declarations presentation", () => {
  it.each([
    [true, "AI assistance declared"],
    [false, "Creator declares no AI assistance"],
    [undefined, "No AI-assistance declaration provided"],
  ])("keeps AI assistance %s distinct", (value, label) => {
    const root = renderDeclarations(
      standard({
        aiProvenance: value === undefined ? {} : { isAIAssisted: value },
      }),
      undefined,
    );
    expect(card(root, 1).textContent).toContain(label);
    expect(card(root, 1).textContent).not.toContain("AI was detected");
    expect(card(root, 1).textContent).not.toContain("undefined");
  });

  it("does not invent a process or human contribution percentage", () => {
    const root = renderDeclarations(
      standard({ aiProvenance: { isAIAssisted: true } }),
      undefined,
    );
    expect(card(root, 1).textContent).toContain(
      "No separate creative-process description is provided",
    );
    expect(card(root, 1).textContent).not.toContain("%");
  });

  it.each([
    [{}, "No AI-training policy provided"],
    [
      { aiOptOut: false, doNotTrain: false },
      "Different policy recorded - read its terms",
    ],
    [{ aiOptOut: true, doNotTrain: true }, "AI-training restriction recorded"],
    [{ aiOptOut: true, doNotTrain: false }, "Recorded policy requires review"],
    [
      {
        notice:
          "Permission is granted only with a separately signed agreement.",
      },
      "Recorded policy requires review",
    ],
    [
      { aiOptOut: true, license: "Training permitted under separate terms" },
      "Recorded policy requires review",
    ],
  ])("presents policy %j without inferring permission", (policy, label) => {
    const root = renderDeclarations(standard({ policy }), undefined);
    expect(card(root, 0).textContent).toContain(label);
    expect(card(root, 0).textContent).not.toContain("Permission recorded");
  });

  it("shows missing-policy guidance without interpreting absence as permission", () => {
    const root = renderDeclarations(standard({ policy: undefined }), undefined);
    expect(card(root, 0).textContent).toContain(
      "Missing information does not mean permission",
    );
  });

  it("preserves complete hostile and long notices as inert original text", () => {
    const notice = `<img src=x onerror=alert(1)>\n  Original whitespace  \n${"A long recorded condition. ".repeat(1500)}`;
    const record = standard({
      policy: { notice },
      aiProvenance: {
        isAIAssisted: true,
        aiCreativeProcess: "<script>bad()</script>\nCreator's own words",
      },
    });
    const before = JSON.stringify(record);
    const root = renderDeclarations(record, undefined);
    const values = [...root.querySelectorAll("#declaration-policy-values dd")];
    expect(values.some((value) => value.textContent === notice)).toBe(true);
    expect(
      root.querySelector("#declaration-policy-values")?.textContent,
    ).toContain("manifest.policy.notice");
    expect(root.querySelector("blockquote")?.textContent).toBe(
      "<script>bad()</script>\nCreator's own words",
    );
    expect(
      root.querySelector("script, img, iframe, a[href^='javascript:']"),
    ).toBeNull();
    expect(JSON.stringify(record)).toBe(before);
  });

  it("retains every Extended detail and both process sources without silently merging", () => {
    const record = extendedRecord();
    const details = record.publicManifest!.recordDetails as Record<
      string,
      unknown
    >;
    const copyright = details.copyright as Record<string, unknown>;
    copyright.aiCreativeProcess = "A distinct additional process declaration.";
    copyright.extraNotice = {
      "unfamiliar.field": ["Keep this notice in full", false, null],
    };
    const root = renderDeclarations(record, undefined);
    expect(root.textContent).toContain(extended.aiProvenance.aiCreativeProcess);
    expect(root.textContent).toContain(
      "A distinct additional process declaration.",
    );
    expect(root.textContent).toContain(
      "manifest.aiProvenance.aiCreativeProcess",
    );
    expect(root.textContent).toContain(
      "manifest.recordDetails.copyright.aiCreativeProcess",
    );
    expect(
      root.querySelector("#declaration-extended-values")?.textContent,
    ).toContain("Keep this notice in full");
    expect(
      root.querySelector("#declaration-extended-values")?.textContent,
    ).toContain('extraNotice["unfamiliar.field"][0]');
  });

  it("reports contradictory or unsupported AI values for review", () => {
    const record = extendedRecord();
    const details = record.publicManifest!.recordDetails as Record<
      string,
      unknown
    >;
    (details.copyright as Record<string, unknown>).isAIAssisted = false;
    expect(
      card(renderDeclarations(record, undefined), 1).textContent,
    ).toContain("AI declaration requires review");
    record.publicManifest!.aiProvenance = { isAIAssisted: "possibly" };
    const root = renderDeclarations(record, undefined);
    expect(card(root, 1).textContent).toContain(
      "AI declaration requires review",
    );
    expect(root.querySelector("#declaration-ai-values")?.textContent).toContain(
      "possibly",
    );
  });

  it("keeps a process-only declaration readable without inferring AI use", () => {
    const root = renderDeclarations(
      standard({
        aiProvenance: {
          aiCreativeProcess: "I describe my process in my own words.",
        },
      }),
      undefined,
    );
    expect(card(root, 1).textContent).toContain(
      "AI declaration requires review",
    );
    expect(card(root, 1).textContent).toContain(
      "I describe my process in my own words.",
    );
  });

  it.each([
    { aiUsageDeclaration: "AI-assisted" },
    { isAIAssisted: false, aiUsageDeclaration: "AI-assisted" },
    { humanCreatedPercentage: 75 },
  ])(
    "keeps unfamiliar or incomplete AI information distinct from absence: %j",
    (aiProvenance) => {
      const root = renderDeclarations(standard({ aiProvenance }), undefined);
      const aiCard = card(root, 1);
      expect(aiCard.textContent).toContain("AI declaration requires review");
      expect(aiCard.textContent).not.toContain(
        "This record provides no statement",
      );
      for (const [key, value] of Object.entries(aiProvenance)) {
        expect(
          aiCard.querySelector("#declaration-ai-values")?.textContent,
        ).toContain(`manifest.aiProvenance.${key}`);
        expect(
          aiCard.querySelector("#declaration-ai-values")?.textContent,
        ).toContain(String(value));
      }
    },
  );

  it("does not choose one policy when Extended recorded terms differ", () => {
    const record = extendedRecord();
    const details = record.publicManifest!.recordDetails as Record<
      string,
      unknown
    >;
    details.license = "Different terms requiring review";
    const root = renderDeclarations(record, undefined);
    expect(card(root, 0).textContent).toContain(
      "Recorded policy requires review",
    );
    expect(
      root.querySelector("#declaration-extended-values")?.textContent,
    ).toContain("Different terms requiring review");
    expect(
      root.querySelector("#declaration-policy-values")?.textContent,
    ).toContain("All Rights Reserved");
  });

  it.each([true, false, undefined])(
    "does not infer claimant adoption from its text when accepted is %s",
    (accepted) => {
      const root = renderDeclarations(
        standard({
          attestations: {
            claimantAdoption: {
              text: "My exact statement",
              ...(accepted === undefined ? {} : { accepted }),
            },
          },
        }),
        undefined,
      );
      const statement = root.querySelector(".declaration-statement")!;
      expect(statement.textContent).toContain("My exact statement");
      expect(statement.textContent).toContain(
        accepted === true
          ? "recorded as accepted"
          : accepted === false
            ? "recorded as not accepted"
            : "acceptance not provided or unsupported",
      );
      expect(statement.textContent).toContain(
        "manifest.attestations.claimantAdoption.text",
      );
    },
  );

  it("keeps existing non-policy assertions, values and limitations accessible", () => {
    const record = structuredClone(demoRecord);
    const root = renderDeclarations(record, undefined);
    const assertions = root.querySelector("#declaration-other-assertions")!;
    for (const assertion of listAssertions(record).filter(
      (item) => item.category !== "ai_policy",
    )) {
      expect(assertions.textContent).toContain(assertion.label);
      expect(assertions.textContent).toContain(assertion.value);
      expect(assertions.textContent).toContain(assertion.source);
      expect(assertions.textContent).toContain(assertion.limitation);
    }
    expect(assertions.textContent).not.toContain("AI opt-out: undefined");
    const ids = [...root.querySelectorAll("details")].map((item) => item.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("declaration integrity coverage", () => {
  it("keeps Standard rights and AI exclusions visible after successful checks", async () => {
    const snapshot = await verifyRecord(demoRecord);
    const root = renderDeclarations(demoRecord, snapshot);
    const coverage = root.querySelector(".declaration-coverage")!;
    expect(coverage.querySelector("p")?.textContent).toContain(
      "outside the reviewed Standard hash coverage",
    );
    expect(coverage.textContent).toContain(
      "A signature pass does not validate these fields",
    );
    expect(root.querySelector(".declaration-statement")?.textContent).toContain(
      "Standard hash check includes recorded attestations",
    );
    for (const limit of snapshot.coverage.limitations)
      expect(coverage.textContent).toContain(limit);
  });

  it("shows Extended coverage only for a completed reviewed content check bound to this record", async () => {
    const record = extendedRecord();
    const snapshot = await verifyRecord(record);
    const root = renderDeclarations(record, snapshot);
    expect(root.querySelector(".declaration-coverage")?.textContent).toContain(
      "included in the reviewed Extended hash projection",
    );
    expect(root.textContent).toContain(
      "does not prove the declarations are true or legally effective",
    );
    expect(renderDeclarations(record, undefined).textContent).not.toContain(
      "included in the reviewed Extended hash projection",
    );
    const other = {
      ...snapshot,
      recordBinding: {
        ...snapshot.recordBinding,
        source: "https://cbyuce.com/verify/other",
      },
    };
    expect(renderDeclarations(record, other).textContent).not.toContain(
      "included in the reviewed Extended hash projection",
    );
  });

  it.each([
    "unsupported",
    "checking",
    "retryable",
    "reported",
    "mismatch",
  ] as const)(
    "does not turn an Extended %s into a coverage pass",
    async (status) => {
      const record = extendedRecord();
      const snapshot = await verifyRecord(record);
      const changed: VerificationSnapshot = {
        ...snapshot,
        coverage: {
          manifestContents:
            status === "mismatch" ? "mismatch" : "not_recomputed",
          limitations: ["Synthetic incomplete coverage result."],
        },
        checks: snapshot.checks.map((check) =>
          check.id === "canonical_manifest_hash" ? { ...check, status } : check,
        ),
      };
      const root = renderDeclarations(record, changed);
      expect(root.textContent).not.toContain(
        "included in the reviewed Extended hash projection",
      );
      expect(root.textContent).toContain(
        status === "mismatch"
          ? "manifest hash did not match"
          : "required content check is incomplete",
      );
    },
  );

  it("does not infer hybrid or unfamiliar-profile coverage from a version label", async () => {
    const record = extendedRecord();
    const snapshot = await verifyRecord(record);
    const unknown = structuredClone(snapshot);
    unknown.checks.find(
      (check) => check.id === "canonical_manifest_hash",
    )!.hashProvenance!.profile = "unreviewed-profile";
    expect(renderDeclarations(record, unknown).textContent).not.toContain(
      "included in the reviewed Extended hash projection",
    );
    for (const schemaVersion of ["2.0.0", "2.1.0", "9.0.0"]) {
      expect(
        renderDeclarations({ ...record, schemaVersion }, snapshot).textContent,
      ).not.toContain("included in the reviewed Extended hash projection");
    }
  });
});
