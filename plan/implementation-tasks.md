# Delegation-ready implementation tasks

## Purpose

This document breaks implementation into bounded tasks suitable for delegation to agents that should not make broad architectural or design decisions.

It supplements [the implementation roadmap](implementation-roadmap.md). The roadmap defines milestones; this document defines implementable work units, dependencies, constraints, and acceptance criteria.

## Current baseline

EnergyGame contains tested foundation, content, simulation, application-shell, sprite-atlas, rendering, and initial UI modules. Current rendering state:

- `A00` ✅ source sprites, deterministic atlas packer, typed descriptors, explicit category rows, and reservoir-mask helpers.
- `U00` ✅ application canvas, DOM overlay root, frame lifecycle, pause/speed controls, renderer disposal boundary, and keyboard platform layer.
- `U01a` ✅ `AtlasLoader` with injectable image boundary; `WorldAtlasPainter` draws sprites by semantic ID with anchor offset; DPR-aware `resizeBackingBuffer`; atlas error/loading fallbacks.
- `U01b` ✅ `WorldScene` / `SceneCell` immutable scene model; `SceneProjector.projectSectorScene` pure function; `SiteSerialState.templateId` preserves template identity; `TownPresentationLayouts` deterministic town grid positions; 402 tests passing at completion.
- `U01c` ✅ `CanvasRenderer` draws layered biome → ground overlays → entities → facilities using `WorldAtlasPainter`; `Application` eagerly loads bundled content, builds `IndexedCatalog`, and creates the initial `CampaignState` with the centre sector stamped in.
- `U01di` ✅ deterministic reservoir fixture layout in `SceneProjector`; cardinal-mask autotile selection (`reservoir-water-00`…`0f`) for shared join-group neighbors; diagonal-only and cross-group adjacency do not connect.
- `U01dii` ✅ deterministic town-tier fixture support in `SceneProjector`; town sprites resolve to `town-tier-1`…`town-tier-6` from presentation tier state with `town` fallback when tier is absent.
- **Camera core** ✅ `CameraState.ts` pure math (world/screen transforms, zoom-toward-point, clamp helpers, 29 tests); `CanvasRenderer` has scroll-to-zoom (10% step, max 10×), unbounded drag-to-pan in both views, sector detail / campaign map view modes, `M` key toggle, shift+scroll transition to campaign map at `0.5 × fitZoom`, initial zoom at `2 × fitZoom` for immediate panning room.
- **Campaign map placeholder** ✅ dark background with a biome-coloured flat-top hex node, sector name label, and return-hint text; drag-pan is unbounded.
- `U02a-1` ✅ read-only inventory panel (`InventoryPanel`) docked at `#ui-root`'s right edge via a reusable `getDock` helper; icons resolve through `IconResolver`, which crops sprites from the same `world-atlas.png` the canvas loads (no second icon pipeline) and re-exports the atlas descriptors from `@rendering`; unresolvable icons show a dashed "?" placeholder instead of a blank; updates on `tick:after`, not per-frame polling.
- **Inventory popup and cheat quantity editing** ✅ full sortable `InventoryModal` (name / qty ascending / qty descending) opened from the docked panel. While the global `isCheatsEnabled()` flag (`platform/CheatFlags`, live-toggleable from the browser console as `window.cheats.enabled`) is on, each row in the popup only — never the docked card — gets chevron and click-to-edit quantity controls backed by `Application.cheatSetInventoryQuantity`, which publishes an `inventory:changed` event so both the popup and the docked panel refresh immediately instead of waiting for the next tick. Background refreshes patch row values in place rather than re-sorting, so a row can never reorder out from under an in-progress click. See [Development and debug support](code-architecture.md#development-and-debug-support) for the general cheat convention this follows.
- **Starting inventory** ✅ new `lumber` resource added to the `C02` resource catalog (`icon-lumber`, previously an unreferenced atlas sprite); new data-driven `src/simulation/fixtures/initial-inventory.json` seeds a fresh campaign's single company inventory (250 timber, 100 lumber) — loaded by `Application` alongside the centre-map bootstrap, same fixture-driven pattern, with a startup guard that rejects any fixture resourceId unknown to the catalog.
- **Design notes recorded**: mechanical workshop tier progression (`plan/power-plants.md`); camera and navigation model including two view modes and control scheme (`plan/map-and-regions.md`).
- 490 tests passing; 28 test files.

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
16. **Natural-resource ownership:** finite reserves, innate woodland, and water are structured sector state, not spawned resource entities. Player-planted forests are the only separate natural-resource instances.
17. **Extraction boundary:** compatible operational extraction facilities are required to move sector reserves or woodland into inventory; facility capacity never enlarges natural stock.
18. **Forest terminal depletion:** innate woodland grows only while viable and disappears permanently at complete depletion; deliberate planting creates a separate planted-forest instance.
19. **Water conservation:** reservoirs add capture, retention, usable storage, and withdrawal/release capability, never water or an instant fill.
20. **One material inventory:** extraction, harvest, processing, imports, decommissioning, and recycling use exactly one company-wide inventory. There are no sector, warehouse, extractor, or general facility inventories in the current scope.
21. **Recovery is not replenishment:** recycled goods enter company inventory and never increase finite reserves, woodland biomass, or sector water.
22. **Required resource art:** every inventory resource resolves an icon; forest presentation covers freshly planted, growing, mature/full, semi-harvested/sparse, and nearly-empty states, while depleted forests have no sprite.

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
✅ B00 baseline verification
 └─ ✅ B01 tooling reliability
     └─ ✅ F00 source boundaries
         ├─ ✅ F01 event bus
         ├─ ✅ F02 units and IDs
          ├─ ✅ F03 deterministic random
          └─ ✅ C00 content structural validation
              └─ ✅ C01 content catalog and semantic validation
                  └─ C02 natural-resource and inventory presentation schema

F01 + F02 + F03 + C01
 └─ ✅ S00 fixed simulation clock
     └─ ✅ S01 campaign state and event history
         ├─ ✅ S02 inventory and recipe execution
         ├─ ✅ S03 research progression
         └─ ✅ M00 hand-authored centre sector

S02 + S03 + M00 + C02 + A01
 └─ V00 forestry and timber
     └─ V01 mechanical power
         └─ V02 first headless vertical slice
             ├─ P00 save/load
             └─ E00 iron/copper extraction and processing

F00
 └─ ✅ A00 sprite-atlas pipeline
     ├─ A01 forest lifecycle and inventory-icon assets (+ C02)
     └─ ✅ U00 browser application shell
         ├─ ✅ U01a atlas/canvas drawing foundation
         │   └─ ✅ U01b read-only world scene (+ M00)
         │       └─ ✅ U01c layered centre-sector composition
         │           │   (camera core also complete — see U01e note below)
         │           └─ ✅ U01di reservoir visual variants
         │               └─ ✅ U01dii town visual variants
         │                   └─ U01e (remainder) interaction rendering (+ U02)
         │                       └─ U02a-4 sector site/facility detail (shelved, + U02)
         └─ U02a read-only HTML panels (+ S02 + S03 + C02 + M00)
             ├─ ✅ U02a-1 inventory panel
             ├─ U02a-2 sector natural-resource summary panel
             └─ U02a-3 research panel
                 └─ U02 build controls + research assignment (+ V01 + A01)

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

## ✅ B00 — Verify and record baseline

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

## ✅ B01 — Make tooling reliable

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

## ✅ F00 — Establish source boundaries

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

## ✅ F01 — Implement the central type-safe event bus

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

## ✅ F02 — Define canonical units and runtime IDs

**Depends on:** F00

**Deliverables:**

- Document and implement canonical internal units for simulation hours, money, mechanical power, electrical power, energy, material quantities, and water.
- Add stable runtime ID types/generation for sectors, towns, sites, facilities, contracts, and construction jobs.
- Keep display formatting separate.

**Acceptance:**

- Unit conversion and ID uniqueness tests pass.
- Simulation types do not contain display abbreviations such as `kW` strings.

## ✅ F03 — Deterministic random source

**Depends on:** F00

**Deliverables:**

- Seeded random abstraction suitable for campaign and weather generation.
- Ability to reproduce a sequence from seed/state.
- Save-compatible state if random consumption continues during a campaign.

**Tests:** same seed produces same sequence; different seed differs; serialization/restoration continues the sequence.

# Phase C: data-driven content

## ✅ C00 — Structural content validation

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

## ✅ C01 — Indexed catalog and semantic validation

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

## C02 — Natural-resource and inventory presentation schema

**Depends on:** C01

**Read:** `plan/resources-and-recycling.md`, `plan/map-and-regions.md`, `plan/data-driven-content.md`, `plan/sprites-and-atlases.md`

**Deliverables:**

- Extend resource definitions with a mandatory icon ID for every company-inventory resource and migrate all fixtures.
- Define validated sector state shapes for finite reserve/endowment records, innate woodland, and local water without introducing deposit entities or IDs.
- Define player-planted forest content/runtime shapes as the only separate natural-resource instances.
- Define typed extraction-facility compatibility with sector reserve, woodland, or water source kinds.
- Validate one-company-inventory semantics; do not add warehouse, sector, extractor, or general facility inventories.
- Add cross-catalog reports for inventory-icon coverage and reserve-to-extractor coverage.

**Acceptance:**

- Every inventory resource resolves a known icon and a missing icon produces a precise validation issue.
- Every extractable reserve type has a compatible facility path.
- Natural reserve records are addressable by sector ID and resource ID with no deposit runtime ID.
- Recycling outputs can reference inventory resources only and cannot target natural sector state.
- Existing opening content is migrated and all structural/semantic validation tests pass.

# Phase S: headless simulation foundation

## ✅ S00 — Fixed simulation clock

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

## ✅ S01 — Serializable campaign state and event history

**Depends on:** S00, F02, F03, C01

**Deliverables:**

- Minimal campaign state containing version, seed/random state, time, money, one company-wide inventory, research state, sectors, towns, facilities, and contracts.
- Read-only access boundary for presentation.
- Bounded history of meaningful typed events.
- No Canvas, DOM, callbacks, subscriptions, or duplicated definitions in state.

**Acceptance:**

- State can be serialized to plain data.
- Content definitions remain external and are referenced by ID.
- History does not grow without bound.

## ✅ S02 — Inventory and recipe execution

**Depends on:** S01

**Deliverables:**

- Company-wide resource inventory.
- Validated add/remove/query operations.
- Atomic recipe execution: consume all required inputs or change nothing.
- Power/time requirements may be represented but only enforce those needed by the opening slice.
- Meaningful inventory/recipe events.
- No sector, warehouse, extractor, or general facility inventory is introduced.

**Tests:** insufficient inputs, exact inputs, surplus inputs, outputs/by-products, nonnegative invariants, repeated execution, conservation expectations.

## ✅ S03 — Research progression

**Depends on:** S01, C01

**Deliverables:**

- Track completed, available, blocked, and in-progress research.
- Enforce prerequisites and costs from content.
- Accept research points directed at a named node each tick; multiple nodes may progress simultaneously.
- Publish completion/unlock events.
- Do not hard-code research IDs in progression logic.

**Assignment model:**

Each research facility independently assigns its output to a target node. The `ResearchManager` receives `addPoints(nodeId, points)` calls and does not impose a single global active node. Assignment state (which facility targets which node) lives in facility state, not in `ResearchManager`. A UI global-override shortcut will set all facilities to the same node at once; this is a presentation-layer action handled in the UI step (see U02).

**Tests:** prerequisites, unavailable target, progress, completion, duplicate completion prevention, unlock recalculation, simultaneous multi-node progress, serialization round-trip.

# Phase M/V: first headless vertical slice

## ✅ M00 — Hand-authored centre sector

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

**Follow-up:** C02 and V00 migrate the baseline forest-site fixture to sector-owned innate woodland plus a separate forestry-facility placement opportunity.

## V00 — Forestry and timber

**Depends on:** S02, M00, C02, A01

**Read:** `plan/resources-and-recycling.md`, `plan/seasons-demand-and-water.md`

**Deliverables:**

- Sector-owned innate woodland current/max biomass, viability, and growth.
- Migration of the M00 forest-site fixture and existing forest rendering to the agreed sector-state model.
- Forestry operation selecting and harvesting innate woodland or a player-planted forest into the single company inventory.
- Player planting that creates the only separate natural-resource instance, with age, current/max biomass, condition, and lifecycle state.
- Sustainable and over-harvest behavior.
- Relevant events and forecast values.
- Use a simple constant growth factor until seasons are implemented.
- Presentation-facing states for freshly planted, growing, mature/full, semi-harvested/sparse, nearly empty, and depleted/absent woodland.

**Acceptance:**

- Forest cannot produce more biomass than exists.
- Viable woodland grows without exceeding capacity; zero/nonviable innate woodland does not regrow.
- Complete innate-woodland depletion removes its visual and requires deliberate planting to restore forest cover.
- Planted forests transition through every lifecycle state and disappear when depleted.
- Both source types feed the same company inventory, and no generic natural-resource entity is introduced.
- Long-run sustainable, partial-harvest, clear-cut, depletion, and replanting cases are tested.

## V01 — Mechanical power network

**Depends on:** V00, S02

**Read:** waterwheel adjacency rule in `plan/power-plants.md`

**Deliverables:**

- Site-local mechanical generation and consumption pool.
- Waterwheel consumes construction resources and provides mechanical capacity.
- **Waterwheel water adjacency:** a waterwheel produces mechanical power only when at least one of its four cardinal grid neighbours is a reservoir water cell belonging to the same sector. If the adjacency is absent (drained or removed reservoir), output is zero. This is a tick-level check against sector water-cell state, not a placement constraint.
- Mechanical workshop requests capacity and reduces operation proportionally or stops when unavailable, according to the content behavior.
- No shaft geometry or canvas dependency.

**Acceptance:**

- Supply, demand, shortage, and unused capacity reconcile each tick.
- Mechanical power is distinct from electrical power and energy.
- A waterwheel with no adjacent water cell produces zero output each tick.
- A waterwheel with at least one adjacent water cell produces its rated capacity (subject to flow factors added in T01).

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

## ✅ U00 — Browser application shell

**Depends on:** A00, F00

**Read:** UI sections of `plan/code-architecture.md`

**Deliverables:**

- Replace placeholder splash with application canvas and DOM overlay roots.
- Wire application lifecycle, simulation clock, and event-driven UI invalidation.
- UI invokes explicit typed application methods; do not create a command bus.
- Do not migrate `fox-game` canvas popup/display libraries.

**Acceptance:** application starts, pauses, resumes, and disposes without duplicate subscriptions; HTML controls can coexist with canvas pointer handling.

## ✅ A00 — Initial sprite-atlas pipeline

**Depends on:** F00

**Read:** `plan/sprites-and-atlases.md`

**Deliverables:**

- Individual named source sprites for the initial centre-sector slice: opaque biome backgrounds; transparent forest, town-tier, reservoir, and facility overlays; and no generic/waterwheel site placeholders.
- Deterministic script that validates and packs sources into a building/world atlas.
- Explicit, validated atlas rows for biome backgrounds, reservoir autotiles, world/entity overlays, and structures.
- Generated TypeScript descriptor containing semantic sprite IDs, source rectangles, anchors, and visual bounds.
- Atlas padding and maximum-size checks.
- Stale-output verification mode suitable for build/CI.
- One one-cell and one multi-cell/overhanging test asset.

**Non-goals:** handwritten atlas JSON, animation, arbitrary rotation, modular cable art, or multiple atlas pages unless required by source-size limits.

**Acceptance:**

- Same inputs produce byte/structurally identical placement and descriptors.
- Duplicate IDs, missing sources, incomplete/oversized explicit rows, out-of-bounds rectangles, and stale generated output fail clearly.
- Gameplay footprint remains in facility content; simulation imports no atlas or sprite types.

## A01 — Forest lifecycle and inventory-icon assets

**Depends on:** A00, C02

**Read:** natural-resource visual-state and inventory-icon sections of `plan/sprites-and-atlases.md`

**Deliverables:**

- Add mature/full, semi-harvested/sparse, and nearly-empty innate-woodland source sprites.
- Add freshly planted, growing, mature/full, semi-harvested/sparse, and nearly-empty planted-forest source sprites.
- Do not add a depleted forest sprite; depletion is represented by absence.
- Add a stable icon asset and visual-catalog entry for every current inventory resource.
- Pack world sprites through the existing deterministic pipeline and provide deterministic icon resolution whether icons use an atlas or individual SVGs.

**Acceptance:** every required forest state and inventory resource resolves a stable visual ID; missing, duplicate, stale, or unreferenced assets fail clearly; forest overlays preserve biome transparency; resource icons remain legible at inventory-row size; asset generation/check mode and relevant visual tests pass.

## U01a — Atlas and canvas drawing foundation

**Depends on:** U00, A00

**Read:** `plan/sprites-and-atlases.md`, rendering section of `plan/code-architecture.md`

**Deliverables:**

- Load and decode the generated world atlas once, with explicit ready/error state and an injectable image boundary for tests.
- Draw a semantic sprite ID by resolving its generated source rectangle, destination size, and anchor; callers never supply atlas coordinates.
- Disable image smoothing and preserve integer source rectangles and pixel-aligned destination coordinates at integer zoom levels.
- Resize the canvas backing buffer for CSS size and device pixel ratio without changing logical world coordinates.
- Redraw when the atlas becomes ready and when relevant presentation state or viewport size changes; do not depend solely on simulation ticks.
- Draw a visible development fallback for missing sprite IDs or atlas-load failure.

**Acceptance:** unit tests verify source/destination rectangles, anchors, DPR resize behavior, smoothing state, one-time loading, redraw invalidation, and failure handling; no simulation type imports DOM/image types.

## U01b — Read-only world render scene

**Depends on:** U01a, M00

**Read:** `plan/map-and-regions.md`, rendering and generation sections of `plan/code-architecture.md`

**Deliverables:**

- Define a renderer-facing immutable scene/read-model containing logical cell positions, biome visual IDs, persistent resource/entity visuals, facilities, and optional transient overlays.
- Build the centre-sector scene deterministically from read-only campaign state, indexed content definitions, and presentation layout data.
- Preserve or expose stable site-template/layout identity at the generation/application boundary where needed; do not match runtime sites to templates by array position.
- Place towns through a deterministic presentation layout because town simulation state intentionally has no street/building coordinates.
- Keep canvas pixels, camera state, atlas rectangles, decoded images, and caches out of simulation and save data.
- Emit a forest visual for standing forest, but no visual command for empty `general-site` or `waterwheel-site` suitability.

**Acceptance:** equal semantic input produces deeply equal scene commands; shuffled collection iteration does not alter output; missing definitions/layout identity fail visibly in development; projection does not mutate campaign state or content.

**Follow-up:** V00 extends the scene projection to distinguish innate sector woodland from planted-forest instances, select each lifecycle sprite, omit terminally depleted forest visuals, and avoid visuals for empty forestry-placement opportunities.

## U01c — Layered centre-sector composition

**Depends on:** U01b

**Read:** `plan/sprites-and-atlases.md`

**Deliverables:**

- Replace the solid-color renderer with scene composition in canonical order: opaque biome backgrounds; reservoir/ground overlays; persistent resources and towns; facilities; transient interaction graphics.
- Preserve the biome through transparent object sprites and render the waterwheel's local river/bank as part of that built facility visual.
- Align one-cell, multi-cell, and overhanging sprites using logical cells, content footprints, and generated anchors.
- Use deterministic layer, base-row/anchor-row, and stable-ID tie-breakers.
- Render a facility only when an instance or explicit under-construction state exists; suitability tags alone never create building art.

**Acceptance:** a deterministic centre-sector fixture shows the temperate background, forest, town, one-cell waterwheel, and two-cell workshop in the intended order; draw-command tests verify ordering and anchors; transparent areas reveal the biome; no placeholder site art appears.

## ✅ U01di — Reservoir visual variants

**Depends on:** U01c

**Read:** reservoir section of `plan/sprites-and-atlases.md`

**Deliverables:**

- Select `reservoir-water-00` through `reservoir-water-0f` from north/east/south/west neighbors in the same visual join group.
- Ignore diagonal-only contact and never join distinct reservoirs merely because cells touch.
- Use deterministic rendering fixtures until water extent is supplied by gameplay; do not add fake production simulation state to demonstrate art.

**Acceptance:** all 16 reservoir autotile masks render at correct positions with matching shared edges; distinct join groups and diagonal-only contacts remain disconnected; visual reservoir area does not determine capacity or connectivity.

## ✅ U01dii — Town visual variants

**Depends on:** U01di

**Read:** visual tiers in `plan/towns-and-contracts.md`

**Deliverables:**

- Select `town-tier-1` through `town-tier-6` from presentation growth state and use `town` when no tier can be resolved.
- Use deterministic rendering fixtures until town growth is supplied by gameplay; do not add fake production simulation state to demonstrate art.

**Acceptance:** each of the six tier sprites and the fallback `town` sprite is exercised by a fixture; tier selection is driven only by presentation state, not simulation internals; rendering remains deterministic for equal scene state.

## U01e — Camera and interaction rendering

**Depends on:** U01dii, U02

**Read:** construction-mode and anchoring sections of `plan/sprites-and-atlases.md`, camera and navigation section of `plan/map-and-regions.md`

**Camera core — already complete (implemented alongside U01c):**

- `CameraState.ts` pure math module: `getMinZoom`, `clampZoom`, `clampPan` (with sector-centering when smaller than viewport), `zoomTowardPoint`, `screenToWorld`, `worldToScreen`; 29 unit tests.
- `CanvasRenderer` two view modes on one canvas: sector detail and campaign map placeholder.
- Scroll-to-zoom toward cursor (10% per step, max 10×, lower bound `0.5 × fitZoom`).
- Unbounded drag-to-pan in both sector and campaign map views; `event.preventDefault()` prevents browser native drag from swallowing `mousemove` events.
- `M` key toggles between views; guard prevents firing when keyboard focus is inside a text input, `<select>`, contenteditable, or dialog.
- Shift+scroll-out at minimum zoom → campaign map view; shift+scroll-in in campaign map → sector view; click in campaign map → sector view.
- Initial zoom at `2 × fitZoom` so there is immediate panning room on first load.
- Campaign map placeholder: dark background, biome-coloured flat-top hex node, sector name, return-hint text; drag-pans the hex.

**Remaining deliverables (depends on U02 placement API):**

- Spatial hit testing: screen → world → cell, resize-safe, unit tested across zoom/DPR values.
- Selection rendering: highlight the selected object's gameplay footprint (not sprite opaque bounds).
- Placement footprint preview: accept eligible cells/footprints from a typed application placement query; draw a faint construction-suitability outline only while construction mode is active.
- Highlight updates: re-evaluate when facility choice, rotation, ownership, occupancy, research/biome access, or placement state changes.
- Renderer never calculates or mutates placement eligibility.

**Acceptance (remaining):** transform round trips and hit tests are unit tested across zoom/DPR values; highlights align to gameplay footprints, update with eligibility, and disappear on mode exit; invalid cells are not highlighted; rendering remains deterministic for equal scene and viewport state.

## U02a — Read-only HTML panels

Time controls already exist (`UiShell`). The remaining read-only portions of `U02` do not
require `V01` or `A01`: the current two inventory resources already have real icons (from
`A00`), and inventory/sector/research state is already readable through `Application`. What
they cannot do without further work is let the player build anything — there is no typed
application method yet to place a facility at a site and consume its construction cost, and
no facility-state field recording which research node a facility targets. That capability is
not currently its own task anywhere in this plan; `U02`'s remaining build-control and
research-assignment deliverables stay blocked on it rather than on `V01`/`A01`.

`U02a` is split into independent sub-tasks so each panel can be implemented and reviewed on its
own. `U02a-1`, `U02a-2`, and `U02a-3` may be done in any order; none depends on the others.
`U02a-4` is a fourth sub-task, shelved until later — see its card for why.

### U02a-1 — Inventory panel

**Depends on:** U00, S02, C02

**Deliverables:**

- One HTML panel listing every non-zero company-inventory resource: resolved icon, label,
  quantity, and unit per row.
- Icons resolve through the existing world atlas (the same sheet the canvas already loads) via
  a small UI-layer icon-resolution helper; no second icon-loading pipeline.
- A missing/unresolvable icon shows a clear visual placeholder, never a blank.
- Localized labels are deferred — no localization catalog exists yet; a readable placeholder
  derived from the resource ID is acceptable until one does.

**Acceptance:** panel updates from campaign-state/events, not per-animation-frame polling; every
current inventory resource (`timber`, `wood-waste`) renders its real icon; an unresolvable
iconId is visibly flagged rather than silently blank; no warehouse or sector-inventory panel is
introduced.

### U02a-2 — Sector natural-resource summary panel

**Read:** `plan/resources-and-recycling.md` (sector reserve, innate woodland, and water
sections), `plan/map-and-regions.md` (sector natural-state fields)

**Depends on:** U00, C02, M00

This panel shows the sector's *natural* quantities — structured sector state such as
`SectorNaturalState.innateWoodlandBiomassKg`, `waterStockM3`, and `reserves` — never the
company-wide inventory. It is a distinct, separately owned pool from `U02a-1`'s inventory panel:
per the plan's one-material-inventory decision, natural stock never enters inventory except
through a compatible extraction/forestry facility. Do not merge this with `U02a-1` or read from
`CampaignState.inventory`.

**Deliverables:**

- Read-only summary of the (currently single) sector's natural quantities: innate woodland
  biomass (and viability, if the sector has woodland), local water stock, and known finite
  sector reserves (remaining quantity and survey confidence) keyed by resource type.
- A reserve resource the sector does not have is omitted, not shown as zero.
- Survey uncertainty is visibly distinguished from a confirmed reading — see the survey-related
  fields on `SectorReserveRuntimeState`.
- No site list, no per-site selection, and no facility detail — that scope moved to `U02a-4`,
  shelved for now (see its card for why).

**Acceptance:** panel reflects real `CampaignState` sector-natural fields, not fixture-only
data or the company inventory; updates from events/read-only state, not polling; unsurveyed
reserves are visually distinguished from surveyed ones; no facility, site, or inventory data
appears on this panel.

### U02a-3 — Research panel

**Depends on:** U00, S03

**Deliverables:**

- Read-only list of research nodes (grouped by era), each showing completed / available /
  locked status derived from `state.research` and the node's prerequisites.
- In-progress nodes show accumulated progress against their cost.
- No per-facility assignment control and no global-assignment shortcut — both require
  facility-state that does not exist yet (see above) and remain with `U02`.

**Acceptance:** status classification matches `ResearchManager`'s own prerequisite rules with no
duplicated/hard-coded node IDs; panel updates from events/read-only state, not polling.

### U02a-4 — Sector site and facility detail (shelved)

**Status:** shelved. Do not start until `U01e` (remainder) and `U02` exist.

**Why shelved:** an earlier draft of this scope lived inside `U02a-2` and gave the site list its
own DOM-only "selected site" state, explicitly isolated from canvas/camera state. But `U01e`'s
remaining deliverables build a *second*, canvas-driven selected-site concept for hit testing and
highlight rendering, feeding `U02`'s placement queries. Building the panel-only selection first
would create two disconnected trackers for the same fact — clicking a site on the map would not
update the panel, and selecting it in the panel would not highlight or pan to it on the map —
which is the ownership-clarity problem `plan/code-architecture.md` warns against. This task
waits until `U01e`/`U02` land a shared "selected site" concept so this panel can read it instead
of inventing its own.

**Depends on:** U01e (remainder), U02, C02, M00

**Deliverables (once unblocked):**

- Sector name, biome, access state, and distance.
- A list of the sector's sites.
- Selecting a site — through the shared selection mechanism `U01e`/`U02` introduce, not a
  panel-private one — shows its tags and, if a facility exists there, the facility's definition
  details; otherwise a clear "no facility built" state.
- No build/placement controls — this panel remains display-only.

**Acceptance:** site selection reads from the shared selected-site state `U01e`/`U02`
introduced, not a tracker private to this panel; selecting a site on the canvas is reflected
here and selecting it here is reflected on the canvas; normal controls remain keyboard
accessible; panel reflects real `CampaignState`, not fixture-only data; no facility can be
created or modified from this panel.

## U02 — Build controls and research assignment

**Depends on:** U02a, V01, A01

**Deliverables:**

- Minimal build controls: select a facility and a valid site, trigger construction. Requires a
  new typed application construction capability (site placement + inventory consumption) that
  is not yet designed anywhere in this plan; scope that capability before implementing this UI.
- Per-facility research assignment control (select which node a workshop targets). Requires the
  facility-state assignment field described in `S03`'s assignment model, which does not exist
  in `FacilitySerialState` yet.
- Global research assignment shortcut: reassign all facilities to the same node in one action;
  implemented as a UI iteration over facility assignments, not a change to `ResearchManager`.
- Keyboard focus and modal/panel behavior for any new dialogs this introduces.

**Acceptance:** normal buttons are keyboard accessible; typing/focus does not trigger map
shortcuts; UI updates from events/read-only state without polling every animation frame; no
warehouse or sector-inventory panel exists; construction cannot bypass the single company
inventory or create a facility without a valid site.

# Phase E: first electricity and contract

## E00 — Iron, copper, and early processing

**Depends on:** V02, C02

**Deliverables:**

- Data definitions for iron ore, iron, copper ore, copper, charcoal, and wire.
- Iron and copper finite reserve/endowment records inside sector state, including survey knowledge and remaining quantity.
- Mine facility state with compatible source selection and extraction capacity; no deposit entity or runtime deposit ID.
- Extraction behavior that moves ore into company inventory, plus simple smelting/wire recipes.
- Unlocks through research definitions.

**Acceptance:** no content ID is hard-coded in generic extraction/recipe logic; extraction requires an operational compatible mine; extraction cannot exceed the selected sector reserve, reaches exactly zero without becoming negative, and stops at exhaustion; recycled iron/copper never changes sector reserves; deterministic generation and serialization preserve reserve records; recipe tests cover shortages and outputs.

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

- Sector-local water stock, rainfall/inflow, baseline capture, retention, evaporation, environmental reserve, withdrawals, releases, and spill.
- Abstract reservoir facility adding finite capture, retention/effective recharge, usable storage, and withdrawal/release capacity.
- Waterwheel/hydro availability from flow/storage.
- Priority behavior during shortage.
- Presentation-facing reservoir extent/join-group state where needed for autotile selection; this state must not calculate or override capacity or water balance.

**Acceptance:** water balance reconciles every tick; construction alone leaves water unchanged; a reservoir starts empty unless initial water is explicitly accounted and otherwise fills only from later captured inflow; captured water never exceeds available inflow or storage capacity; withdrawal is rate/capacity limited; no generated lake/river terrain; visual reservoir shape does not determine storage or connectivity; rainy-season fill, drought, empty, evaporation, and overflow/spill cases are tested.

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
- All recovered goods enter the same company inventory used by extraction and processing; do not add warehouse inventories.

**Acceptance:** no infinite material loop; imports prevent construction deadlocks; mass/accounting tests pass; recovery never modifies geological reserves, innate woodland, planted-forest biomass, or sector water; reports distinguish fresh extraction, imports, and recovery.

# Phase X/G: frontier and multi-sector game

## X00 — Deterministic sector graph generation

**Depends on:** E03, F03, C01

**Deliverables:**

- Generate connected 8–12 sector graph from a seed.
- Assign centre, biome, placement sites, structured finite-reserve/endowment records, innate woodland viability, sector-water parameters, and zero-to-many town placeholders.
- Create optional planted forests as the only separate natural-resource instances; never create deposit entities or deposit IDs.
- Keep gameplay graph separate from visual layout.
- Viability validator and deterministic fixtures.

**Acceptance:** same seed produces identical reserve, woodland, and water records; graph is connected; empty and multi-town sectors occur in tested seeds; generated natural reserves have no runtime entity IDs; required reserves have reachable compatible extraction paths; viable woodland or a planting path and useful water-access routes are guaranteed.

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
- At least one electrical storage type plus reservoir hydro using accounted sector water and reservoir capture/retention semantics.
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


