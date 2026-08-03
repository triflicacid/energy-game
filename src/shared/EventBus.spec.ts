import { describe, expect, it, vi } from "vitest";
import { EventBus, type Unsubscribe } from "./EventBus";

interface TestEvents {
  "counter:incremented": { value: number };
  "name:changed": { name: string };
}

describe("EventBus", () => {
  describe("delivery", () => {
    it("delivers the correct payload to a subscriber", () => {
      const bus = new EventBus<TestEvents>();
      const received: number[] = [];
      bus.subscribe("counter:incremented", ({ value }) => received.push(value));
      bus.publish("counter:incremented", { value: 42 });
      expect(received).toEqual([42]);
    });

    it("notifies all subscribers for the same event", () => {
      const bus = new EventBus<TestEvents>();
      const calls: string[] = [];
      bus.subscribe("counter:incremented", () => calls.push("a"));
      bus.subscribe("counter:incremented", () => calls.push("b"));
      bus.publish("counter:incremented", { value: 1 });
      expect(calls).toContain("a");
      expect(calls).toContain("b");
      expect(calls).toHaveLength(2);
    });

    it("does not deliver to subscribers of a different event type", () => {
      const bus = new EventBus<TestEvents>();
      const received: string[] = [];
      bus.subscribe("name:changed", ({ name }) => received.push(name));
      bus.publish("counter:incremented", { value: 1 });
      expect(received).toHaveLength(0);
    });

    it("delivers multiple publishes in order", () => {
      const bus = new EventBus<TestEvents>();
      const received: number[] = [];
      bus.subscribe("counter:incremented", ({ value }) => received.push(value));
      bus.publish("counter:incremented", { value: 1 });
      bus.publish("counter:incremented", { value: 2 });
      bus.publish("counter:incremented", { value: 3 });
      expect(received).toEqual([1, 2, 3]);
    });
  });

  describe("unsubscribe", () => {
    it("stops delivery after unsubscribing outside delivery", () => {
      const bus = new EventBus<TestEvents>();
      const calls: number[] = [];
      const unsub = bus.subscribe("counter:incremented", ({ value }) =>
        calls.push(value),
      );
      bus.publish("counter:incremented", { value: 1 });
      unsub();
      bus.publish("counter:incremented", { value: 2 });
      expect(calls).toEqual([1]);
    });

    it("does not notify a listener removed before it fires during delivery", () => {
      const bus = new EventBus<TestEvents>();
      const calls: string[] = [];
      // a is registered first so it fires first; it removes b before b fires
      const refs = { unsubB: vi.fn() as Unsubscribe };
      bus.subscribe("counter:incremented", () => {
        calls.push("a");
        refs.unsubB();
      });
      refs.unsubB = bus.subscribe("counter:incremented", () => calls.push("b"));
      bus.publish("counter:incremented", { value: 1 });
      expect(calls).toEqual(["a"]);
    });

    it("is safe to call unsubscribe more than once", () => {
      const bus = new EventBus<TestEvents>();
      const unsub = bus.subscribe("counter:incremented", vi.fn());
      expect(() => {
        unsub();
        unsub();
      }).not.toThrow();
    });
  });

  describe("nested publication", () => {
    it("completes all outer listeners before delivering inner queued events", () => {
      const bus = new EventBus<TestEvents>();
      const order: string[] = [];
      bus.subscribe("counter:incremented", () => {
        order.push("outer");
        bus.publish("name:changed", { name: "inner" });
      });
      bus.subscribe("name:changed", () => order.push("inner"));
      bus.publish("counter:incremented", { value: 1 });
      expect(order).toEqual(["outer", "inner"]);
    });

    it("drains events queued during delivery in fifo order", () => {
      const bus = new EventBus<TestEvents>();
      const order: string[] = [];
      bus.subscribe("counter:incremented", () => {
        order.push("outer");
        bus.publish("name:changed", { name: "first" });
        bus.publish("name:changed", { name: "second" });
      });
      bus.subscribe("name:changed", ({ name }) => order.push(name));
      bus.publish("counter:incremented", { value: 1 });
      expect(order).toEqual(["outer", "first", "second"]);
    });
  });

  describe("once", () => {
    it("calls the listener only on the first publish", () => {
      const bus = new EventBus<TestEvents>();
      const calls: number[] = [];
      bus.once("counter:incremented", ({ value }) => calls.push(value));
      bus.publish("counter:incremented", { value: 1 });
      bus.publish("counter:incremented", { value: 2 });
      expect(calls).toEqual([1]);
    });

    it("can be unsubscribed before firing", () => {
      const bus = new EventBus<TestEvents>();
      const listener = vi.fn();
      const unsub = bus.once("counter:incremented", listener);
      unsub();
      bus.publish("counter:incremented", { value: 1 });
      expect(listener).not.toHaveBeenCalled();
    });

    it("does not interfere with persistent subscribers on the same event", () => {
      const bus = new EventBus<TestEvents>();
      const once: number[] = [];
      const always: number[] = [];
      bus.once("counter:incremented", ({ value }) => once.push(value));
      bus.subscribe("counter:incremented", ({ value }) => always.push(value));
      bus.publish("counter:incremented", { value: 1 });
      bus.publish("counter:incremented", { value: 2 });
      expect(once).toEqual([1]);
      expect(always).toEqual([1, 2]);
    });
  });

  describe("listener error handling", () => {
    it("continues notifying remaining listeners when one throws", () => {
      const errors: unknown[] = [];
      const bus = new EventBus<TestEvents>((e) => errors.push(e));
      const calls: string[] = [];
      bus.subscribe("counter:incremented", () => {
        throw new Error("boom");
      });
      bus.subscribe("counter:incremented", () => calls.push("after error"));
      bus.publish("counter:incremented", { value: 1 });
      expect(calls).toEqual(["after error"]);
      expect(errors).toHaveLength(1);
    });

    it("passes the event name to the error handler", () => {
      const reports: string[] = [];
      const bus = new EventBus<TestEvents>((_error, name) => reports.push(name));
      bus.subscribe("counter:incremented", () => {
        throw new Error("x");
      });
      bus.publish("counter:incremented", { value: 1 });
      expect(reports).toEqual(["counter:incremented"]);
    });
  });

  describe("dispose", () => {
    it("removes all listeners so no events are delivered after disposal", () => {
      const bus = new EventBus<TestEvents>();
      const calls: number[] = [];
      bus.subscribe("counter:incremented", ({ value }) => calls.push(value));
      bus.dispose();
      bus.publish("counter:incremented", { value: 1 });
      expect(calls).toHaveLength(0);
    });

    it("skips remaining listeners when disposed during delivery", () => {
      const bus = new EventBus<TestEvents>();
      const calls: string[] = [];
      bus.subscribe("counter:incremented", () => {
        calls.push("a");
        bus.dispose();
      });
      bus.subscribe("counter:incremented", () => calls.push("b"));
      bus.publish("counter:incremented", { value: 1 });
      expect(calls).toEqual(["a"]);
    });
  });

  describe("compile-time type safety", () => {
    it("rejects unknown event names", () => {
      const bus = new EventBus<TestEvents>();
      // @ts-expect-error unknown event name in publish
      bus.publish("unknown:event", {});
      // @ts-expect-error unknown event name in subscribe
      bus.subscribe("unknown:event", vi.fn());
    });

    it("rejects wrong payload shape", () => {
      const bus = new EventBus<TestEvents>();
      // @ts-expect-error wrong payload fields
      bus.publish("counter:incremented", { name: "wrong" });
      // @ts-expect-error missing required field
      bus.publish("counter:incremented", {});
    });

    it("rejects incompatible listener payload type", () => {
      const bus = new EventBus<TestEvents>();
      // @ts-expect-error listener expects wrong payload type
      bus.subscribe("counter:incremented", (_payload: { name: string }) => void _payload);
    });
  });
});









