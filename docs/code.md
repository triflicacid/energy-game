# code guidelines

## state

avoid global state. if something must be shared, pass it explicitly or hold it on a class instance. module-level constants (frozen config, lookup tables) are fine.

```ts
// bad
let currentEnergy = 0;

// good
class Player {
    energy = 0;
}
```

## access modifiers

always write explicit access modifiers on every class member, even where typescript would infer them.

```ts
// bad
class Foo {
    value = 0;
    getValue() { return this.value; }
}

// good
class Foo {
    private value = 0;
    public getValue() { return this.value; }
}
```

this is enforced by `@typescript-eslint/explicit-member-accessibility`.

use typescript parameter properties to declare and assign constructor dependencies in one place.

```ts
// bad
class Foo {
    private readonly bar: Bar;
    public constructor(bar: Bar) {
        this.bar = bar;
    }
}

// good
class Foo {
    public constructor(private readonly bar: Bar) {}
}
```

use typescript's `private` modifier, not ecmascript private fields (`#`). private members carry no name decoration — no leading underscore, no prefix, no suffix.

```ts
// bad
class Foo {
    #value = 0;
    _value = 0;
    private _value = 0;
}

// good
class Foo {
    private value = 0;
}
```

do not use `get`/`set` accessors. expose state through explicit methods named `getX()` / `setX()`.

```ts
// bad
class Foo {
    get value() { return this.v; }
    set value(x: number) { this.v = x; }
}

// good
class Foo {
    public getValue(): number { return this.v; }
    public setValue(x: number): void { this.v = x; }
}
```

## classes and inheritance

prefer classes over loose functions and plain objects. model domain concepts as types in a hierarchy.

```ts
abstract class Entity {
    abstract update(dt: number): void;
}

class Enemy extends Entity {
    update(dt: number) { ... }
}
```

use abstract base classes to define contracts. keep concrete classes focused — one responsibility each.

## abstraction

hide implementation detail behind a clean interface. callers should not need to know how something works, only what it does.

```ts
// bad — caller manages the raw canvas api
ctx.fillStyle = '#ff0';
ctx.fillRect(x, y, w, h);

// good — caller works with a domain concept
renderer.drawTile(tile, position);
```

## file structure

one class per file, plus its directly related types, interfaces, and small helpers. name the file after the class.

```
src/
  Player.ts       ← Player class + PlayerState type
  Enemy.ts        ← Enemy class + EnemyConfig type
  Renderer.ts     ← Renderer class
```

do not bundle unrelated classes into a single file. shared pure utilities can live in a dedicated `util/` module.

## type vs interface

use `type` for plain data shapes — serializable state, event maps, content definitions, and any object shape that is not a contract for a class to implement.

```ts
// good — closed data shape, no implementation contract needed
type InventoryState = {
  readonly quantities: Readonly<Record<string, number>>;
};

// good — event map is just a lookup table of payload shapes
type InventoryEventMap = {
  "inventory:added": Readonly<{ resourceId: string; qty: number }>;
};
```

use `interface` only when a class will `implement` it — i.e. it is a genuine behavioural contract.

```ts
// good — classes implement this contract
interface JsonSerializable<TState> {
  getState(): TState;
  restore(state: TState): void;
}

class Inventory implements JsonSerializable<InventoryState> { ... }
```

the `@typescript-eslint/consistent-type-definitions` rule is disabled so the choice is made case-by-case rather than enforced uniformly.


