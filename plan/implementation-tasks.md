# Delegation-ready implementation tasks

## Purpose

This document breaks implementation into bounded tasks suitable for delegation to agents that should not make broad architectural or design decisions.

It supplements [the implementation roadmap](implementation-roadmap.md). The roadmap defines milestones; this document defines implementable work units, dependencies, constraints, and acceptance criteria.

## Current baseline

EnergyGame currently contains a minimal TypeScript/Vite/Electron scaffold:

- `src/index.ts` is only a placeholder.
- No game simulation, UI, content catalogs, or tests exist yet.
- No `lib/` workspace packages are configured.
- The Electron bootstrap and Vite/Vitest/TypeScript/ESLint configuration are inherited in simplified form from `fox-game`.
- The project should be treated as a greenfield game implementation, not as a fox-game migration.

Before delegating feature tasks, verify the baseline commands and repair tooling so every later agent has a reliable definition of done.

## Non-negotiable decisions

Every delegated task must preserve these decisions unless the owner explicitly changes the plan:

1. **Local-first application:** no backend, client/server protocol, accounts, network API, or cloud service is required for the core game.
2. **No premature worker split:** simulation begins in the local application process. Browser workers may be introduced later only after profiling and with a typed boundary.
3. **Fixed deterministic simulation:** simulation time is independent from rendering frame rate.
4. **Central type-safe event bus:** events have a compile-time event-to-payload map and deterministic queued delivery.
5. **Events are facts:** UI intentions call explicit typed application methods; there is no generic UI command bus.
6. **Data-driven content:** resources, recipes, facilities, generators, upgrades, research, sectors, biomes, towns, seasons, and contracts come from validated definitions.
7. **No field registry:** content definitions, runtime state, settings, and explicit debug tools remain separate.
8. **Presentation separation:** simulation imports no DOM, Canvas, CSS, sprites, or browser storage.
9. **Canvas plus DOM:** canvas renders the spatial sector map; HTML/CSS renders panels, dialogs, controls, tables, and tooltips.
10. **Research view:** prefer HTML nodes and SVG edges; do not build canvas buttons.
11. **Sector model:** a sector may contain zero, one, or multiple towns. Towns are independent runtime entities.
12. **No realistic terrain:** sectors and typed sites replace generated lakes, rivers, roads, and terrain simulation.
13. **No freight routing:** materials initially use a company-wide inventory and automatic delivery/import abstraction.
14. **No city builder:** towns expose energy demand, growth, and contracts but do not expose individual streets, buildings, or citizens.
15. **Scope discipline:** do not add multiplayer, a full commodity economy, AC electrical simulation, or speculative framework infrastructure.

## Agent execution rules

Give an agent exactly one task card at a time.

An agent must:

1. Read this document and every referenced design document.
2. Inspect existing files before editing.
3. Implement only the stated deliverables.
4. Avoid unrelated formatting, renaming, dependency changes, or refactors.
5. Add focused tests for new behavior.
6. Run the task's required verification commands and existing relevant tests.
7. Run editor diagnostics on edited files.
8. Report changed files, tests run, results, and any unresolved issue.
9. Stop and report rather than silently inventing behavior when acceptance criteria conflict.

An agent must not:

- Redesign adjacent systems.
- Add a framework or production dependency unless the task explicitly permits it.
- Hard-code content IDs in simulation/UI behavior where catalog lookup or tags are intended.
- Couple domain state to presentation.
- Use global mutable state.
- Skip failing tests or weaken validation to make a test pass.

## Task completion report

Every delegated task should return:

```text
Task: <ID and title>
Status: complete | blocked
Files changed: <list>
Tests added/updated: <list>
Commands run: <list and result>
Acceptance criteria: <each criterion pass/fail>
Assumptions: <only assumptions explicitly allowed by the task>
Follow-up issues: <none or concise list>
```

## Dependency overview

