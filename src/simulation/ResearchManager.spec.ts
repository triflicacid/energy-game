import { describe, it, expect, vi } from "vitest";
import { EventBus } from "@shared/EventBus";
import type { ResearchNodeDef } from "@content/defs";
import { ResearchManager, type ResearchEventMap } from "./ResearchManager";

function node(
  id: string,
  parentIds: string[],
  researchCost: number,
  unlockIds: string[] = [],
): ResearchNodeDef {
  return { id, era: "test", parentIds, researchCost, unlockIds };
}

function makeBus() {
  return new EventBus<ResearchEventMap>();
}

// fixture: A (root, free) → B (cost 50) → C (cost 100)
const NODES: readonly ResearchNodeDef[] = [
  node("A", [], 0),
  node("B", ["A"], 50),
  node("C", ["B"], 100),
];

describe("ResearchManager", () => {
  describe("prerequisites", () => {
    it("rejects adding points to a node whose prerequisites are not completed", () => {
      const rm = new ResearchManager(NODES, makeBus());
      const result = rm.addPoints("B", 10);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("prerequisites not met");
    });

    it("accepts points for a root node with no prerequisites", () => {
      const rm = new ResearchManager(NODES, makeBus());
      expect(rm.addPoints("A", 0).ok).toBe(true);
    });

    it("accepts points for a node once its prerequisites are completed", () => {
      const rm = new ResearchManager(NODES, makeBus());
      rm.addPoints("A", 0);
      expect(rm.addPoints("B", 10).ok).toBe(true);
    });
  });

  describe("unavailable target", () => {
    it("rejects adding points to an unknown node", () => {
      const rm = new ResearchManager(NODES, makeBus());
      const result = rm.addPoints("does-not-exist", 10);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("unknown");
    });

    it("rejects adding points to an already completed node", () => {
      const rm = new ResearchManager(NODES, makeBus());
      rm.addPoints("A", 0);
      const result = rm.addPoints("A", 1);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("already completed");
    });

    it("throws on invalid point values", () => {
      const rm = new ResearchManager(NODES, makeBus());
      expect(() => rm.addPoints("A", -1)).toThrow(RangeError);
      expect(() => rm.addPoints("A", NaN)).toThrow(RangeError);
      expect(() => rm.addPoints("A", Infinity)).toThrow(RangeError);
    });
  });

  describe("progress", () => {
    it("accumulates points without completing when below threshold", () => {
      const rm = new ResearchManager(NODES, makeBus());
      rm.addPoints("A", 0);
      rm.addPoints("B", 30);
      expect(rm.getProgress("B")).toBe(30);
      expect(rm.isCompleted("B")).toBe(false);
    });

    it("returns 0 for a node with no prior points", () => {
      const rm = new ResearchManager(NODES, makeBus());
      expect(rm.getProgress("A")).toBe(0);
    });

    it("two nodes can accumulate points simultaneously", () => {
      // add a second root node D so both are available from the start
      const nodes = [node("A", [], 50), node("D", [], 80)];
      const rm = new ResearchManager(nodes, makeBus());
      rm.addPoints("A", 20);
      rm.addPoints("D", 30);
      expect(rm.getProgress("A")).toBe(20);
      expect(rm.getProgress("D")).toBe(30);
      expect(rm.getInProgress()).toContain("A");
      expect(rm.getInProgress()).toContain("D");
    });

    it("multiple sources contributing to the same node accumulate correctly", () => {
      const rm = new ResearchManager(NODES, makeBus());
      rm.addPoints("A", 0);
      rm.addPoints("B", 15); // town A contributes 15
      rm.addPoints("B", 10); // town B also contributes 10 same tick
      expect(rm.getProgress("B")).toBe(25);
    });
  });

  describe("completion", () => {
    it("completes a free node when addPoints(nodeId, 0) is called", () => {
      const rm = new ResearchManager(NODES, makeBus());
      const result = rm.addPoints("A", 0);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.completed).toBe(true);
      expect(rm.isCompleted("A")).toBe(true);
    });

    it("completes a node exactly when accumulated cost meets the threshold", () => {
      const rm = new ResearchManager(NODES, makeBus());
      rm.addPoints("A", 0);
      rm.addPoints("B", 49);
      expect(rm.isCompleted("B")).toBe(false);
      const result = rm.addPoints("B", 1);
      expect(result.ok && result.completed).toBe(true);
      expect(rm.isCompleted("B")).toBe(true);
    });

    it("removes a completed node from in-progress tracking", () => {
      const rm = new ResearchManager(NODES, makeBus());
      rm.addPoints("A", 0);
      rm.addPoints("B", 25);
      expect(rm.getInProgress()).toContain("B");
      rm.addPoints("B", 25);
      expect(rm.getInProgress()).not.toContain("B");
    });

    it("publishes research:completed with the correct unlockIds", () => {
      const unlockNode = node("D", [], 10, ["forestry-operation", "sawmill"]);
      const bus = new EventBus<ResearchEventMap>();
      const rm = new ResearchManager([unlockNode], bus);
      const handler = vi.fn();
      bus.subscribe("research:completed", handler);
      rm.addPoints("D", 10);
      expect(handler).toHaveBeenCalledWith({
        nodeId: "D",
        unlockIds: ["forestry-operation", "sawmill"],
      });
    });
  });

  describe("duplicate completion prevention", () => {
    it("rejects adding points to a completed node", () => {
      const rm = new ResearchManager(NODES, makeBus());
      rm.addPoints("A", 0);
      const result = rm.addPoints("A", 1);
      expect(result.ok).toBe(false);
    });

    it("does not record a node in completed more than once", () => {
      const rm = new ResearchManager(NODES, makeBus());
      rm.addPoints("A", 0);
      rm.addPoints("A", 0); // rejected
      const state = rm.getState();
      expect(state.completed.filter((id) => id === "A").length).toBe(1);
    });
  });

  describe("unlock recalculation", () => {
    it("makes a child node available after completing its parent", () => {
      const rm = new ResearchManager(NODES, makeBus());
      expect(rm.getAvailable()).not.toContain("B");
      rm.addPoints("A", 0);
      expect(rm.getAvailable()).toContain("B");
    });

    it("publishes research:available for each newly available node after completion", () => {
      const bus = new EventBus<ResearchEventMap>();
      const rm = new ResearchManager(NODES, bus);
      const handler = vi.fn();
      bus.subscribe("research:available", handler);
      rm.addPoints("A", 0);
      const calls = handler.mock.calls.map((c) => (c[0] as { nodeId: string }).nodeId);
      expect(calls).toContain("B");
      expect(calls).not.toContain("C"); // C still requires B
    });

    it("returns blocked nodes that still have unmet prerequisites", () => {
      const rm = new ResearchManager(NODES, makeBus());
      expect(rm.getBlocked()).toContain("B");
      expect(rm.getBlocked()).toContain("C");
    });

    it("removes a node from blocked after completing its prerequisites", () => {
      const rm = new ResearchManager(NODES, makeBus());
      rm.addPoints("A", 0);
      expect(rm.getBlocked()).not.toContain("B");
      expect(rm.getBlocked()).toContain("C");
    });
  });

  describe("serialization", () => {
    it("round-trips state via getState and restore", () => {
      const rm = new ResearchManager(NODES, makeBus());
      rm.addPoints("A", 0);
      rm.addPoints("B", 25);

      const state = rm.getState();
      const rm2 = new ResearchManager(NODES, makeBus());
      rm2.restore(state);

      expect(rm2.isCompleted("A")).toBe(true);
      expect(rm2.getProgress("B")).toBe(25);
      expect(rm2.isCompleted("B")).toBe(false);
    });

    it("restores completed set and reflects correct availability", () => {
      const rm = new ResearchManager(NODES, makeBus());
      rm.addPoints("A", 0);
      const state = rm.getState();

      const rm2 = new ResearchManager(NODES, makeBus());
      rm2.restore(state);

      expect(rm2.getAvailable()).toContain("B");
      expect(rm2.getBlocked()).toContain("C");
    });

    it("preserves in-progress state for multiple nodes on restore", () => {
      const nodes = [node("A", [], 50), node("D", [], 80)];
      const rm = new ResearchManager(nodes, makeBus());
      rm.addPoints("A", 20);
      rm.addPoints("D", 30);

      const rm2 = new ResearchManager(nodes, makeBus());
      rm2.restore(rm.getState());

      expect(rm2.getProgress("A")).toBe(20);
      expect(rm2.getProgress("D")).toBe(30);
    });
  });
});


