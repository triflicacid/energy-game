# Code architecture and organization

## Purpose

This document outlines structural principles for EnergyGame without fixing detailed APIs or implementation choices prematurely.

The architecture should support:

- A deterministic energy simulation
- Event-driven coordination through a central type-safe event bus
- Data-driven resources, recipes, facilities, upgrades, research, sectors, towns, seasons, and contracts
- A canvas-rendered spatial map
- HTML/CSS information panels and dialogs
- Save/load and future content migration
- Isolated testing of simulation behavior
- Incremental delivery from the timber/mechanical era onward

## Core principles

### Separate content, state, simulation, and presentation

These are different concerns:

- **Content definitions** describe what can exist.
- **Runtime state** records what exists in one campaign.
- **Simulation logic** advances that state according to definitions.
- **Presentation** displays state and invokes explicit application operations.

A power-plant definition contains its construction requirements, behavior, and available upgrades. A particular plant instance contains its sector, condition, current output, installed upgrades, and maintenance state.

### Keep the simulation independent of the browser

Core simulation code must not depend on:

- Canvas or rendering contexts
- HTML elements or CSS
- Mouse and keyboard events
- Sprite or icon names
- Browser storage
- Animation-frame timing

This permits deterministic tests, headless balance simulations, save validation, and potential worker execution.

### Prefer explicit dependencies

Construct major services at application startup and pass dependencies explicitly. Avoid hidden singletons, mutable browser globals, and registration through import side effects.

A small application composition root is desirable. It should connect objects and manage lifecycle, not contain game rules.

### Keep ownership clear

Each piece of mutable state should have an obvious owner. Avoid a single object that simultaneously owns simulation, rendering, UI, persistence, and debugging.

### Coordinate through typed events

The system is large enough that unrelated subsystems should not require direct references to one another. A central event bus publishes facts with typed payloads to every listener registered for that event type.

Events reduce coupling, but do not replace clear state ownership or explicit application operations.

### Build for replacement, not speculation

Use boundaries where the game already needs them. Do not add generic buses, plugin systems, scripting languages, or micro-packages without a concrete use.

## Suggested top-level organization

The exact names may evolve, but responsibilities should remain recognizable:

```text
src/
  application/       Startup, lifecycle, and application-facing operations
  content/           Loading, validating, and indexing data definitions
  simulation/        Runtime state and deterministic game systems
  generation/        Seeded sector, town, site, deposit, and weather generation
  rendering/         Canvas map, camera, spatial hit testing, and visual effects
  ui/                HTML/CSS panels, dialogs, tooltips, and research display
  persistence/       Save encoding, loading, versioning, and migrations
  platform/          Browser/Electron integration and storage adapters
  shared/            Small domain-neutral types and utilities
```

Tests should normally be colocated with the code they exercise. Browser integration and visual tests may live in dedicated test directories.

## Application layer

The application layer is the boundary used by the UI and host environment.

Responsibilities:

- Construct the content catalog and simulation
- Start, stop, pause, and dispose of the application
- Load or create campaigns
- Expose explicit typed operations such as building, researching, accepting a contract, or installing an upgrade
- Publish read-only state changes for presentation through the event bus
- Coordinate saves and application settings

There is no generic UI command bus. UI controls call ordinary typed application methods. Those methods validate the requested operation and delegate to the relevant simulation behavior.

The UI must not mutate runtime state directly.

## Central event bus

The application owns one central event-bus instance and supplies it to systems and services that publish or observe events.

The bus supports:

- Registering a listener for a specific event type
- Publishing an event type with its required payload
- Notifying all current listeners for that type
- Returning an unsubscribe function or subscription handle
- Optional one-time subscriptions where useful
- Disposing all subscriptions when a campaign/application is torn down

### Type safety

An event map associates every event name with exactly one payload type. Generic publish and subscribe APIs derive their accepted payload/listener type from that map.

The compiler must reject:

- Unknown event names
- Publishing the wrong payload for an event
- Listeners expecting an incompatible payload
- Omitting a required payload

Payloads should be immutable values or read-only snapshots. Do not use an event payload as a mutable back door into simulation state.

### Event meaning

Events describe facts that have occurred, for example:

- Simulation tick completed
- Season or weather changed
- Research completed
- Facility construction completed
- Facility output or condition changed materially
- Contract accepted, fulfilled, breached, or expired
- Deposit entered decline or was exhausted
- Reservoir crossed a warning threshold
- Town was founded or demand changed
- Inventory or money changed

Use past-tense or otherwise fact-oriented names. User intentions such as building a facility still enter through explicit application methods, not through UI command events.

### Delivery semantics

Delivery behavior must be documented and deterministic:

- Events are delivered to all listeners for their exact type.
- Listener ordering must not be relied upon for correctness. If one operation requires an ordered sequence, it belongs inside a coordinating system or method.
- Events produced while handling another event should be queued and drained in a defined order rather than causing uncontrolled recursive publication.
- The simulation should flush its event queue at defined points in a tick so tests and save behavior remain reproducible.
- One failing listener must follow an explicit error policy and must not silently prevent unrelated listeners from being notified.

