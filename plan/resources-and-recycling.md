# Resources, industry, and recycling

## Scope rule

A resource belongs in the simulation only if it materially affects construction, operation, research, decommissioning, or recycling of energy infrastructure.

The game does not simulate food, clothing, furniture, ordinary consumer goods, or a complete industrial economy.

## Resource classes

### Renewable flows

Limited by current rate rather than a finite reserve:

- Sunlight
- Wind
- Water inflow
- Tides
- Geothermal heat recovery

### Renewable stocks

Regenerate but can be overused:

- Forest biomass
- Reservoir water
- Groundwater where enabled

### Finite deposits

Decline through extraction:

- Aggregate/silica
- Iron ore
- Copper ore
- Gold or rare-material ore
- Coal
- Oil
- Natural gas
- Uranium and later thorium

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

- Grows and harvests timber
- Growth changes by season, rainfall, management, and forest condition
- Harvesting above sustainable yield reduces future output

### Sawmill and charcoal works

- Timber + mechanical/electrical power → lumber + wood waste
- Timber or wood waste → charcoal

### Quarry and mine

A common extraction behavior is configured by deposit type. Mines consume power and equipment and expose reserve, extraction capacity, quality, and decline.

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

### Nuclear reprocessing

- Spent nuclear fuel + electricity + water → recovered fuel material + high-level waste

Reprocessing reduces fresh uranium demand but never produces perfect recovery or zero waste.

## Deposit lifecycle

1. Geological indication
2. Survey and uncertain reserve estimate
3. Development
4. Production ramp-up
5. Plateau
6. Decline as quality, depth, or pressure worsens
7. Marginal extraction at increasing cost
8. Closure
9. Remediation or redevelopment

Reserve and extraction capacity are separate. A larger mine supplies fuel faster but exhausts the deposit sooner.

## Forestry

A forest tracks:

- Current and maximum biomass
- Seasonal growth
- Soil/moisture or regional productivity
- Harvest rate
- Fire/drought risk where enabled
- Environmental condition

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

## Inventory and imports

The MVP uses a company-wide inventory and automatic transport. Every essential material is importable at an elevated delivered price, preventing circular-construction deadlocks.

Possible later extension:

- Regional inventories
- Automatic shipment cost and delay
- Transfer-capacity limits

Do not add vehicle routing unless it becomes central to energy decisions.

## Exhausted-site reuse

- Mine → pumped storage, compressed-air storage, geothermal, restoration, waste storage
- Oil/gas reservoir → gas/hydrogen storage, carbon storage, geothermal
- Industrial site → recycling or new generation
- Closed forest operation → restoration or managed plantation

Depletion should signal a planned transition, not abruptly end a save.

