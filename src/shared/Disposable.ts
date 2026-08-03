/** contract for objects that hold resources and must be explicitly cleaned up */
export interface Disposable {
  dispose(): void;
}

