# MVP and implementation roadmap

## Guiding principle

Build the smallest vertical slice that proves the interaction among mechanical power, first electricity, seasons, town contracts, materials, and recycling. Add broad technology content only after that loop is enjoyable and understandable.

For bounded, dependency-ordered tasks suitable for delegation, use [Delegation-ready implementation tasks](implementation-tasks.md). This roadmap defines milestones; the task plan defines exact work units and acceptance criteria.

## Immediate rendering roadmap

The sprite-atlas pipeline, world art, reservoir-mask selector, application canvas, and renderer lifecycle shell exist. The next rendering work replaces the solid-color `CanvasRenderer` placeholder in small, testable steps rather than implementing camera, placement, every entity type, and all visual effects at once.

Implement rendering in this order:

1. ✅ **U01a — Atlas drawing foundation:** load/decode the generated world atlas once with an injectable image boundary for tests; draw typed source rectangles with anchors and nearest-neighbor scaling; handle device-pixel-ratio resizing.
2. ✅ **U01b — Read-only world scene:** project campaign state plus content definitions into deterministic logical cells and draw commands; preserve semantic site-template identity; place towns through deterministic layout data; no canvas pixels or atlas coordinates in simulation state.
3. ✅ **U01c — Layered centre-sector composition:** draw opaque biome cells, then reservoir/ground overlays, physical resources and towns, facilities, and finally transient effects; no generic or waterwheel site placeholder art; `Application` eagerly loads bundled content, builds catalog, and creates the initial campaign state.
4. ✅ **Camera core (advance work from U01e):** world/screen transforms with DPR support; scroll-to-zoom toward cursor with configurable step (10%); unbounded click-drag pan in both sector and campaign map views; two view modes on one canvas (sector detail and campaign map placeholder); `M` key toggle; shift+scroll-out transition to campaign map at a tunable minimum zoom; shift+scroll-in or click to re-enter sector; `CameraState.ts` pure math module with full unit test coverage.
5. **U01d — Connected and growth variants:** select `reservoir-water-00` through `reservoir-water-0f` from cardinal neighbours in the same visual join group; select town tier sprites from growth state with `"town"` fallback; use deterministic rendering fixtures.
6. **U01e (remainder) — Interaction rendering:** spatial hit testing, selection rendering, placement footprint previews, and faint construction-suitability outlines supplied by placement logic; depends on U02 for application-layer placement queries.

The first useful rendering checkpoint was U01c: the centre sector visibly demonstrates the biome-plus-transparent-overlay model with forest, town, and built-facility examples. The camera core is operational. U01d and the interaction remainder of U01e are next.

Rendering work must not infer occupancy, placement validity, reservoir capacity, or town growth from pixels. It may consume deterministic test scenes until the corresponding runtime systems expose read-only semantic state; test fixtures must not become hard-coded production content.

## ✅ Phase 0: foundations

Deliver:

- Typed simulation clock with pause and speed
- Canonical units for time, power, energy, resources, and money
- Data loading and validation
- Data-defined resources, recipes, research nodes, facilities, upgrades, sector/town archetypes, and contracts with no hard-coded content catalogs
- Deterministic seed/random service
- Central type-safe event bus with queued deterministic delivery and subscription cleanup
- Runtime entity IDs and save-state boundary
- Event/history log suitable for debugging

Tests:

- Determinism
- Unit conversion
- Fixed-step simulation under different rendering rates
- Save/load round trip
- Invalid-data diagnostics
- Typed event publication/subscription, all-listener delivery, unsubscription, nested publication, and listener-error behavior

## Phase 1: timber and mechanical vertical slice

Content:

- One starting centre sector and town
- Forest stock and seasonal regrowth
- Logging, sawmill, mechanical workshop, and charcoal kiln
- Waterwheel and windmill
- Site-local mechanical-power network
- Opening research milestones

Player experience:

1. Harvest and replant timber.
2. Build a waterwheel or windmill.
3. Mechanically process timber.
4. Generate early research.
5. Unlock charcoal and prospecting.

Exit criteria:

- Mechanical supply/demand is visible and understandable.
- Forestry can be sustained or exhausted.
- The opening takes minutes, not hours.

## Phase 2: first electricity and contract

Content:

- Iron and copper deposit/survey
- Small mine, smelter/forge, and wire production
- Dynamo
- Primitive cable and town connection
- Hourly town demand
- Fixed-price delivered-energy contract
- Revenue, shortage, and reliability settlement

Player experience:

1. Mine and process iron/copper with charcoal.
2. Build a dynamo on existing mechanical power.
3. Generate first electricity.
4. Connect and serve a town.

Exit criteria:

- Power is sold only when delivered.
- Capacity, energy, loss, and unmet demand are clear.
- No resource or research circular dependency exists.

## Phase 3: first seasonal energy portfolio

Content:

- Four seasons and simple weather
- Seasonal water flow, wind, forestry, and town demand
- Reinforced waterwheel/small hydro path
- Dynamo windmill/early turbine path
- Charcoal steam backup
- Reservoir water balance
- Forecast UI