```text
B00 baseline verification
 └─ B01 tooling reliability
     └─ F00 source boundaries
         ├─ F01 event bus
         ├─ F02 units and IDs
         ├─ F03 deterministic random
         └─ C00 content structural validation
             └─ C01 content catalog and semantic validation

F01 + F02 + F03 + C01
 └─ S00 fixed simulation clock
     └─ S01 campaign state and event history
         ├─ S02 inventory and recipe execution
         ├─ S03 research progression
         └─ M00 hand-authored centre sector

S02 + S03 + M00
 └─ V00 forestry and timber
     └─ V01 mechanical power
         └─ V02 first headless vertical slice

V02
 ├─ P00 save/load
 ├─ U00 browser application shell
 └─ E00 iron/copper extraction and processing

U00
 ├─ A00 sprite-atlas pipeline
 │   └─ U01 one-sector canvas map
 └─ U02 HTML status/build/research UI

E00 + V02
 └─ E01 dynamo and first electricity
     └─ E02 primitive grid and town demand
         └─ E03 first town contract

E03
 ├─ T00 seasons and weather
 ├─ R00 bills of materials/decommissioning
 └─ X00 sector graph generation

T00 └─ T01 water, reservoirs, and seasonal generation
R00 └─ R01 recycling and imports
X00 └─ X01 exploration, biome permissions, and acquisition
      └─ X02 town generation and founding

T01 + R01 + X02
 └─ G00 multi-sector grid and dispatch MVP
```

Tasks on separate branches of this graph may run in parallel only when they do not edit shared files. Merge foundational tasks before assigning dependants.

# Phase B: stabilize the project baseline

## B00 — Verify and record baseline

**Depends on:** nothing

**Read:** `package.json`, TypeScript/Vite/Vitest/ESLint configs, `electron/main.ts`, `index.html`

**Deliverables:**

- Record required Node and pnpm versions in the project README or developer documentation.
- Run install, lint, test, client build, and Electron TypeScript compilation.
- Record actual failures without suppressing them.
- Do not implement game code.

**Acceptance:**

- Tool versions and all command outcomes are documented.
- Every baseline failure has a reproducible command and a follow-up task.

## B01 — Make tooling reliable

**Depends on:** B00

**Deliverables:**

- Fix baseline lint errors.
- Make clean/copy/build scripts reliable under the project's supported Windows shell and suitable for automation.
- Ensure `pnpm test` has a deliberate result when no tests exist, then add a trivial real test if needed to prove discovery.
- Provide clear client development, client production build, and Electron development/production commands.
- Prevent stale `dist` output from masquerading as a successful build.

**Non-goals:** game architecture or UI implementation.

**Acceptance:**

- Fresh install followed by lint, test, client build, and Electron compilation succeeds.
- Development commands are documented and do not depend on undocumented environment setup.

# Phase F: foundational code boundaries

## F00 — Establish source boundaries

**Depends on:** B01

**Read:** `plan/code-architecture.md`

**Deliverables:**

- Create minimal folders/modules for application, content, simulation, generation, rendering, UI, persistence, platform, and shared code.
- Keep files empty only where a clear public boundary is needed; avoid speculative class scaffolding.
- Replace the placeholder entry with a minimal application bootstrap that still renders/prints a harmless placeholder.
- Decide imports through relative paths or one consistent alias scheme and align TypeScript, Vite, and Vitest.

**Acceptance:**

- Boundaries compile.
- No circular imports are introduced.
- Lint, tests, and client build pass.

## F01 — Implement the central type-safe event bus

**Depends on:** F00

**Read:** the “Central event bus” section of `plan/code-architecture.md`

**Deliverables:**

- Generic event-to-payload type map.
- Subscribe with an unsubscribe result.
- Optional one-time subscription if it remains small.
- Publish/queue an event and notify every listener of its exact type.
- Defined deterministic nested-publication behavior.
- Explicit listener-error behavior.
- Disposal/subscription cleanup.

**Tests:**

- Correct payload delivery.
- Multiple listeners all notified.
- Event types remain isolated.
- Unsubscription during and outside delivery.
- Nested publication order.
- Once-only listener if implemented.
- Listener error behavior.
- Disposal.
- Compile-time rejection tests for invalid names and payloads where supported by the test setup.

**Acceptance:**

- No `any` in the public API.
- Runtime string event names cannot detach payload types from the event map.
- Tests define delivery semantics unambiguously.

## F02 — Define canonical units and runtime IDs

