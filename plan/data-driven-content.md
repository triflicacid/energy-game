# Data-driven content architecture

## Goals

- Designers can add and rebalance content without changing simulation code.
- Resource types, recipes, research nodes, facilities, plant types, upgrades, town archetypes, sector archetypes, contracts, and seasonal profiles are first-class data, not hard-coded enumerations.
- All cross-references use stable string IDs.
- Invalid content fails early with useful diagnostics.
- Save games store IDs and runtime state rather than duplicating definitions.
- Specialized simulation logic remains typed and testable.

## Content catalogs

Prefer separate JSON documents or logical catalogs:

- `resources`
- `wasteTypes`
- `recipes`
- `facilities`
- `generators`
- `storageTypes`
- `extractors`
- `upgrades`
- `researchNodes`
- `sectorArchetypes`
- `biomeArchetypes`
- `explorationTiers`
- `sectorPricing`
- `siteTypes`
- `climateProfiles`
- `seasonProfiles`
- `weatherTypes`
- `demandProfiles`
- `townArchetypes`
- `townFoundingOptions`
- `contracts`
- `events`
- `localization`

A build step may combine these into a production bundle after validation.

Simulation and UI code must operate on capabilities, tags, typed definitions, and registered behavior IDs. It must not contain branches such as “if building is coal plant” or manually maintained lists of resource/research IDs. Adding an ordinary resource, recipe, research node, upgrade, town archetype, or plant variant should normally require data and assets only.

## Definition versus runtime state

### Definition data

Immutable content such as:

- Name/localization ID
- Construction cost and materials
- Capacity and efficiency
- Valid sites
- Input/output resources
- Required research
- Upgrade IDs
- Behavior ID

### Runtime state

Save-specific values such as:

- Owner and sector/site
- Construction progress
- Condition and age
- Current output and dispatch mode
- Stored fuel/water/energy
- Installed upgrades
- Maintenance schedule
- Original/current material composition

Never mutate shared definitions to represent one facility instance.

## Resource definitions

A resource needs:

- Stable ID
- Category and unit
- Display precision/icon/localization
- Whether it is storable, importable, renewable, waste, or hazardous
- Optional density/value/emissions metadata
- Valid substitutions where explicitly supported

Use one canonical internal unit per quantity. Display conversions do not change simulation storage.

## Recipe definitions

A reusable recipe describes:

- Input resources and quantities
- Output resources and quantities
- Waste/by-products
- Required mechanical power, electricity, heat, and water
- Duration or maximum rate
- Required research and facility capability
- Efficiency/recovery modifiers

Do not place executable code or arbitrary expression strings in JSON. Use limited typed modifiers and registered behavior IDs.

## Facility definitions

Common fields:

- ID and type
- Valid site/sector requirements
- Construction bill, money, and time
- Required research
- Input/output storage
- Recipe/capability IDs
- Mechanical/electrical/heat connections
- Maintenance, lifetime, condition, and decommission profile
- Upgrade IDs
- Registered behavior ID

Generator-specific data adds capacity, auxiliary load, ramping, minimum stable output, start time/cost, fuel/water/emission rates, and availability response.

## Behavior IDs

Complex behavior is implemented in TypeScript and referenced by a closed identifier such as:

- `mechanicalGenerator`
- `variableWind`
- `variableSolar`
- `runOfRiverHydro`
- `reservoirHydro`
- `thermalGenerator`
- `nuclearGenerator`
- `batteryStorage`
- `pumpedStorage`
- `fuelExtractor`
- `forestGrowth`
- `materialProcessor`

Every behavior validates the fields it requires. This keeps data flexible without turning it into an unsafe scripting language.

## Research definitions

A node defines:

- ID and localization
- Parent node IDs
- Era/category and optional UI position
- Research, material, money, power, and time cost
- Additional typed conditions
- Unlock IDs
- Mutually exclusive choice group where relevant

Tree layout should preferably be derived from graph/era data, with manual hints only when needed.

