import { describe, it, expect, vi } from "vitest";
import { EventBus } from "@shared/EventBus";
import { makeResourceId } from "@shared";
import { Inventory } from "./Inventory";
import { RecipeExecutor } from "./RecipeExecutor";
import type { RecipeExecutionEventMap } from "./RecipeExecutor";
import type { RecipeDef } from "@content/defs";

const rid = makeResourceId;

function makeExecutor() {
  const bus = new EventBus<RecipeExecutionEventMap>();
  const inventory = new Inventory(bus);
  const executor = new RecipeExecutor(inventory, bus);
  return { bus, inventory, executor };
}

function makeRecipe(overrides: Partial<RecipeDef> = {}): RecipeDef {
  return {
    id: "test-recipe",
    inputs: [],
    outputs: [],
    byproducts: [],
    durationHours: 1,
    mechPowerKW: 0,
    requiredResearch: [],
    requiredCapabilities: [],
    ...overrides,
  };
}

describe("RecipeExecutor — sufficient inputs", () => {
  it("returns ok:true when all inputs are available", () => {
    const { inventory, executor } = makeExecutor();
    inventory.add(rid("wood"), 5);
    const result = executor.execute(makeRecipe({
      inputs: [{ resourceId: rid("wood"), qty: 3 }],
    }));
    expect(result).toEqual({ ok: true });
  });

  it("consumes all required inputs", () => {
    const { inventory, executor } = makeExecutor();
    inventory.add(rid("wood"), 5);
    executor.execute(makeRecipe({ inputs: [{ resourceId: rid("wood"), qty: 3 }] }));
    expect(inventory.get(rid("wood"))).toBe(2);
  });

  it("produces all outputs", () => {
    const { inventory, executor } = makeExecutor();
    inventory.add(rid("wood"), 3);
    executor.execute(makeRecipe({
      inputs: [{ resourceId: rid("wood"), qty: 3 }],
      outputs: [{ resourceId: rid("plank"), qty: 6 }],
    }));
    expect(inventory.get(rid("plank"))).toBe(6);
  });

  it("produces all byproducts", () => {
    const { inventory, executor } = makeExecutor();
    inventory.add(rid("wood"), 2);
    executor.execute(makeRecipe({
      inputs: [{ resourceId: rid("wood"), qty: 2 }],
      byproducts: [{ resourceId: rid("sawdust"), qty: 1 }],
    }));
    expect(inventory.get(rid("sawdust"))).toBe(1);
  });

  it("works with the exact input amount", () => {
    const { inventory, executor } = makeExecutor();
    inventory.add(rid("wood"), 3);
    expect(executor.execute(makeRecipe({
      inputs: [{ resourceId: rid("wood"), qty: 3 }],
    }))).toEqual({ ok: true });
    expect(inventory.get(rid("wood"))).toBe(0);
  });

  it("with surplus inputs, only the required amount is consumed", () => {
    const { inventory, executor } = makeExecutor();
    inventory.add(rid("wood"), 10);
    executor.execute(makeRecipe({ inputs: [{ resourceId: rid("wood"), qty: 3 }] }));
    expect(inventory.get(rid("wood"))).toBe(7);
  });
});

