import type { Disposable } from "./Disposable";

/** maps event names to payload types */
export type EventMap = Record<string, unknown>;

/** called when a subscribed event fires */
export type Listener<TPayload> = (payload: TPayload) => void;

/** removes the subscription; calling it more than once is safe */
export type Unsubscribe = () => void;

/** called when a listener throws, with the error and event name */
export type ListenerErrorHandler = (error: unknown, eventName: string) => void;

const defaultErrorHandler: ListenerErrorHandler = (error, eventName) => {
  console.error(`listener error on "${eventName}":`, error);
};

type QueuedEvent = {
  name: string;
  payload: unknown;
};

/** type-safe event bus; events published during delivery are queued and delivered after the current batch */
export class EventBus<TMap extends object> implements Disposable {
  private readonly listeners = new Map<string, Set<Listener<unknown>>>();
  private readonly queue: QueuedEvent[] = [];
  private delivering = false;

  public constructor(private readonly onListenerError: ListenerErrorHandler = defaultErrorHandler) {}

  /** subscribes listener to name and returns a function that removes it */
  public subscribe<K extends keyof TMap & string>(
    name: K,
    listener: Listener<TMap[K]>,
  ): Unsubscribe {
    let set = this.listeners.get(name);
    if (!set) {
      set = new Set();
      this.listeners.set(name, set);
    }
    set.add(listener as Listener<unknown>);
    return () => {
      this.listeners.get(name)?.delete(listener as Listener<unknown>);
    };
  }

  /** subscribes a listener that removes itself after firing once */
  public once<K extends keyof TMap & string>(
    name: K,
    listener: Listener<TMap[K]>,
  ): Unsubscribe {
    const unsub = this.subscribe(name, (payload) => {
      unsub();
      listener(payload);
    });
    return unsub;
  }

  /** publishes name with payload to all current subscribers */
  public publish<K extends keyof TMap & string>(name: K, payload: TMap[K]): void {
    this.queue.push({ name, payload });
    if (!this.delivering) {
      this.drain();
    }
  }

  /** delivers all queued events in order, notifying each event's current subscribers */
  private drain(): void {
    this.delivering = true;
    try {
      while (this.queue.length > 0) {
        const event = this.queue.shift();
        // only reachable if queue is mutated concurrently, which should not happen
        if (!event) break;
        const { name, payload } = event;
        const set = this.listeners.get(name);
        if (!set) continue;
        for (const listener of [...set]) {
          // skip listeners removed during this delivery, including via dispose
          if (!this.listeners.has(name) || !set.has(listener)) continue;
          try {
            listener(payload);
          } catch (error) {
            this.onListenerError(error, name);
          }
        }
      }
    } finally {
      this.delivering = false;
    }
  }

  /** removes all subscriptions and clears any pending events */
  public dispose(): void {
    this.listeners.clear();
    this.queue.length = 0;
    this.delivering = false;
  }
}
