# comment guidelines

## inline comments

- all lowercase
- no dashes (en, em, or hyphen), reword to avoid them
- only where the *why* isn't obvious from the code itself
- no restating what the code does
- no progress notes, plans, or change indicators
- no banner or section-header comments (rows of dashes, equals signs, or similar decorators used as visual dividers)

```ts
// bad
// increment the counter by one
counter++;

// bad
// this will be expanded later
doThing();

// good
// wraps at 255 to stay within a single byte
counter = (counter + 1) % 256;
```

## tsdoc

every exported function, class, and type gets a tsdoc block. keep it to one line unless parameters genuinely need explanation.

```ts
/** returns the clamped value between min and max. */
function clamp(value: number, min: number, max: number): number { ... }

/**
 * schedules a callback on the next animation frame.
 * @param callback called with elapsed ms since last frame
 */
function onFrame(callback: (dt: number) => void): void { ... }
```

- no `@returns` unless the return value is non-obvious
- no `@param` unless the parameter name alone is ambiguous
- no `@description` tag — just write the description directly
- no trailing period required, but be consistent within a file

