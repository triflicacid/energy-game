# Map and sectors

## Model

The campaign map is a connected graph of **sectors** rather than a simulation of physical terrain. A sector is an area of climate, resources, water, sites, and grid connectivity; it is not synonymous with a town.

- **Nodes:** sectors containing resources, climate, water, construction sites, and zero or more towns
- **Edges:** possible electrical interconnections with distance, capacity, cost, and loss
- **Visual form:** fixed hexes, generated connected cells, or stylized polygons

Gameplay data is generated independently of decorative geography. No erosion, drainage basin, road, lake, or realistic town generation is required.

## Sector data

Each sector defines:

- ID, name, archetype, and neighboring sectors
- Day/night and seasonal climate profile
- Wind, solar, geothermal, coastal, and hydro potential
- Innate woodland stock, capacity, viability, growth, and seasonal accessibility
- Sector-local water stock, inflow, capture, retention, evaporation, and environmental reserve
- Known and hidden finite reserve/endowment records keyed by resource type, including quantity, quality, accessibility, survey confidence, and exhaustion
- References to player-planted forest instances
- General, extraction, forestry, water, coastal, and geothermal facility-placement sites
- Existing transmission and import access
- Environmental sensitivity and pollution capacity

Town instances are separate entities that reference their containing sector. A sector may:

- Be empty wilderness or an extraction/generation area
- Contain one settlement
- Contain several towns with separate demand, connections, and contracts
- Gain additional player-founded towns during the campaign

Generation should intentionally include empty sectors so remote resources and generation require strategic transmission investment.

Natural reserve, innate woodland, and water records are structured sector state, not spawned resource entities, and do not need runtime entity IDs. Player-planted forests are the only separately instantiated natural resources. Placement sites constrain facilities independently of the natural state they access.

## Site categories

### General sites

Support facilities without a special geographic requirement:

- Factories
- Recycling centers
- Batteries
- Substations
- Some thermal and solar plants

### Extraction sites

Identify places where a compatible facility can access a sector reserve such as:

- Iron, copper, gold, uranium, coal, oil, or gas
- Aggregate or silica

A survey reveals increasingly accurate knowledge on the sector reserve record. A mine, quarry, or well is required for extraction and determines extraction capacity; the sector's remaining reserve determines its lifetime. An extraction site is not a deposit and does not own the reserve.

### Forest sites

Provide placement and access for forestry facilities that support:

- Managed forestry
- Conservation
- Sawmills and charcoal works
- Biomass generation

Innate woodland biomass remains sector-owned state and is projected visually without becoming a site or entity. It grows only while viable; complete depletion removes it and requires deliberate planting rather than spontaneous recovery. Player-planted forests are separate lifecycle instances and are the only instantiated natural resources.

### Water and hydro sites

Define abstract hydrological opportunities:

- Waterwheel site
- Run-of-river site
- Small reservoir
- Large reservoir
- Pumped-storage site

The player builds on a named semantic site; no river or lake geometry is simulated. A site or tag such as `waterwheel-site` constrains placement but is not itself a persistent map sprite. The completed waterwheel is rendered only when the facility exists.

Reservoir facilities may use connected water autotiles to communicate their extent visually. Those tiles are presentation overlays over the biome, not generated terrain: their shape and cell count do not define storage capacity, water balance, facility footprint, or simulation connectivity.

Reservoirs access local sector water and add rainy-season capture, retention, usable storage, and withdrawal or release capacity. They do not create water or fill on construction. Contents increase only through later captured inflow or an explicitly accounted transfer.

### Wind and solar sites

All sectors may expose a baseline potential, while especially good sites provide higher capacity or lower cost. Wind and solar remain weather-dependent.

### Coastal sites

Support:

- Fixed or floating offshore wind
- Tidal and wave generation
- Floating nuclear power
- Seawater cooling
- Electricity or fuel imports

### Geothermal sites

Contain temperature, depth, flow, and depletion/recovery characteristics.

## Placement principles

Construction mode visualizes placement rules directly. After a facility is selected, valid cells or footprints receive a faint transient outline derived from site tags, ownership, research/biome access, occupancy, and the facility's other placement requirements. General and water-specific opportunities do not use placeholder building sprites. Innate woodland is projected from sector state, while planted woodland is projected from its separate instance state; both remain visible outside construction mode until depleted.