**Depends on:** F00

**Deliverables:**

- Document and implement canonical internal units for simulation hours, money, mechanical power, electrical power, energy, material quantities, and water.
- Add stable runtime ID types/generation for sectors, towns, sites, facilities, contracts, and construction jobs.
- Keep display formatting separate.

**Acceptance:**

- Unit conversion and ID uniqueness tests pass.
- Simulation types do not contain display abbreviations such as `kW` strings.

## F03 — Deterministic random source

**Depends on:** F00

**Deliverables:**

- Seeded random abstraction suitable for campaign and weather generation.
- Ability to reproduce a sequence from seed/state.
- Save-compatible state if random consumption continues during a campaign.

**Tests:** same seed produces same sequence; different seed differs; serialization/restoration continues the sequence.

# Phase C: data-driven content

## C00 — Structural content validation

**Depends on:** F00

**Read:** `plan/data-driven-content.md`

**Deliverables:**

- Loading boundary for bundled JSON definitions.
- Initial structural types/validators for resources, recipes, facilities, upgrades, and research nodes.
- Human-readable validation issues containing catalog, item ID/index, path, and message.
- No arbitrary executable expressions in JSON.

**Initial fixture content:** timber, wood waste, research capability, forestry operation, waterwheel, mechanical workshop, and the opening research nodes only.

**Acceptance:**

- Valid fixtures load.
- Missing fields, invalid primitive values, and malformed arrays produce precise errors.
- Raw JSON is not exposed directly to simulation code.

## C01 — Indexed catalog and semantic validation

**Depends on:** C00, F02

**Deliverables:**

- Immutable catalogs indexed by stable string ID.
- Duplicate-ID detection.
- Cross-reference validation for recipe resources, facility recipes/upgrades, and research prerequisites/unlocks.
- Research cycle and reachability validation.
- Detection of resources required before any production/import/unlock path exists.
- Aggregated error reporting rather than failing on the first issue.

**Acceptance:**

- Valid opening content creates an immutable catalog.
- Tests cover duplicate, missing, cyclic, unreachable, and circular-unlock cases.
- Simulation consumes normalized definitions, not raw JSON.

# Phase S: headless simulation foundation

## S00 — Fixed simulation clock

**Depends on:** F01, F02

**Deliverables:**

- Fixed in-game tick, initially one game hour.
- Pause and supported speed multipliers.
- Explicit single/multiple tick advancement for tests.
- Tick lifecycle events through the event bus.
- No `requestAnimationFrame`, DOM, or wall-clock dependency in simulation.

**Acceptance:**

- Equal tick sequences produce equal results regardless of render/update call cadence.
- Pause advances no game state.
- Invalid negative or nonfinite advancement is rejected.

## S01 — Serializable campaign state and event history

**Depends on:** S00, F02, F03, C01

**Deliverables:**

- Minimal campaign state containing version, seed/random state, time, money, inventories, research state, sectors, towns, facilities, and contracts.
- Read-only access boundary for presentation.
- Bounded history of meaningful typed events.
- No Canvas, DOM, callbacks, subscriptions, or duplicated definitions in state.

**Acceptance:**

- State can be serialized to plain data.
- Content definitions remain external and are referenced by ID.
- History does not grow without bound.

## S02 — Inventory and recipe execution

**Depends on:** S01

**Deliverables:**

- Company-wide resource inventory.
- Validated add/remove/query operations.
- Atomic recipe execution: consume all required inputs or change nothing.
- Power/time requirements may be represented but only enforce those needed by the opening slice.
- Meaningful inventory/recipe events.

**Tests:** insufficient inputs, exact inputs, surplus inputs, outputs/by-products, nonnegative invariants, repeated execution, conservation expectations.

## S03 — Research progression

**Depends on:** S01, C01

**Deliverables:**

- Track completed, available, blocked, and active research.
- Enforce prerequisites and costs from content.
- Advance active research through simulation time/input.
- Publish completion/unlock events.
- Do not hard-code research IDs in progression logic.

**Tests:** prerequisites, unavailable start, progress, completion, duplicate completion prevention, unlock recalculation.

# Phase M/V: first headless vertical slice

## M00 — Hand-authored centre sector

