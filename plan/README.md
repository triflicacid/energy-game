# EnergyGame design plan

## Vision

EnergyGame is a data-driven energy-sector strategy game about progressing from timber machinery and local mechanical power to interconnected electrical grids, advanced nuclear fuel cycles, hydrogen, and fusion.

The player is an energy and infrastructure company, not a mayor. Towns are semi-black-box customers; major energy infrastructure, material production, resource extraction, generation, storage, and transmission are player-controlled.

The central question is:

> Can the player build a reliable, profitable, and increasingly circular energy system while demand, weather, seasons, fuel reserves, water, and technology change?

## Design pillars

1. **Energy first** — every simulated system must create a meaningful energy decision.
2. **Technological progression** — begin with timber and mechanical power, then discover metals, electricity, industrial generation, renewables, nuclear technology, hydrogen, and fusion.
3. **Distinct generation technologies** — plants differ through availability, dispatchability, fuel, water use, ramping, reliability, lifetime, and environmental effects rather than only price and output.
4. **Seasonal planning** — weather, renewable output, water inflow, forestry growth, and town demand change predictably through the year.
5. **Finite resources and circularity** — finite sector reserves decline through extraction; decommissioning creates recoverable scrap; recycling reduces fresh extraction but never replenishes natural reserves.
6. **Spatial grid strategy** — sectors contain physical features and zero or more towns; construction suitability is evaluated from current sector state, and electricity earns money only after it reaches customers through adequate grid infrastructure.
7. **Data-driven content** — resource types, recipes, facilities, upgrades, research nodes, sector/town archetypes, seasons, and contracts are defined as validated data connected by stable IDs. Catalog content must not be hard-coded into simulation or UI logic.
8. **Controlled scope** — no individual citizens, street layouts, vehicle routing, realistic terrain generation, or complete world economy.
9. **Event-driven coordination** — a central type-safe event bus publishes named events with typed payloads to all registered listeners, allowing simulation systems, application services, history, and presentation to react without direct coupling.

## Core progression

1. Manage viable innate woodland and establish separately tracked planted forests.
2. Build waterwheels and windmills that produce local mechanical power.
3. Use mechanical workshops and milestones to gain research.
4. Unlock charcoal, sector-reserve surveying, iron, and copper extraction.
5. Manufacture a dynamo and generate the first electricity.
6. Connect a nearby town and earn money through delivered-energy contracts.
7. Unlock steel, concrete, transmission, thermal plants, modern hydro, wind, and solar.
8. Expand across regions while managing seasonal supply, water, fuel, and demand.
9. Decommission obsolete infrastructure and recycle its material.
10. Develop advanced nuclear fuel cycles, hydrogen, geothermal, offshore power, and fusion.

## Core simulation loop

At each simulation interval:

1. Update season, time of day, weather, water inflows, and renewable availability.
2. Calculate town and industrial electricity demand.
3. Make fuels and water available to connected plants.
4. Dispatch generators and storage according to player policy and plant constraints.
5. Flow electricity through capacity-limited grid connections and apply losses.
6. Settle delivered energy, shortages, curtailment, contract payments, and penalties.
7. Run extraction, factories, research, construction, maintenance, forestry, and recycling.
8. Update the global inventory, sector reserves, woodland, water, plant condition, town growth, and forecasts.

## Deliberate abstractions

- The world is a connected graph of sectors, not realistically generated terrain. A sector may be empty, contain one town, or contain several independent towns.
- Towns expose demand and contract information but manage their internal buildings automatically.
- Existing towns may be generated, and the player may found new towns; founding changes demand geography without introducing street or citizen management.
- Major industrial loads may be explicit; ordinary commerce and industry remain aggregated.
- All extracted, harvested, processed, imported, decommissioned, and recycled goods use one company-wide inventory. There are no sector, warehouse, extractor, or general facility inventories in the current scope. Inter-sector freight may later add automatic cost and delay, but the player does not route trucks or trains.
- Finite reserves, innate woodland, and water are structured sector state rather than spawned natural-resource entities. Player-planted forests are the only separate natural-resource instances.
- Viable innate woodland can grow, but complete depletion removes it and does not spontaneously restore it. Planted forests use freshly planted, growing, mature/full, semi-harvested/sparse, and nearly-empty visuals and disappear when depleted.
- Reservoirs and hydro opportunities come from physical reservoir features and sector water balances, not generated lakes, rivers, or pre-authored site entities. Reservoirs improve rainy-season capture, retention, usable storage, and withdrawal capacity; they neither create water nor fill instantly.
- Recycling returns recovered goods to company inventory and never replenishes geological reserves, woodland biomass, or sector water.
- Every inventory resource has a stable icon reference.
- World art is layered: an opaque biome tile forms the normal background, while reservoirs, forests, towns, and facilities are transparent overlays. Construction opportunities are computed transiently from candidate footprints and current state, then shown as faint outlines only while construction mode is active; they are not persisted entities or placeholder sprites.
- Minor hand tools and incidental early building materials are part of the starting abstraction.
- Imports provide an expensive safety valve so a campaign cannot become permanently deadlocked.

## Document index

- [Gameplay and economy](gameplay-and-economy.md)
- [Map and sectors](map-and-regions.md)
- [Towns and contracts](towns-and-contracts.md)
- [Resources, industry, and recycling](resources-and-recycling.md)
- [Seasons, demand, and water](seasons-demand-and-water.md)
- [Research progression](research-tree.md)
- [Power plants and upgrades](power-plants.md)
- [Grid, storage, and dispatch](grid-storage-and-dispatch.md)
- [Sprites and texture atlases](sprites-and-atlases.md)
- [Data-driven content architecture](data-driven-content.md)
- [Code architecture and organization](code-architecture.md)
- [MVP and implementation roadmap](./implementation-roadmap.md)
- [Delegation-ready implementation tasks](implementation-tasks.md)

## Open balancing decisions

These should be resolved through prototypes rather than fixed prematurely:

- Real-time duration of a day, season, and year
- Region count and construction-site limits
- Degree of automatic generator dispatch
- Whether mechanical power uses adjacency or named site-local networks
- Whether a post-MVP logistics expansion justifies replacing the settled global inventory with regional inventories
- How strongly money, materials, research, and construction time constrain expansion
- Exact environmental, maintenance, labor, and reputation systems

