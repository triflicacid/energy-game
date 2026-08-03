// deterministic seeded pseudo-random number generator (mulberry32)
// https://en.wikipedia.org/wiki/Pseudorandom_number_generator

/** serializable snapshot of rng internal state */
export interface RngState {
  readonly s: number;
}

/** seeded pseudo-random number generator (mulberry32 algorithm.) */
export class Rng {
  private s: number;

  /** creates an rng from a 32-bit integer seed */
  public constructor(seed: number) {
    this.s = seed | 0;
  }

  /** returns the next float in [0, 1) */
  public next(): number {
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  }

  /** returns a random integer in [min, max) */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /** returns a random boolean */
  public nextBool(): boolean {
    return this.next() < 0.5;
  }

  /** returns a serializable snapshot of the current state */
  public getState(): RngState {
    return { s: this.s };
  }

  /** restores state from a previously saved snapshot, continuing the same sequence */
  public restore(state: RngState): void {
    this.s = state.s | 0;
  }
}

/**
 * derives a 32-bit integer seed from a string using fnv-1a hashing.
 * same string always produces the same seed.
 */
export function seedFromString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}