**Depends on:** S01, C01

**Read:** `plan/map-and-regions.md`

**Deliverables:**

- Data-defined centre sector with distance zero.
- Initially explored, surveyed, unlocked, and buildable.
- One forest site, one waterwheel site, and one generated nearby town.
- No procedural map generation yet.

**Acceptance:**

- Sector contains independent town IDs rather than embedded aggregate town state.
- Site eligibility is validated through content tags.

## V00 — Forestry and timber

**Depends on:** S02, M00

**Read:** `plan/resources-and-recycling.md`, `plan/seasons-demand-and-water.md`

**Deliverables:**

- Forest current/max biomass and growth.
- Forestry operation harvesting into company inventory.
- Sustainable and over-harvest behavior.
- Relevant events and forecast values.
- Use a simple constant growth factor until seasons are implemented.

**Acceptance:**

- Forest cannot produce more biomass than exists.
- Growth does not exceed capacity.
- Long-run sustainable and destructive cases are tested.

## V01 — Mechanical power network

**Depends on:** V00, S02

**Deliverables:**

- Site-local mechanical generation and consumption pool.
- Waterwheel consumes construction resources and provides mechanical capacity.
- Mechanical workshop requests capacity and reduces operation proportionally or stops when unavailable, according to the content behavior.
- No shaft geometry or canvas dependency.

**Acceptance:**

- Supply, demand, shortage, and unused capacity reconcile each tick.
- Mechanical power is distinct from electrical power and energy.

## V02 — First headless gameplay loop

**Depends on:** V01, S03

**Deliverables:**

Integrate a tested scenario:

1. Forest grows.
2. Forestry produces timber.
3. Timber builds a waterwheel and workshop.
4. Waterwheel supplies mechanical power.
5. Workshop advances opening research.
6. Research unlocks charcoal/prospecting placeholders.

**Acceptance:**

- Scenario runs deterministically from a fixed seed.
- No system imports browser APIs.
- Expected inventory, power, research, and events are asserted after selected ticks.
- No manual state mutation is required by the test after initial setup.

# Phase P/U: persistence and first presentation

## P00 — Local save/load

**Depends on:** V02

**Deliverables:**

- Versioned save encoding/decoding.
- Validation against content IDs/version.
- Browser-local storage adapter and in-memory test adapter.
- Corrupt/incompatible save diagnostics.
- No network or server implementation.

**Acceptance:** round trip preserves deterministic continuation; rendering caches and listeners are absent; bad saves fail safely.

## U00 — Browser application shell

**Depends on:** V02, F00

**Read:** UI sections of `plan/code-architecture.md`

**Deliverables:**

- Replace placeholder splash with application canvas and DOM overlay roots.
- Wire application lifecycle, simulation clock, and event-driven UI invalidation.
- UI invokes explicit typed application methods; do not create a command bus.
- Do not migrate `fox-game` canvas popup/display libraries.

**Acceptance:** application starts, pauses, resumes, and disposes without duplicate subscriptions; HTML controls can coexist with canvas pointer handling.

## A00 — Initial sprite-atlas pipeline

**Depends on:** U00

**Read:** `plan/sprites-and-atlases.md`

**Deliverables:**

- Individual named source sprites for the initial centre-sector slice.
- Deterministic script that validates and packs sources into a building/world atlas.
- Generated TypeScript descriptor containing semantic sprite IDs, source rectangles, anchors, and visual bounds.
- Atlas padding and maximum-size checks.
- Stale-output verification mode suitable for build/CI.
- One one-cell and one multi-cell/overhanging test asset.

**Non-goals:** handwritten atlas JSON, animation, arbitrary rotation, modular cable art, or multiple atlas pages unless required by source-size limits.

**Acceptance:**

- Same inputs produce byte/structurally identical placement and descriptors.
- Duplicate IDs, missing sources, out-of-bounds rectangles, and stale generated output fail clearly.
- Gameplay footprint remains in facility content; simulation imports no atlas or sprite types.

## U01 — One-sector canvas renderer

**Depends on:** U00, A00, M00

**Read:** `plan/sprites-and-atlases.md`

**Deliverables:**

