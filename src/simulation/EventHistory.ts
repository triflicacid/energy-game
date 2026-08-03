// bounded history buffer for meaningful game events

import type { JsonSerializable } from "@shared/JsonSerializable";

/** a single recorded game event entry */
export type HistoryEntry = {
  readonly tick: number;
  readonly gameTime: number;
  readonly name: string;
  readonly payload: Readonly<Record<string, unknown>>;
};

/** default maximum number of entries retained in the history buffer */
export const DEFAULT_HISTORY_CAPACITY = 500;

/**
 * bounded buffer that records typed game events
 *
 * when the buffer reaches capacity, the oldest entries are discarded
 * to keep memory use constant over the lifetime of a campaign
 */
export class EventHistory implements JsonSerializable<readonly HistoryEntry[]> {
  private readonly _entries: HistoryEntry[] = [];

  public constructor(public readonly capacity: number = DEFAULT_HISTORY_CAPACITY) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError(`capacity must be a positive integer, got ${capacity}`);
    }
  }

  /** number of entries currently in the buffer */
  public get size(): number {
    return this._entries.length;
  }

  /** appends an entry, discarding the oldest if the buffer is full */
  public append(entry: HistoryEntry): void {
    this._entries.push(entry);
    if (this._entries.length > this.capacity) {
      this._entries.splice(0, this._entries.length - this.capacity);
    }
  }

  /** all entries in chronological order */
  public getEntries(): readonly HistoryEntry[] {
    return this._entries;
  }

  /** returns a serializable copy of the current entries */
  public getState(): readonly HistoryEntry[] {
    return this._entries.map(e => ({ ...e, payload: { ...e.payload } }));
  }

  /**
   * replaces the buffer contents from a saved state
   *
   * if the provided slice exceeds capacity, only the most recent entries are kept
   */
  public restore(entries: readonly HistoryEntry[]): void {
    this._entries.length = 0;
    const start = Math.max(0, entries.length - this.capacity);
    for (let i = start; i < entries.length; i++) {
      const e = entries[i];
      this._entries.push({ ...e, payload: { ...e.payload } });
    }
  }

  /** removes all entries from the buffer */
  public clear(): void {
    this._entries.length = 0;
  }
}