Location should matter through energy-relevant constraints:

- Renewable potential
- Fuel or water access
- Cooling technology
- Grid distance and capacity
- Town demand
- Site capacity
- Environmental consequences

Materials move through exactly one company-wide inventory, so placing a plant does not require building a transport network. There are no sector, warehouse, extractor, or general facility inventories in the current scope. A later sector-inventory mode may add automatic freight cost, delay, and transfer limits without vehicle routing.

## Expansion

A campaign begins with only a small viable area around a designated **centre sector** accessible. The wider sector graph exists from campaign creation but is hidden, obscured, or inaccessible until the player expands.

Expansion has distinct requirements:

1. **Explorer range:** general explorer research increases the maximum graph distance the player may venture from the centre.
2. **Biome exploration:** biome-specific research permits entry into and exploration of that environment, such as cold exploration.
3. **Sector acquisition:** an eligible explored sector must be unlocked with money before normal development.
4. **Biome construction:** separate biome-specific construction research permits facilities and grid infrastructure to be built there, such as cold construction.

Researching cold exploration therefore reveals and surveys cold sectors but does not make ordinary equipment safe to construct in them. Cold construction represents foundations, materials, insulation, working practices, and machinery adapted to that environment.

### Sector access states

A sector progresses through explicit states:

- **Unknown:** outside current knowledge or explorer range.
- **Frontier:** its location/broad biome may be visible, but details are hidden.
- **Explored:** biome, towns, visible sites, and broad potential are known.
- **Surveyed:** sector reserves/endowments and site quality have more accurate estimates.
- **Unlocked:** acquisition has been paid and normal operations are permitted.
- **Buildable:** all required biome-construction research for a proposed facility is available.

Exploration, surveying, acquisition, and construction permission are intentionally separate. A sector can be known but unaffordable, owned but not yet buildable with current technology, or useful only as a future route.

The player expands through:

- Research
- Exploration and surveying
- Purchasing sector operating/development rights
- Building an interconnection
- Fulfilling contracts
- Scenario milestones

### Explorer range

Distance is measured as the shortest number of sector edges from the centre, optionally with data-defined traversal weights for exceptional barriers. Explorer research unlocks progressively wider distance bands.

This range controls which sectors may be explored or acquired; it does not require generating the map during play. The player can see a limited frontier beyond the current range so future expansion has direction and anticipation.

### Biome permissions

Each sector references a biome or environment tag. A biome can define separate research requirements for:

- Exploration
- Surveying, where specialized survey capability is needed
- General construction
- Optional specialized facility types

Examples include cold, desert, wetland, mountain, volcanic, coastal, and offshore environments. A facility may add stricter requirements beyond the sector's general construction permission.

### Sector unlock price

Sector acquisition cost is data-driven and derived from factors such as:

- Base sector-rights price
- Graph distance from the centre
- Biome desirability
- Ease of development
- Renewable and resource potential
- Existing towns and expected contract profitability
- Known sites or infrastructure
- Scenario and market modifiers

Distance should increase cost nonlinearly enough to make outward expansion a strategic investment. Easier or more profitable sectors command a higher acquisition price, while difficult sectors may be cheaper but impose greater construction, maintenance, water, or reliability costs after acquisition.

The UI must show an itemized price breakdown before purchase. Exact values and curves belong in content/balance data rather than map logic.

Different sector archetypes encourage complementary systems:

- Forested cold sector: timber and hydro, weak winter solar, high heating demand
- Windy coast: offshore wind and imports, storm exposure
- Dry interior: strong solar and uranium, limited cooling water
- Industrial basin: high steady demand, pollution legacy, coal reserves
- Volcanic region: geothermal potential and seismic risk

## Generated-map safeguards

Generation must validate that every campaign contains:

- At least one reachable town somewhere in the starting connected area; the initial sector itself may be empty
- A small initially accessible centre area with a viable opening loop
- At least one useful frontier choice at each intended explorer tier
- Biome research requirements that do not make required progression unreachable
- A timber start and viable waterwheel or windmill site
- A path to iron and copper after prospecting
- At least two viable early electrical strategies
- Sufficient water or a low-water technology route
- Access to imports before finite resources can cause deadlock
- A connected path to every required sector
- Long-term options after initial sector reserves deplete
- Finite reserves represented as sector records rather than entities, with a reachable compatible extractor path for required resources
- Initially viable innate woodland or an explicit path to planting, and no spontaneous recovery after terminal depletion
- Useful local water together with a suitable reservoir or water-access path
- No recycling route that replenishes a geological reserve
- No technology whose prerequisite resource requires that same technology

Invalid graphs should be regenerated.

## Map evolution

Sites retain history:

- A waterwheel site can later host modern small hydro.
- A wooden wind installation can be replaced while retaining its grid connection.
- A closed mine site over an exhausted sector reserve can become pumped storage, compressed-air storage, geothermal, waste storage, restored land, or another industrial site.
- A closed oil or gas extraction site over an exhausted sector reserve may support gas, hydrogen, or carbon storage.
- A closed facility leaves reusable materials, contamination, or remediation work.

This rewards long-term planning without requiring one facility to transform implausibly into another.

## Camera and navigation

The game has two distinct view modes that share one canvas. Switching between them is a presentation concern; it does not mutate simulation state.

### Sector detail view

The default view when the game starts. Shows the interior tile grid of one sector (the `diameter × diameter` cell area) at a scale where individual buildings are visible.

- The camera is bounded to the sector's tile grid: the player cannot scroll past its edges.
- Pan by click-and-drag (or touch equivalent).
- Zoom by scroll wheel.
- Minimum zoom shows the entire sector grid without clipping.
- Maximum zoom is a reasonable upper limit (exact value decided during U01e implementation).

### Campaign map view

Shows the connected sector graph at a scale where each sector is a single hex node.

- Hex nodes are arranged at their `(gridQ, gridR)` axial grid positions.
- Edges between nodes represent possible or built interconnections.
- Pan and zoom operate over the hex graph.
- Clicking a sector hex enters that sector's detail view.

### Switching between views

| Action | Effect |
|---|---|
| Press `M` | Toggle between sector detail view and campaign map view |
| Shift+scroll outward far enough | Transition from sector detail view to campaign map view |
| Scroll inward in campaign map (shift held) | Enter the hovered sector's detail view |
| Click a hex node in campaign map | Enter that sector's detail view |

The transition threshold for shift+scroll should be reached before the sector tiles become too small to distinguish; the exact zoom level is a tunable constant, not part of the simulation model.

### Controls summary

| Gesture | Sector detail | Campaign map |
|---|---|---|
| Scroll wheel | Zoom in/out toward cursor | — |
| Shift + scroll (out at min zoom) | Switch to campaign map | — |
| Shift + scroll in | — | Enter sector |
| Click + drag | Pan (unbounded — can drag into the void) | Pan (unbounded) |
| Click (no drag) | — | Enter sector |
| M key | Switch to campaign map | Switch to sector |

### Design notes

- The two views are rendering modes, not separate DOM pages. The canvas and its event handlers switch behavior based on the current view state.
- Campaign map hex visual appearance (biome colour, access-state fog, town/resource badges) is not yet specified; it belongs to the sector grid implementation phase (Phase 5).
- The `M` key shortcut must not fire while keyboard focus is inside a text input or dialog.

## Initial target

For the first playable campaign:

- 8–12 connected sectors
- Zero or more independent town nodes per sector, with empty sectors expected and some sectors containing multiple towns
- Generated starting towns plus the ability to found a new town at a valid settlement site
- Centre distance, access state, biome exploration/build requirements, and acquisition cost for every sector
- A small number of typed construction sites
- Structured finite-reserve, innate-woodland, and local-water sector state, with no deposit entities
- Player-planted forests as the only separate natural-resource instances
- Extraction facilities required to turn sector reserves or woodland into inventory goods
- Company-wide material inventory
- No warehouse or facility material inventories
- No road or freight simulation
- Sector water balance
- Cables represented as graph edges rather than tile-by-tile routes