The first implementation may deliver synchronously while still using a queue to prevent re-entrant recursion. Asynchronous external work should publish a later completion/failure event rather than make ordinary event delivery nondeterministic.

### Avoiding event-driven ambiguity

The event bus is not the owner of state and should not become a hidden workflow engine.

- The publishing system completes its own state mutation before publishing the fact.
- A system may react to an event when the dependency is genuinely cross-cutting or decoupled.
- Direct method calls remain preferable inside one cohesive operation.
- Critical business logic must not depend on undocumented listener-registration order.
- Avoid publishing an event for every tiny numeric change; publish meaningful changes or batch summaries where appropriate.
- High-frequency presentation data can be read from a view/state snapshot after a tick-completed event rather than flooding the bus with per-value events.

### Typical listeners

- Simulation systems reacting to meaningful cross-system facts
- Contract, achievement, tutorial, and scenario progression
- History and notification logs
- Autosave scheduling
- Audio and visual effects
- HTML UI invalidation
- Canvas-render cache invalidation
- Development diagnostics and telemetry

## Content layer

### Definition catalogs

Game content lives in JSON or equivalent data files grouped by concern, including:

- Resource and waste types
- Recipes
- Facility and generator types
- Extraction and storage types
- Upgrades and retrofits
- Research nodes
- Sector, site, climate, and town archetypes
- Demand profiles
- Contract templates
- Seasonal and weather profiles

Definitions use stable string IDs for references.

### Loading stages

Content loading should follow a clear pipeline:

1. Parse source data.
2. Validate individual structures.
3. Validate references between catalogs.
4. Validate global rules such as research acyclicity and starting-resource viability.
5. Normalize definitions into immutable indexed catalogs.
6. Make the validated catalog available to campaign generation and simulation.

Simulation code should not repeatedly parse or reinterpret raw JSON.

### Behavior without embedded scripts

Data describes values, relationships, tags, and behavior categories. Reusable complex behavior remains implemented and tested in TypeScript.

For example, several generator definitions can reference a shared variable-renewable behavior while providing different capacity, response, and upgrade data.

Do not place arbitrary executable expressions or scripts in content files.

### No field registry

A generic runtime field registry is unnecessary.

- Balance and progression values belong in validated content definitions.
- Campaign values belong in typed runtime state.
- User preferences belong in a settings model.
- Development actions belong in explicit debug tooling.

Optional development hot reload should reload and revalidate content rather than permit arbitrary property mutation.

## Simulation layer

### Fixed simulation time

Simulation time must be independent of rendering frame rate.

A fixed game interval, likely representing an in-game hour initially, advances:

- Seasons and weather
- Water and forest growth
- Town demand
- Generation and storage
- Grid delivery
- Contracts and money
- Extraction and processing
- Construction and research
- Condition, maintenance, and decommissioning

Rendering may run frequently while simulation is paused or accelerated. Large elapsed periods should be processed through deterministic bounded steps or safe aggregation rather than one enormous variable delta.

### State

Runtime campaign state should be serializable and contain IDs plus changing values, not browser objects or copied content definitions.

Broad state areas include:

- Clock and weather
- Sectors, sites, and deposits
- Towns and contracts
- Facility instances
- Electrical and mechanical networks
- Resource inventories and waste
- Water and forestry stocks
- Research and unlock progress
- Construction and maintenance work
- Money and performance history

### Systems

Simulation behavior should be divided by responsibility rather than concentrated in one world class. Likely areas include:

- Seasonal/weather progression
- Demand calculation
- Resource extraction and production
- Forestry and water
- Plant availability and generation
- Storage and electrical delivery
- Contract settlement and economy
- Research and construction
- Maintenance, decommissioning, and recycling
- Town founding and growth

The exact class/function decomposition should follow implementation experience. The important constraint is that each area has explicit inputs, outputs, and tests.

### Determinism

Given the same:

- Content version
- Initial state
- Random seed
- Application operations
- Tick sequence

The simulation should produce the same result. Randomness must come through an explicit seeded source rather than global random calls.

### Events and history

Simulation systems publish meaningful outcomes through the central event bus. History, achievements, scenarios, notifications, UI, rendering caches, and debugging may independently subscribe without those concerns being embedded in simulation systems.

## Generation layer

Campaign generation works with sectors rather than realistic terrain.

Responsibilities:

- Create a connected sector graph
- Assign climate and renewable profiles
- Generate zero or more towns per sector
- Include deliberately empty sectors and occasional multi-town sectors
- Place typed sites and deposits
- Create initial connections and import access
- Validate that the generated campaign has a viable progression path

Generation output is semantic game data. It must not contain canvas coordinates or sprite IDs beyond optional presentation hints.

The visual map layout can be generated separately from gameplay content so presentation changes do not alter campaign rules.

## Rendering layer

The canvas renders the spatial game world:

- Sector shapes and borders
- Towns and sites
- Facilities and construction
- Transmission connections
- Selection and placement previews
- Weather and seasonal effects
- Grid-flow and resource overlays

Rendering reads state but does not advance the simulation or modify it.