- Render the centre sector, sites, town, and facility markers.
- Resolve semantic visual IDs through generated atlas metadata.
- Align one-cell and multi-cell sprites using content footprints and generated anchors.
- Camera/pan/zoom and spatial hit testing only as needed for this slice.
- Renderer consumes read-only state and semantic IDs.
- No simulation mutation inside rendering.

**Acceptance:** deterministic state produces stable visuals; coordinate/hit-test transformations have unit tests.

## U02 — Initial HTML UI

**Depends on:** U00, S02, S03, V01

**Deliverables:**

- Time controls.
- Money/resource display.
- Selected sector/site/facility details.
- Minimal build controls.
- Minimal research list or graph using HTML controls; SVG may draw dependency edges.
- Keyboard focus and modal/panel behavior.

**Acceptance:** normal buttons are keyboard accessible; typing/focus does not trigger map shortcuts; UI updates from events/read-only state without polling every animation frame.

# Phase E: first electricity and contract

## E00 — Iron, copper, and early processing

**Depends on:** V02, C01

**Deliverables:**

- Data definitions for iron ore, iron, copper ore, copper, charcoal, and wire.
- Deposit state, survey estimate, extraction capacity, and finite reserve.
- Mine and simple smelting/wire recipes.
- Unlocks through research definitions.

**Acceptance:** no content ID is hard-coded in generic extraction/recipe logic; deposits cannot yield beyond reserve; recipe tests cover shortages and outputs.

## E01 — Dynamo and electrical production

**Depends on:** E00, V01

**Deliverables:**

- Dynamo definition and construction bill.
- Convert mechanical power to electrical output with content-defined efficiency.
- Keep MW and MWh distinct.
- Electricity not delivered or stored earns no money.

**Acceptance:** conversion reconciles input/output/loss; no timber-only electrical generator exists; tests cover capacity limits and unavailable mechanical input.

## E02 — Primitive grid and town demand

**Depends on:** E01, M00

**Deliverables:**

- Primitive cable and town connection.
- Capacity and simple loss.
- Hourly town demand profile.
- Delivered, unmet, and excess electricity accounting.

**Acceptance:** disconnected output earns nothing; cable congestion and losses reconcile; town demand remains separate from sector state.

## E03 — First electricity contract

**Depends on:** E02

**Deliverables:**

- Fixed-price town contract from data.
- Settlement based on delivered energy.
- Reliability measure, bonus, and shortage penalty.
- Money and contract events with calculation breakdown.

**Acceptance:** tests cover full, partial, zero, and excess delivery; payment calculation is explainable; no power is sold twice.

# Phase T/R: seasons, water, and circular materials

## T00 — Seasons, weather, and forecasts

**Depends on:** E03, F03

**Deliverables:**

- Four-season cycle and deterministic simple weather.
- Climate definitions and normalized seasonal factors.
- Apply factors to wind, forestry, and town demand.
- Forecast API with documented accuracy behavior.

**Acceptance:** seeded weather is reproducible; boundaries between seasons are tested; forecast never mutates actual future state.

## T01 — Water and reservoirs

**Depends on:** T00

**Deliverables:**

- Sector water stock, inflow, evaporation, reserve, and withdrawals.
- Abstract reservoir facility.
- Waterwheel/hydro availability from flow/storage.
- Priority behavior during shortage.

**Acceptance:** water balance reconciles every tick; no generated lake/river terrain; drought and overflow cases are tested.

## R00 — Bills of materials and decommissioning

**Depends on:** E03

**Deliverables:**

- Facility instances retain original/current material composition.
- Refurbish, demolish, careful deconstruction, and abandon semantics needed by MVP.
- Produce typed waste/scrap outputs.

**Acceptance:** recovery never exceeds installed composition; condition/method modifiers are bounded and tested.

## R01 — Recycling and import safety valve

**Depends on:** R00, S02

**Deliverables:**

- Scrap/rubble/e-waste definitions and recycling recipes.
- Less-than-perfect recovery with energy cost.
- Expensive imports for essential resources.
- Clear accounting of extraction, imports, consumption, recovery, and loss.

**Acceptance:** no infinite material loop; imports prevent construction deadlocks; mass/accounting tests pass.