Scenario:

Prepare for and survive a season where water output falls while town demand rises.

Exit criteria:

- Forecasts support planning.
- At least two viable strategies exist.
- Seasonal variation changes decisions without feeling arbitrary.

## Phase 4: materials and circularity

Content:

- Aggregate, steel, copper, electronics, and concrete
- Bills of materials
- Construction duration
- Plant condition and refurbishment
- Decommission options
- Scrap, rubble, e-waste, and recycling center
- Expensive material imports

Exit criteria:

- Decommissioned infrastructure creates traceable recoverable material.
- Recycling has energy cost and less-than-perfect recovery.
- Imports prevent deadlocks but local circular production is rewarding.

## Phase 5: sector grid MVP

Content:

- 8–12 sector graph
- Small initially accessible area around a centre sector; the rest begins as frontier/unknown
- Sector archetypes, sites, deposits, and climate
- Explorer research tiers controlling maximum distance from the centre
- Separate data-defined biome exploration and construction requirements
- Explored/surveyed/unlocked/buildable sector states
- Money-based sector acquisition with itemized distance and biome/desirability pricing
- Zero-to-many independent generated towns per sector, including deliberately empty sectors and some multi-town sectors
- Player town founding at valid settlement sites without internal town management
- Substations and capacity-limited interconnections
- Automatic dispatch and simple policies
- Battery and reservoir storage
- Multiple town contracts
- Generated-map viability validator

Exit criteria:

- Grid congestion creates legible spatial decisions.
- A seeded campaign is deterministic and always has a viable path.
- Towns remain customers rather than becoming city-management systems.
- Empty, single-town, and multi-town sectors all produce valid grid strategies.
- Explorer and biome prerequisites provide multiple reachable frontier choices without progression deadlocks.
- Easier or more profitable sectors cost more to acquire, while difficult sectors express their disadvantage through operating/building constraints.

## Phase 6: industrial generation

Prioritized plants:

1. Coal steam plant
2. Oil/diesel generator
3. Gas engine and open-cycle turbine
4. Combined-cycle gas
5. Utility wind farm
6. Utility solar farm
7. Reservoir hydro and pumped storage
8. Modern geothermal
9. Conventional nuclear reactor
10. Hydrogen electrolyser and fuel cell

Add cooling choices, fuel stockpiles, ramping, maintenance, and major retrofit semantics incrementally.

## Phase 7: advanced content

After the simulation is balanced and performant:

- Offshore/floating wind and marine power
- Biomass/biogas and carbon capture
- Small modular/floating/high-temperature/molten-salt nuclear
- Reprocessing, mixed-oxide fuel, fast reactors, breeders, and closed cycle
- Hydrogen turbine and seasonal storage
- Enhanced geothermal
- Advanced industrial/flexible contracts
- Fusion experiments, demonstration, and commercial branches

## MVP exclusions

Do not initially implement:

- Realistic terrain, lake, or river generation
- Roads, trucks, trains, and vehicle routing
- Individual town buildings or citizens
- A complete non-energy commodity economy
- Full AC electrical power flow
- Detailed workforce management
- Politics, regulations, or complex reputation factions
- Catastrophic random disasters
- Multiplayer
- Mod scripting beyond validated content data

## Cross-cutting quality requirements

### Explainability

Every unexpected value should have a breakdown: output, demand, cost, resource use, water use, and contract payment.

### Forecasting

Show future ranges for weather, demand, water, fuel runway, deposit depletion, construction, and maintenance.

### Determinism

Fixed seed plus the same typed application operations should reproduce simulation outcomes for testing and replays.

### Performance

Simulation uses fixed ticks independent from rendering. Aggregate inactive/long-duration processes where exact hourly simulation adds no result difference.

### Accessibility

- Color is not the only carrier of grid/resource state.
- Charts have textual values and clear units.
- Automation supports players who do not want per-plant micromanagement.

## First complete scenario

A useful initial scenario arc:

1. Inherit a forest and basic workshop.
2. Build mechanical water/wind power.
3. Discover iron and copper.
4. Construct the first dynamo.
5. Connect Greenfield and supply evening electricity.
6. Expand before seasonal water flow falls.
7. Use wind, charcoal, or storage as backup.
8. Unlock steel/concrete and replace early equipment.
9. Decommission one obsolete facility and recycle its materials.
10. Finish a full year above a reliability target and with sustainable forest stock.

This single scenario exercises the distinctive design before advanced plant breadth is added.

## Balance metrics to collect

- Time to first mechanical power/electricity/contract
- Number and duration of shortages
- Curtailment and storage utilization
- Player income and cash runway
- Material extraction, import, recovery, and loss
- Forest stock trend
- Water reserve trend
- Plant capacity factor and maintenance downtime
- Research-node selection order
- Frequency of emergency imports
- Whether one technology dominates all viable strategies


