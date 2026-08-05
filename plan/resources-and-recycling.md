# Resources, industry, and recycling

## Scope rule

A resource belongs in the simulation only if it materially affects construction, operation, research, decommissioning, or recycling of energy infrastructure.

The game does not simulate food, clothing, furniture, ordinary consumer goods, or a complete industrial economy.

## Resource classes

### Innate sector flows

Limited by current rate rather than a finite reserve:

- Sunlight
- Wind
- Rainfall and water inflow
- Tides
- Geothermal heat recovery

### Innate sector stocks

Structured state owned by a sector rather than spawned resource entities:

- Viable innate woodland biomass
- Local water
- Groundwater where enabled

Innate woodland grows only while viable. Destructive harvesting can reduce it to zero, at which point it disappears and does not spontaneously return. Water changes through rainfall, inflow, capture, withdrawal, evaporation, release, and spill; it does not generically regenerate.

### Finite sector reserves

Finite endowments stored as structured sector state and reduced through extraction:

- Aggregate/silica
- Iron ore
- Copper ore
- Gold or rare-material ore
- Coal
- Oil
- Natural gas
- Uranium and later thorium

Reserve records are keyed by resource type and are not spawned deposits or runtime entities. They can include remaining quantity, quality, accessibility, and survey knowledge. Extraction facilities own extraction capacity; sectors own the natural reserve.

### Player-planted forests

Player-planted forests are the only separate natural-resource instances. Each tracks its location, age, growth, biomass, condition, management, and lifecycle. Planting does not replenish or replace the sector's innate woodland state.

### Processed materials

- Lumber
- Concrete
- Glass
- Iron and steel
- Copper
- Electronics
- Charcoal
- Refined fossil fuels
- Nuclear fuel
- Hydrogen

### Waste and secondary material

- Wood waste
- Concrete rubble
- Metal scrap
- Copper scrap
- Electronic waste
- Ash and slag
- Spent nuclear fuel
- Hazardous waste

Processed materials, wastes, and other holdable goods use the single company-wide inventory. Every inventory resource has a stable icon reference for inventory and production UI.

## Initial content set

Begin with a compact set and add materials only when they create distinct decisions.

### Opening

- Timber
- Wood waste
- Mechanical components as a manufactured construction item if needed

### Early electrification

- Charcoal
- Aggregate
- Iron ore and iron
- Copper ore, copper, and copper wire
- Scrap

### Industrial grid

- Steel
- Concrete
- Glass/silica
- Coal
- Oil and gas
- Electronics

### Atomic and advanced

- Uranium ore
- Nuclear fuel
- Spent nuclear fuel
- Hydrogen
- Gold/rare material only if electronics need a meaningful scarce input

Sand and gravel should initially be combined as `aggregate`. Gold can be folded into `rare materials` if its tiny real-world quantity creates unnecessary inventory noise.

## Recipes and factories

Avoid long realistic chains. Recipes are deliberate game-level abstractions.

### Forestry operation

- Harvests either sector-owned innate woodland or a selected player-planted forest
- Establishes and manages planted forests where its capabilities permit
- Growth changes by season, rainfall, management, and forest condition
- Harvesting above sustainable yield reduces future output
- Harvested timber and wood waste enter the company-wide inventory

### Sawmill and charcoal works

- Timber + mechanical/electrical power → lumber + wood waste
- Timber or wood waste → charcoal

### Quarry and mine

A common extraction behavior is configured by sector reserve type. Mines, quarries, and wells consume power and equipment, read the selected sector reserve, and send extracted goods to the company-wide inventory. Extraction requires a compatible operational facility. Reserve quantity, quality, and survey knowledge belong to the sector; extraction capacity and operating state belong to the facility.

### Reservoir and water access

Water remains local sector state. Reservoirs provide rainy-season capture, retention, usable storage, and withdrawal or release capacity. They do not create water and do not fill when constructed; contents increase only through later captured inflow or an explicitly accounted transfer.

### Materials plant

- Iron ore + charcoal/coal + energy → steel
- Aggregate + water + abstract binder → concrete
- Silica + heat → glass

Detailed sintering, pig iron, rolling, and chemical chains are intentionally omitted.

### Refinery/fuel processor

- Oil → usable liquid fuel
- Uranium ore + energy → nuclear fuel through research-appropriate abstraction
- Later upgrades can split enrichment and fuel fabrication if the distinction becomes strategic

### Electronics factory

- Silica/glass + copper + optional rare material + electricity + high-quality water → electronics + e-waste

### Recycling center

- Metal scrap + energy → steel
- Copper scrap/e-waste + energy → copper
- E-waste + advanced processing → copper + trace rare material
- Rubble + energy → aggregate
- Glass waste → glass
- Wood waste → charcoal or fuel

Recovered outputs enter the company-wide inventory. Recycling never replenishes finite sector reserves, innate woodland biomass, planted-forest biomass, or sector water.

### Nuclear reprocessing

