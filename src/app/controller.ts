import type {
  ChronologyItem,
  EvidenceCheck,
  LocalFileDigest,
  RecordedAssertion,
  RecordSummary,
  UceRecord,
  VerificationSnapshot,
} from "../types/record";
import { hashLocalFile } from "../verification/crypto";
import {
  compareLocalDigest,
  inspectChronology,
  listAssertions,
  summarizeRecord,
  verifyRecord,
} from "../verification/evidence";
import {
  loadPastedRecord,
  loadPublicKeys,
  loadPublicRecord,
  type FetchLike,
} from "../records/loader";

export interface AppState {
  record?: UceRecord;
  verification?: VerificationSnapshot;
  localFile?: LocalFileDigest;
  localComparison?: EvidenceCheck;
  busy: boolean;
  error?: string;
  webmcp: {
    status: "pending" | "registered" | "unavailable" | "failed";
    detail: string;
  };
}

type Listener = (state: Readonly<AppState>) => void;

export class AppController {
  private state: AppState = {
    busy: false,
    webmcp: {
      status: "pending",
      detail: "Checking for browser site-tool support…",
    },
  };

  private readonly listeners = new Set<Listener>();

  constructor(private readonly fetcher: FetchLike = fetch) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): Readonly<AppState> {
    return this.state;
  }

  private update(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.state));
  }

  setWebMcp(status: AppState["webmcp"]): void {
    this.update({ webmcp: status });
  }

  private async acceptRecord(record: UceRecord): Promise<UceRecord> {
    this.update({
      record,
      localFile: undefined,
      localComparison: undefined,
      error: undefined,
    });
    await this.runVerification();
    return record;
  }

  async load(source = "demo"): Promise<UceRecord> {
    this.update({ busy: true, error: undefined });
    try {
      return await this.acceptRecord(
        await loadPublicRecord(source, this.fetcher),
      );
    } catch (error) {
      this.update({
        error:
          error instanceof Error
            ? error.message
            : "The record could not be loaded.",
      });
      throw error;
    } finally {
      this.update({ busy: false });
    }
  }

  async loadJson(text: string): Promise<UceRecord> {
    this.update({ busy: true, error: undefined });
    try {
      return await this.acceptRecord(loadPastedRecord(text));
    } catch (error) {
      this.update({
        error:
          error instanceof Error
            ? error.message
            : "The pasted record could not be loaded.",
      });
      throw error;
    } finally {
      this.update({ busy: false });
    }
  }

  async runVerification(): Promise<VerificationSnapshot> {
    const record = this.state.record;
    if (!record)
      throw new Error("Load a UCE record before running verification.");
    let publicKeys = record.publicKeys;
    if (!publicKeys) {
      try {
        publicKeys = await loadPublicKeys(record, this.fetcher);
      } catch {
        publicKeys = undefined;
      }
    }
    const verification = await verifyRecord(record, publicKeys);
    this.update({ verification });
    return verification;
  }

  summary(): RecordSummary {
    if (!this.state.record) throw new Error("No UCE record is loaded.");
    return summarizeRecord(this.state.record);
  }

  chronology(): ChronologyItem[] {
    if (!this.state.record) throw new Error("No UCE record is loaded.");
    return inspectChronology(this.state.record);
  }

  assertions(): RecordedAssertion[] {
    if (!this.state.record) throw new Error("No UCE record is loaded.");
    return listAssertions(this.state.record);
  }

  rightsAssertions(): RecordedAssertion[] {
    return this.assertions().filter(
      (assertion) => assertion.category === "rights",
    );
  }

  async selectLocalFile(file: File, fileIndex = 0): Promise<EvidenceCheck> {
    if (!this.state.record)
      throw new Error("Load a UCE record before selecting a local file.");
    this.update({ busy: true, error: undefined });
    try {
      const localFile = await hashLocalFile(file);
      const localComparison = compareLocalDigest(
        this.state.record,
        localFile,
        fileIndex,
      );
      this.update({ localFile, localComparison });
      return localComparison;
    } catch (error) {
      this.update({
        error:
          error instanceof Error
            ? error.message
            : "The local file could not be hashed.",
      });
      throw error;
    } finally {
      this.update({ busy: false });
    }
  }

  compareSelectedFile(fileIndex = 0): EvidenceCheck {
    if (!this.state.record) throw new Error("No UCE record is loaded.");
    const comparison = compareLocalDigest(
      this.state.record,
      this.state.localFile,
      fileIndex,
    );
    this.update({ localComparison: comparison });
    return comparison;
  }
}
