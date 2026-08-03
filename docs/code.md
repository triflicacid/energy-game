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