describe("RecipeExecutor — insufficient inputs", () => {
  it("returns ok:false when an input is missing entirely", () => {
    const { executor } = makeExecutor();
    expect(executor.execute(makeRecipe({
      inputs: [{ resourceId: rid("iron"), qty: 2 }],
    })).ok).toBe(false);
  });

  it("returns ok:false when stock is below the required amount", () => {
    const { inventory, executor } = makeExecutor();
    inventory.add(rid("wood"), 1);
    expect(executor.execute(makeRecipe({
      inputs: [{ resourceId: rid("wood"), qty: 5 }],
    })).ok).toBe(false);
  });

  it("does not change inventory when inputs are insufficient", () => {
    const { inventory, executor } = makeExecutor();
    inventory.add(rid("wood"), 2);
    executor.execute(makeRecipe({
      inputs: [{ resourceId: rid("wood"), qty: 5 }],
      outputs: [{ resourceId: rid("plank"), qty: 10 }],
    }));
    expect(inventory.get(rid("wood"))).toBe(2);
    expect(inventory.get(rid("plank"))).toBe(0);
  });

  it("is atomic: no inputs are consumed when any one input is insufficient", () => {
    const { inventory, executor } = makeExecutor();
    inventory.add(rid("wood"), 5);
    // iron is missing
    executor.execute(makeRecipe({
      inputs: [
        { resourceId: rid("wood"), qty: 3 },
        { resourceId: rid("iron"), qty: 1 },
      ],
    }));
    expect(inventory.get(rid("wood"))).toBe(5);
  });
});

describe("RecipeExecutor — repeated execution", () => {
  it("can execute the same recipe multiple times", () => {
    const { inventory, executor } = makeExecutor();
    inventory.add(rid("wood"), 9);
    const recipe = makeRecipe({
      inputs: [{ resourceId: rid("wood"), qty: 3 }],
      outputs: [{ resourceId: rid("plank"), qty: 2 }],
    });
    executor.execute(recipe);
    executor.execute(recipe);
    executor.execute(recipe);
    expect(inventory.get(rid("wood"))).toBe(0);
    expect(inventory.get(rid("plank"))).toBe(6);
  });

  it("fails once stock is exhausted", () => {
    const { inventory, executor } = makeExecutor();
    inventory.add(rid("wood"), 9);
    const recipe = makeRecipe({ inputs: [{ resourceId: rid("wood"), qty: 3 }] });
    executor.execute(recipe);
    executor.execute(recipe);
    executor.execute(recipe);
    const result = executor.execute(recipe);
    expect(result.ok).toBe(false);
    expect(inventory.get(rid("wood"))).toBe(0);
  });
});

describe("RecipeExecutor — conservation", () => {
  it("total units in equals total units out when the recipe is conservative", () => {
    // 3 wood → 2 plank + 1 sawdust
    const { inventory, executor } = makeExecutor();
    inventory.add(rid("wood"), 3);
    executor.execute(makeRecipe({
      inputs: [{ resourceId: rid("wood"), qty: 3 }],
      outputs: [{ resourceId: rid("plank"), qty: 2 }],
      byproducts: [{ resourceId: rid("sawdust"), qty: 1 }],
    }));
    expect(inventory.get(rid("plank")) + inventory.get(rid("sawdust"))).toBe(3);
  });
});

describe("RecipeExecutor — events", () => {
  it("publishes recipe:executed on success with the correct payload", () => {
    const { inventory, bus, executor } = makeExecutor();
    inventory.add(rid("wood"), 3);
    const handler = vi.fn();
    bus.subscribe("recipe:executed", handler);
    executor.execute(makeRecipe({
      id: "sawmill-run",
      inputs: [{ resourceId: rid("wood"), qty: 3 }],
      outputs: [{ resourceId: rid("plank"), qty: 2 }],
    }));
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].recipeId).toBe("sawmill-run");
  });

  it("does not publish recipe:executed on failure", () => {
    const { bus, executor } = makeExecutor();
    const handler = vi.fn();
    bus.subscribe("recipe:executed", handler);
    executor.execute(makeRecipe({ inputs: [{ resourceId: rid("wood"), qty: 1 }] }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("inventory:added events are fired for each output produced", () => {
    const { inventory, bus, executor } = makeExecutor();
    inventory.add(rid("wood"), 3);
    const handler = vi.fn();
    bus.subscribe("inventory:added", handler);
    executor.execute(makeRecipe({
      inputs: [{ resourceId: rid("wood"), qty: 3 }],
      outputs: [{ resourceId: rid("plank"), qty: 2 }],
      byproducts: [{ resourceId: rid("sawdust"), qty: 1 }],
    }));
    // one event per output + byproduct
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
