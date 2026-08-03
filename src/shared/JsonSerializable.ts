/** contract for objects that can snapshot and restore their state as plain JSON-compatible data */
export interface JsonSerializable<TState> {
  /** returns a serializable snapshot of the current state */
  getState(): TState;
  /** restores state from a snapshot
   * @throws if the provided state is invalid
   */
  restore(state: TState): void;
}