Spatial selection and camera movement may live near rendering because they depend on screen/world coordinates. A selected object is then exposed to the application/UI layer by stable runtime ID.

Static or expensive visual layers may use offscreen caches. Cache invalidation should follow state changes rather than redraw everything unconditionally.

## HTML/CSS UI layer

HTML and CSS should provide:

- Status and resource displays
- Build and upgrade panels
- Facility, town, sector, and contract details
- Research progression
- Forecasts and historical charts
- Settings, help, confirmations, and debug tools
- Tooltips and notifications

The canvas remains visible beneath or beside these elements.

### Overlays and dialogs

Use standard DOM controls and accessible dialog/panel patterns. The UI layer coordinates:

- Focus and keyboard handling
- Whether a modal blocks map interaction
- Whether a particular view pauses the simulation
- Pointer-event pass-through outside active panels

### Research display

The research graph does not need to be rendered into the main game canvas.

A suitable hybrid is:

- HTML elements or buttons for research nodes
- SVG lines for prerequisite edges
- A transformed viewport for pan and zoom
- HTML details/tooltips for costs, effects, and availability

This preserves normal buttons, focus, text layout, and accessibility while supporting a spatial tree. A pure canvas implementation is only justified if the graph becomes large enough that DOM/SVG performance is demonstrably inadequate.

### UI synchronization

Presentation should consume focused read-only views of state. Avoid rebuilding every panel on every animation frame.

Update a view when relevant simulation state, selection, or content changes. The canvas may continue rendering at display rate independently.

No particular UI framework is required by this plan. Framework choice should follow actual component and state-management needs.

## Persistence

Save data should include:

- Save-format version
- Content/version compatibility information
- Random seed
- Serializable runtime state
- Player settings that genuinely belong to the campaign

It should not include:

- DOM or canvas objects
- Cached rendering data
- Duplicated immutable definitions
- Subscriptions or callbacks

Stable content IDs and explicit migrations are required when released definitions are renamed, removed, or structurally changed.

Autosave, manual save, and platform storage should depend on a small storage abstraction so browser and Electron hosts can differ without affecting the simulation.

## Reusable libraries

Parts of `fox-game` may be reused where they have a clear fit:

- Frame scheduling for rendering
- Keyboard state and shortcut subscriptions
- Geometry primitives
- Sprite-sheet loading if the map uses sprite assets
- Generic caches
- Testing utilities

Do not automatically carry over:

- Canvas popup/display controls for application UI
- Field registry and field schema
- Fox entity and movement hierarchy
- Terrain chunk streaming/generation
- Combined world update/render objects

If code is shared as a library, make its package boundary and public API explicit. Avoid a mixture of partially packaged directories and source-internal aliases.

## Dependency direction

A useful dependency direction is:

```text
shared
  ↑
content definitions and simulation
  ↑
application and persistence
  ↑
rendering and UI
  ↑
platform startup
```

More specifically:

- Simulation may depend on validated content and shared utilities.
- Generation may depend on content types and deterministic shared utilities.
- Persistence may depend on runtime state types but not rendering.
- Rendering and UI may read simulation/application views.
- Content, simulation, and persistence must not depend on UI or canvas code.
- Shared libraries must not import application source.

Circular dependencies between these areas should be treated as an architectural warning.

## Testing strategy

### Content tests

- Schema validation
- Missing and duplicate references
- Research cycles and reachability
- Recipe and unit consistency
- Valid starting progression

### Simulation tests

- Deterministic tick results
- Resource conservation
- Seasonal curves and demand
- Generation, storage, and grid capacity
- Contract settlement
- Deposit depletion and forest regrowth
- Upgrade/decommission/recycling bounds
- Event payload typing, delivery, queue ordering, unsubscription, re-entrant publication, and listener-failure policy

### Generation tests

- Seed determinism
- Connected sector graph
- Zero-, single-, and multi-town sectors
- Starting-campaign viability
- No circular resource unlocks

### Persistence tests

- Save/load round trips
- Version migration
- Invalid/corrupted save handling

### Presentation tests

- UI interaction and accessibility
- Canvas hit testing and camera transforms
- Visual regression for important map and research states
- Modal focus and canvas-interaction blocking

Root-level scripts should run all relevant package and application tests so separate libraries are not accidentally omitted.

## Development and debug support

Prefer explicit development tools over generic mutable state access:

- Advance time
- Change season/weather
- Grant money or a resource
- Complete research
- Reveal deposits
- Damage, repair, or deplete a facility/deposit
- Refill or empty a reservoir
- Inspect demand, dispatch, grid, and contract calculations
- Validate/reload content
- Export a reproducible state snapshot

Debug functionality should be disabled or inaccessible in production builds and must use normal simulation/application boundaries where practical.

## Initial implementation emphasis

The first code should establish boundaries needed by the vertical slice:

1. Validated content loading
2. Fixed simulation clock
3. Serializable campaign state
4. Sector/town/site generation
5. Timber, forestry, mechanical power, and research
6. Iron, copper, dynamo, and first electricity
7. Town connection and contract settlement
8. Minimal canvas map and HTML status/detail UI
9. Save/load

Advanced abstractions should wait until this path exposes a concrete need.

