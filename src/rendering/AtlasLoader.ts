// loads a single atlas image once and tracks state for renderer initialization

/** minimal interface needed to control image loading lifecycle */
export interface LoadableImage {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
}

/** creates a LoadableImage; replace in tests to control load lifecycle without I/O */
export type ImageFactory = () => LoadableImage;

/** current state of the atlas image load */
export type AtlasLoadState = "loading" | "ready" | "error";

/**
 * loads a single atlas PNG once and notifies subscribers when the state changes.
 * pass imageFactory in tests to control the load lifecycle without real network I/O.
 */
export class AtlasLoader {
  private loadState: AtlasLoadState = "loading";
  private loadedImage: LoadableImage | null = null;
  private readonly listeners = new Set<() => void>();

  public constructor(
    url: string,
    imageFactory: ImageFactory = () => new Image() as unknown as LoadableImage,
  ) {
    const img = imageFactory();
    img.onload = () => {
      this.loadState = "ready";
      this.loadedImage = img;
      this.notify();
    };
    img.onerror = () => {
      this.loadState = "error";
      this.notify();
    };
    img.src = url;
  }

  /** current load state: "loading", "ready", or "error" */
  public getState(): AtlasLoadState {
    return this.loadState;
  }

  /** the loaded image, or null when not in the ready state */
  public getImage(): LoadableImage | null {
    return this.loadedImage;
  }

  /**
   * registers a callback invoked each time the load state changes.
   * returns an unsubscribe function.
   */
  public onStateChange(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(): void {
    for (const cb of this.listeners) {
      cb();
    }
  }
}

