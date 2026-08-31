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

  private recordGeneration = 0;

  private fileGeneration = 0;

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

  private beginRecordOperation(): number {
    this.fileGeneration += 1;
    const generation = ++this.recordGeneration;
    this.update({
      record: undefined,
      verification: undefined,
      localFile: undefined,
      localComparison: undefined,
      busy: true,
      error: undefined,
    });
    return generation;
  }

  private async acceptRecord(
    record: UceRecord,
    generation: number,
  ): Promise<UceRecord> {
    const verification = await verifyRecord(record);
    if (generation === this.recordGeneration) {
      this.update({
        record,
        verification,
        localFile: undefined,
        localComparison: undefined,
        busy: false,
        error: undefined,
      });
    }
    return record;
  }

  async load(source = "demo"): Promise<UceRecord> {
    const generation = this.beginRecordOperation();
    try {
      return await this.acceptRecord(
        await loadPublicRecord(source, this.fetcher),
        generation,
      );
    } catch (error) {
      if (generation === this.recordGeneration) {
        this.update({
          busy: false,
          error:
            error instanceof Error
              ? error.message
              : "The record could not be loaded.",
        });
      }
      throw error;
    }
  }

  async loadJson(text: string): Promise<UceRecord> {
    const generation = this.beginRecordOperation();
    try {
      return await this.acceptRecord(loadPastedRecord(text), generation);
    } catch (error) {
      if (generation === this.recordGeneration) {
        this.update({
          busy: false,
          error:
            error instanceof Error
              ? error.message
              : "The pasted record could not be loaded.",
        });
      }
      throw error;
    }
  }

  async runVerification(): Promise<VerificationSnapshot> {
    const record = this.state.record;
    if (!record)
      throw new Error("Load a UCE record before running verification.");
    const generation = this.recordGeneration;
    const verification = await verifyRecord(record);
    if (generation === this.recordGeneration && this.state.record === record) {
      this.update({ verification });
    }
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
    const record = this.state.record;
    if (!record)
      throw new Error("Load a UCE record before selecting a local file.");
    const recordGeneration = this.recordGeneration;
    const fileGeneration = ++this.fileGeneration;
    this.update({ busy: true, error: undefined });
    try {
      const localFile = await hashLocalFile(file);
      const localComparison = compareLocalDigest(record, localFile, fileIndex);
      if (
        recordGeneration === this.recordGeneration &&
        fileGeneration === this.fileGeneration &&
        this.state.record === record
      ) {
        this.update({ localFile, localComparison, busy: false });
      }
      return localComparison;
    } catch (error) {
      if (
        recordGeneration === this.recordGeneration &&
        fileGeneration === this.fileGeneration &&
        this.state.record === record
      ) {
        this.update({
          busy: false,
          error:
            error instanceof Error
              ? error.message
              : "The local file could not be hashed.",
        });
      }
      throw error;
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