# Phase X/G: frontier and multi-sector game

## X00 — Deterministic sector graph generation

**Depends on:** E03, F03, C01

**Deliverables:**

- Generate connected 8–12 sector graph from a seed.
- Assign centre, biome, sites, deposits, climate, and zero-to-many town placeholders.
- Keep gameplay graph separate from visual layout.
- Viability validator and deterministic fixtures.

**Acceptance:** same seed is identical; graph is connected; empty and multi-town sectors occur in tested seeds; viable opening loop is guaranteed.

## X01 — Exploration, biome permissions, and acquisition

**Depends on:** X00, S03

**Deliverables:**

- Unknown, frontier, explored, surveyed, unlocked, and buildable states.
- Explorer tiers controlling distance from centre.
- Separate data-defined biome exploration, survey, and construction research.
- Itemized acquisition pricing from distance, biome desirability, ease, towns, potential, and scenario modifiers.

**Acceptance:** distant cold construction requires range, cold exploration, payment, and cold construction; invalid transitions are rejected; desirable/easy sectors may cost more while difficult sectors retain operational disadvantages.

## X02 — Town generation and founding

**Depends on:** X01

**Deliverables:**

- Generate zero, one, or multiple independent town instances per sector.
- Found a town at a valid site through an explicit application method.
- Founding cost/time, starting demand, water/power prerequisites, and growth defined by content.
- No internal town-building management.

**Acceptance:** empty sectors remain valid; founded towns are not immediate free profit; town IDs, demand, contracts, and connection limits remain independent.

## G00 — Multi-sector grid and dispatch MVP

**Depends on:** T01, R01, X02

**Deliverables:**

- Sector interconnections, substations, capacity, and loss.
- Automatic deterministic dispatch with simple player-configurable priorities.
- At least one electrical storage type plus reservoir storage.
- Multiple town contracts and congestion accounting.
- Grid/demand/contract calculation breakdowns.

**Acceptance:** generation, storage, delivery, loss, curtailment, and unmet demand reconcile; connection bottlenecks matter; fixed state produces deterministic dispatch; towns remain semi-black-box customers.

# Deferred tasks

Do not delegate these until `G00` is complete and the vertical slice is playtested:

- Broad coal/oil/gas plant catalog
- Modern wind/solar/hydro/geothermal catalog
- Conventional and advanced nuclear branches
- Hydrogen and fusion
- Offshore generation
- Full research graph layout polish
- Advanced industrial customers
- Regional material freight
- Browser worker simulation
- Cloud saves or any server
- Mod/plugin scripting

Each technology family should later be delegated as a data-first task using existing shared generator/fuel/storage behaviors, followed by focused behavior only where the plant cannot be represented by existing capabilities.

## Delegation prompt template

Use this template when assigning a task:

```text
Implement task <TASK ID> from plan/implementation-tasks.md in
C:\Users\RubenSaunders\WebstormProjects\EnergyGame.

Required reading:
- plan/implementation-tasks.md: <task section>
- <specific linked design documents>

Prerequisites <list> are already merged. Verify that before editing.
Implement only the listed deliverables and tests. Preserve all non-negotiable
decisions. Do not redesign adjacent systems, add unrelated dependencies, or
start follow-on tasks.

Before editing, inspect every relevant existing file and trace used symbols.
After editing, run the task's tests plus root lint, test, and build commands,
and obtain editor diagnostics for edited files. Fix failures caused by the
change. Return the required task completion report exactly as documented.
If a requirement conflicts with the repository or is underspecified in a way
that changes architecture/game rules, stop and report the conflict instead of
inventing a solution.
```

## Integration checkpoint after every wave

A coordinating agent or human should verify:

- All prerequisite task branches are merged.
- Root lint, unit tests, type checking/build, and Electron compilation pass.
- Content validation succeeds for bundled definitions.
- Deterministic golden scenarios remain unchanged unless intentionally updated.
- No new dependency crosses the documented direction.
- Public interfaces introduced independently are reconciled before assigning dependants.
- The roadmap and task status are updated.

Do not ask a feature agent to repair unrelated baseline or merge failures. Assign a separate narrowly scoped integration task when necessary.


