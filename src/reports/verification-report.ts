import type { AppState } from "../app/controller";
import { RELEASE_VERSION } from "../config/release";
import { createRecipientRecordLink } from "../records/recipient-link";
import type {
  EvidenceCheck,
  LocalFileDigest,
  VerificationSnapshot,
} from "../types/record";

export const REPORT_SCHEMA = "uce.evidence-lens.verification-report";
export const REPORT_VERSION = "1.0.0";

export const DATED_SNAPSHOT_DISCLAIMER =
  "This unsigned report is a dated snapshot of public-record checks completed at checkedAt; it is not a new UCE certificate. Reported gateway-index relationships are preserved as reported results, not promoted to independent verification. Any local-file comparison is a separate browser result and may have been performed at a different time. Public evidence may change or become available later. Use recheckLink, when present, to run a fresh verification; the currently published Lens may be a different verifier version.";

const PUBLIC_LENS_URL = "https://uceevidencelens.com/";

const LOCAL_COMPARISON_BINDING =
  "This comparison binds a browser-computed local-file digest to a file digest recorded in the manifest. A match does not independently authenticate the manifest or prove authorship, ownership, or copyright.";

export interface CreateVerificationReportOptions {
  includeLocalFileDetails?: boolean;
}

export interface VerificationReport {
  readonly reportSchema: typeof REPORT_SCHEMA;
  readonly reportVersion: typeof REPORT_VERSION;
  readonly createdAt: string;
  readonly checkedAt: string;
  readonly verifierVersion: string;
  readonly recordBinding: Readonly<VerificationSnapshot["recordBinding"]>;
  readonly publicMetadata: Readonly<{ title: string }>;
  readonly checks: readonly Readonly<EvidenceCheck>[];
  readonly coverage: Readonly<VerificationSnapshot["coverage"]>;
  readonly summary: string;
  readonly legalNotice: string;
  readonly datedSnapshotDisclaimer: string;
  readonly recheckLink?: string;
  readonly localComparison?: Readonly<
    EvidenceCheck & { binding: typeof LOCAL_COMPARISON_BINDING }
  >;
  readonly localFile?: Readonly<LocalFileDigest>;
}

export class VerificationReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerificationReportError";
  }
}

function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach((child) => deepFreeze(child));
  }
  return value;
}

function publicRecheckLink(state: Readonly<AppState>): string | undefined {
  const record = state.record!;
  if (record.loadedFrom === "pasted_json") return undefined;
  try {
    return createRecipientRecordLink(record.source, PUBLIC_LENS_URL).url;
  } catch {
    return undefined;
  }
}

/**
 * Capture the completed verification currently presented by the UI/agent APIs.
 * This function performs no network or file I/O.
 */
export function createVerificationReport(
  state: Readonly<AppState>,
  options: CreateVerificationReportOptions = {},
): VerificationReport {
  if (state.busy) {
    throw new VerificationReportError(
      "Wait for the current record operation to finish before creating a report.",
    );
  }
  const record = state.record;
  const verification = state.verification;
  if (!record || !verification) {
    throw new VerificationReportError(
      "A loaded record with completed verification is required.",
    );
  }
  if (
    verification.recordBinding.source !== record.source ||
    verification.recordBinding.manifestHash !== record.manifestHash
  ) {
    throw new VerificationReportError(
      "The verification snapshot does not belong to the currently loaded record.",
    );
  }
  if (verification.checks.some((check) => check.status === "checking")) {
    throw new VerificationReportError(
      "Verification is still running. Create the report after all checks finish.",
    );
  }

  const recheckLink = publicRecheckLink(state);
  const report: VerificationReport = {
    reportSchema: REPORT_SCHEMA,
    reportVersion: REPORT_VERSION,
    createdAt: new Date().toISOString(),
    checkedAt: verification.checkedAt,
    verifierVersion: RELEASE_VERSION,
    recordBinding: jsonClone(verification.recordBinding),
    publicMetadata: { title: record.title },
    checks: jsonClone(verification.checks),
    coverage: jsonClone(verification.coverage),
    summary: verification.summary,
    legalNotice: verification.legalNotice,
    datedSnapshotDisclaimer: DATED_SNAPSHOT_DISCLAIMER,
    ...(recheckLink ? { recheckLink } : {}),
    ...(state.localComparison
      ? {
          localComparison: {
            ...jsonClone(state.localComparison),
            binding: LOCAL_COMPARISON_BINDING,
          },
        }
      : {}),
    ...(options.includeLocalFileDetails &&
    state.localComparison &&
    state.localFile
      ? { localFile: jsonClone(state.localFile) }
      : {}),
  };

  return deepFreeze(report);
}

export function serializeVerificationReport(
  report: Readonly<VerificationReport>,
): string {
  return JSON.stringify(report, null, 2);
}
