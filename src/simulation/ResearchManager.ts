// research progression: prerequisite enforcement, point accumulation, and event publishing

import type { EventBus } from "@shared/EventBus";
import type { JsonSerializable } from "@shared/JsonSerializable";
import type { ResearchNodeDef } from "@content/defs";
import type { ResearchProgressState } from "./CampaignState";

/** events published by ResearchManager */
export type ResearchEventMap = {
  "research:completed": Readonly<{ nodeId: string; unlockIds: readonly string[] }>;
  "research:available": Readonly<{ nodeId: string }>;
};

/** result returned by addPoints() */
export type AddPointsResult =
  | { readonly ok: true; readonly completed: boolean }
  | { readonly ok: false; readonly reason: string };

/**
 * manages research progression for a single campaign
 *
 * multiple nodes may progress simultaneously; callers (e.g. town workshops)
 * direct points to specific nodes each tick via addPoints(nodeId, points)
 */
export class ResearchManager<TMap extends ResearchEventMap>
  implements JsonSerializable<ResearchProgressState>
{
  private readonly nodes: ReadonlyMap<string, ResearchNodeDef>;
  private readonly completed: Set<string> = new Set();
  private readonly progress: Map<string, number> = new Map();

  public constructor(
    nodeDefs: readonly ResearchNodeDef[],
    private readonly bus: EventBus<TMap>,
  ) {
    this.nodes = new Map(nodeDefs.map((n) => [n.id, n]));
  }

  /** true when the node has been completed */
  public isCompleted(nodeId: string): boolean {
    return this.completed.has(nodeId);
  }

  /** node ids that are not completed and have all prerequisites completed */
  public getAvailable(): readonly string[] {
    return [...this.nodes.keys()].filter(
      (id) =>
        !this.completed.has(id) &&
        this.nodes.get(id)!.parentIds.every((pid) => this.completed.has(pid)),
    );
  }

  /** node ids whose prerequisites are not yet fully completed */
  public getBlocked(): readonly string[] {
    const available = new Set(this.getAvailable());
    return [...this.nodes.keys()].filter(
      (id) => !this.completed.has(id) && !available.has(id),
    );
  }

  /** accumulated points for a given node (0 if no progress has been made) */
  public getProgress(nodeId: string): number {
    return this.progress.get(nodeId) ?? 0;
  }

  /** node ids that have accumulated at least one point but are not yet completed */
  public getInProgress(): readonly string[] {
    return [...this.progress.keys()].filter(
      (id) => (this.progress.get(id) ?? 0) > 0 && !this.completed.has(id),
    );
  }

  /**
   * adds research points toward a specific node
   *
   * the node must be available (prerequisites met, not completed); multiple
   * sources may target the same or different nodes within a single tick
   * @throws RangeError if points is not a finite non-negative number
   */
  public addPoints(nodeId: string, points: number): AddPointsResult {
    if (!Number.isFinite(points) || points < 0) {
      throw new RangeError(`points must be a finite non-negative number, got ${points}`);
    }
    if (!this.nodes.has(nodeId)) {
      return { ok: false, reason: `unknown research node: ${nodeId}` };
    }
    if (this.completed.has(nodeId)) {
      return { ok: false, reason: `already completed: ${nodeId}` };
    }
    const node = this.nodes.get(nodeId)!;
    const prerequisitesMet = node.parentIds.every((pid) => this.completed.has(pid));
    if (!prerequisitesMet) {
      return { ok: false, reason: `prerequisites not met for: ${nodeId}` };
    }

    const updated = (this.progress.get(nodeId) ?? 0) + points;

    if (updated >= node.researchCost) {
      this.progress.delete(nodeId);
      this.completed.add(nodeId);
      this.bus.publish("research:completed", { nodeId, unlockIds: node.unlockIds });
      for (const id of this.getAvailable()) {
        this.bus.publish("research:available", { nodeId: id });
      }
      return { ok: true, completed: true };
    }

    this.progress.set(nodeId, updated);
    return { ok: true, completed: false };
  }

  /** returns a serializable snapshot of current research progress */
  public getState(): ResearchProgressState {
    const progress: Record<string, number> = {};
    for (const [id, pts] of this.progress) {
      progress[id] = pts;
    }
    return { completed: [...this.completed], progress };
  }

  /** restores research progress from a snapshot, replacing any existing state */
  public restore(state: ResearchProgressState): void {
    this.completed.clear();
    this.progress.clear();
    for (const id of state.completed) {
      this.completed.add(id);
    }
    for (const [id, pts] of Object.entries(state.progress)) {
      this.progress.set(id, pts);
    }
  }
}