- Spent nuclear fuel + electricity + water → recovered fuel material + high-level waste

Reprocessing reduces fresh uranium demand but never produces perfect recovery or zero waste.

## Finite sector reserve and extraction lifecycle

1. Geological indication
2. Survey and uncertain reserve estimate
3. Extraction-facility development
4. Facility production ramp-up
5. Plateau
6. Decline as quality, depth, or pressure worsens
7. Marginal extraction at increasing cost
8. Closure
9. Remediation or redevelopment

Remaining quantity, quality, depth or pressure, and survey uncertainty are fields of the sector reserve record. Development, production, closure, and remediation are facility or site history. Reserve and extraction capacity are separate: a larger extractor supplies material faster but does not enlarge the reserve and therefore exhausts it sooner.

## Forestry

Innate woodland is sector-owned state and tracks:

- Current and maximum biomass
- Viability or minimum viable biomass
- Seasonal growth
- Soil/moisture or regional productivity
- Harvest rate
- Fire/drought risk where enabled
- Environmental condition

Growth occurs only while woodland remains viable. Complete depletion sets biomass to zero, removes the woodland visual, prevents further harvesting, and does not spontaneously regenerate. Deliberate reforestation creates a planted-forest instance rather than silently restoring innate woodland.

A player-planted forest separately tracks its location, age, current and maximum biomass, condition, and management. Its presentation lifecycle is:

1. Freshly planted
2. Growing
3. Mature/full
4. Semi-harvested/sparse
5. Nearly empty
6. Depleted and removed

Partial harvesting can leave viable biomass that continues growing. A fully depleted planted forest disappears and requires planting again.

Management policies:

- Selective harvest: low output, low damage
- Rotation: sustainable planned output
- Clear-cut: large immediate output, severe recovery penalty
- Coppice/plantation: faster repeated growth with ecological trade-offs
- Salvage: recover timber after a storm or fire

The UI shows current growth, harvest, and expected future stock so sustainability is understandable.

## Building bills of materials

Every facility records the materials used to construct and retrofit it. This drives decommissioning output.

Typical composition:

- Waterwheel: timber, then iron and copper after reinforcement/dynamo upgrades
- Wind turbine: steel, concrete, copper, glass/composites abstraction, electronics
- Solar farm: glass, steel, copper, electronics
- Thermal plant: steel, concrete, copper, electronics
- Nuclear plant: large concrete/steel inventory, copper, electronics, fuel
- Transmission: steel, copper, electronics

## Upgrades and decommissioning

### Operational upgrade

Changes a subsystem with limited downtime and added materials.

### Major retrofit

Substantially changes performance or fuel compatibility and requires extended downtime.

### Replacement

Decommissions equipment and builds a successor on the established site, retaining eligible grid, water, and civil infrastructure.

Decommissioning options:

- Abandon: cheap, no recovery, persistent site penalty
- Demolish: moderate recovery and mixed waste
- Careful deconstruction: expensive, slow, high recovery
- Refurbish: extend life using fewer materials while retaining limitations

Recovery depends on original composition, condition, age, method, and research.

## Recycling rules

Recycling is never lossless. Indicative late-game ceilings—not fixed balance values—are:

- Steel: high recovery
- Copper: high recovery
- Gold/rare material from e-waste: variable recovery
- Glass: moderate to high recovery
- Concrete as aggregate: moderate recovery
- Nuclear fuel: technology-dependent partial recovery

Losses become slag, contamination, low-grade material, or hazardous waste. Recycling also consumes energy and sometimes water.

Mass accounting should satisfy:

`opening stock + extraction + imports + recovery = consumption + exports + losses + closing stock`

Here, recovery means recovered inventory goods. It never increases any natural sector reserve or stock. Fresh extraction, imports, and recovery should remain separately reportable even when equivalent virgin and recovered goods share one inventory quantity.

## Inventory and imports

The MVP uses exactly one company-wide material inventory and automatic transport. Extraction, harvest, processing, imports, decommissioning, and recycling all add goods to it; facilities consume from it. There are no separate sector, warehouse, extractor, or general facility inventories. Narrow operational buffers may be added only when a specific machine behavior requires one, and are not general storage.

Storage limits and storage buildings are deferred. Every inventory resource definition must resolve a stable icon and localization entry. Every essential material is importable at an elevated delivered price, preventing circular-construction deadlocks.

Possible later extension:

- Regional inventories
- Automatic shipment cost and delay
- Transfer-capacity limits

Do not add vehicle routing unless it becomes central to energy decisions.

## Exhausted-site reuse

- Closed mine site over an exhausted sector reserve → pumped storage, compressed-air storage, geothermal, restoration, waste storage
- Closed oil/gas extraction site over an exhausted sector reserve → gas/hydrogen storage, carbon storage, geothermal
- Industrial site → recycling or new generation
- Closed forest operation → restoration or managed plantation

Depletion should signal a planned transition, not abruptly end a save.