## Upgrade definitions

An upgrade defines:

- Applicable facility IDs/tags
- Required research and prior upgrades
- Exclusion group
- Material/money/time cost and downtime
- Typed stat modifiers
- Added/removed capabilities
- Material added to facility composition
- Whether it is reversible

Distinguish upgrades, retrofits, and successor/replacement definitions.

## Sector, town, and season definitions

A sector instance references:

- Sector archetype
- Biome archetype
- Climate profile
- Site/deposit instances
- Neighbors and connection distance
- Centre distance and current access state
- Exploration, survey, acquisition, and construction status
- Resolved acquisition price and its modifier breakdown
- Generated parameter values within validated ranges

Town instances are separate from sectors and reference:

- Containing sector ID
- Town archetype and demand profiles
- Grid connection and contract instances
- Population/growth state
- Whether generated at campaign creation or founded by the player

Sector generation allows a configurable town-count distribution including zero. Town-founding definitions specify site requirements, initial costs, construction time, starting demand, growth rules, and eligible purposes/archetypes.

A biome archetype defines data-driven requirements and modifiers such as:

- Exploration research ID
- Optional specialized survey research ID
- General construction research ID
- Acquisition desirability multiplier
- Construction and maintenance modifiers
- Facility/site eligibility tags
- Environmental and seasonal behavior references

Explorer-tier definitions map research IDs to maximum distance from the campaign centre. Sector-pricing data defines the base price, distance curve, biome/desirability multipliers, town/resource/site valuation, and scenario modifiers. Pricing logic consumes these definitions and exposes an itemized breakdown; no biome or research ID is hard-coded into the calculation.

A climate/season profile supplies normalized curves and distributions for temperature, wind, irradiance, rainfall/inflow, evaporation, and forest growth.

## Contract definitions

A contract template defines:

- Eligible customer archetypes
- Duration and renewal
- Pricing method
- Demand/acceptance bounds
- Reliability conditions
- Penalties and bonuses
- Source/carbon restrictions
- Unlock conditions

A runtime contract fixes negotiated values and records delivered service.

## Validation

Validate JSON against schemas and then perform semantic cross-catalog validation.

Detect:

- Duplicate IDs
- Missing references
- Unknown behavior IDs
- Negative or nonfinite values
- Unit/category mismatch
- Impossible recipes or zero-output loops
- Research cycles and unreachable nodes
- Facilities with no valid site
- Upgrades that cannot apply or conflict incorrectly
- Resources consumed before any local/import source exists
- Missing decommission material mappings
- Invalid seasonal curve lengths/ranges
- Campaigns without a viable starting path
- Sector graphs whose explorer tiers leave required sectors unreachable
- Biomes with missing exploration/construction research references
- Sectors that can be explored or built in without satisfying their configured permissions
- Invalid, negative, or nonfinite acquisition-price modifiers

## Generated reports

Development tooling should produce:

- Research topological order
- Complete unlock list per era
- Resource producer/consumer graph
- Recipe mass/input-output report
- Facility construction and operating comparison
- Upgrade applicability matrix
- Unused and unreachable content
- Estimated plant payback and fuel runway under reference conditions
- Generated-campaign viability result

## Save compatibility

- Store a content/version identifier in every save.
- Keep stable IDs even when display names change.
- Add explicit migrations for renamed or removed IDs.
- Decide whether saves pin balance values or adopt current definitions; prefer documented versioned migration.
- Preserve unknown/deprecated runtime data long enough to refund or safely decommission old content.

## Testing

Automated tests should cover:

- Schema and semantic validation
- Research graph ordering and cycle detection
- Every recipe under zero, nominal, and constrained inputs
- Mass/resource conservation
- Upgrade exclusions and prerequisites
- Decommission/recycling recovery bounds
- Seasonal curve interpolation
- Deterministic seeded map/weather generation
- Campaign-start viability
- Save/load round trips and migrations




