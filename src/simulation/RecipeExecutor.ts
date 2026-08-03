// atomic recipe execution against a shared inventory

import type { EventBus } from "@shared/EventBus";
import type { RecipeDef, ResourceRef } from "@content/defs";
import type { InventoryEventMap } from "./Inventory";
import { Inventory } from "./Inventory";

/** events published by RecipeExecutor */
export type RecipeEventMap = {
  "recipe:executed": Readonly<{
    recipeId: string;
    inputs: readonly ResourceRef[];
    outputs: readonly ResourceRef[];
    byproducts: readonly ResourceRef[];
  }>;
};

/** combined event map required by RecipeExecutor and the inventory it drives */
export type RecipeExecutionEventMap = InventoryEventMap & RecipeEventMap;

/** result of a single recipe execution attempt */
export type RecipeResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * executes recipes against a shared inventory atomically
 *
 * an execution either consumes all required inputs and produces all outputs,
 * or changes nothing and returns a failure result
 */
export class RecipeExecutor {
  public constructor(
    private readonly inventory: Inventory<RecipeExecutionEventMap>,
    private readonly bus: EventBus<RecipeExecutionEventMap>,
  ) {}

  /**
   * attempts to execute one instance of the given recipe
   *
   * all inputs are checked before any change is made; power and time
   * requirements in the recipe definition are stored but not enforced here
   */
  public execute(recipe: RecipeDef): RecipeResult {
    for (const { resourceId, qty } of recipe.inputs) {
      if (!this.inventory.has(resourceId, qty)) {
        return { ok: false, reason: `insufficient ${resourceId}` };
      }
    }
    for (const { resourceId, qty } of recipe.inputs) {
      this.inventory.remove(resourceId, qty);
    }
    for (const { resourceId, qty } of [...recipe.outputs, ...recipe.byproducts]) {
      this.inventory.add(resourceId, qty);
    }
    this.bus.publish("recipe:executed", {
      recipeId: recipe.id,
      inputs: recipe.inputs,
      outputs: recipe.outputs,
      byproducts: recipe.byproducts,
    });
    return { ok: true };
  }
}

