# Power plants and upgrades

## Common plant model

Every plant definition should specify:

- Research era and prerequisites
- Construction bill of materials, cash, time, and placement-rule requirements
- Mechanical/electrical/heat output and auxiliary consumption
- Fuel, water, waste, and emissions
- Minimum/maximum output, ramp rate, start time, and start cost
- Weather/season response
- Reliability, condition, maintenance, lifetime, and decommissioning
- Grid connection and storage interactions
- Available upgrades, retrofits, and successor designs

Older technologies retain niches; progression should not reduce to buying a universally superior tier.

## Mechanical generation and first electricity

### Undershot waterwheel — Era 0

- Low-head flowing-water location
- Timber construction
- Produces local mechanical power
- Cheap, inefficient, flow-dependent
- **Grid adjacency rule:** a proposed waterwheel footprint is suitable only when at least one of its four cardinal neighbours is a reservoir water cell. Suitability is evaluated when construction is queried; no waterwheel site entity exists beforehand. The waterwheel produces no mechanical power if that adjacency is later lost (e.g. the reservoir is drained or removed). This is enforced in placement validation (U02) and in mechanical-power tick logic (V01).

Upgrades: improved paddles, timber bracing, debris screen, sluice control, reinforced axle, iron bearings, dynamo attachment.

### Overshot waterwheel — Era 0

- Medium-head location or mill pond
- More efficient at lower flow

Upgrades: larger wheel, improved buckets, controlled mill race, iron rim/axle, enclosed gearing, dynamo.

### Wooden windmill — Era 0

- Wind-suitable location
- Variable local mechanical power

Upgrades: larger/adjustable sails, rotating cap, gearing, storm brake, iron reinforcement, dynamo.

### Primitive dynamo — Era 1

- Iron core/shaft, copper windings, timber frame
- Converts shaft power from a wheel or mill into local electricity
- Inefficient and limited by primitive cables

Upgrades: improved windings, bearings, governor, insulation, larger generator.

## Mechanical processing workshop

Like towns, the mechanical workshop progresses through named tiers rather than being a single static facility. It starts as a modest woodworking shop and becomes a more capable industrial processor as the player researches and rebuilds it.

### Woodworking shop — Era 0

- Timber frame, hand tools, simple belt-driven machinery
- Processes timber into planks, beams, and rough components
- Generates basic research capability through craft knowledge
- Requires local mechanical power to operate above manual speed

### Mechanical workshop — Era 1

- Iron fittings, better gearing, and organized layout
- Handles timber, charcoal preparation, and early metalwork
- Notably improved research output

### Machine shop — Era 2

- Precision iron and early steel tooling
- Enables fabrication of components for dynamos, turbines, and boilers
- Required for some mid-game plant construction

### Industrial workshop — Era 3+

Later tiers add electrical drive, automated feed, heat treatment, and specialist fabrication capabilities. Each tier is a successor facility at the same location, not a numeric upgrade, so it has a distinct sprite and construction cost.

## Hydropower

### Iron waterwheel — Era 1

Major rebuild retaining the water-access location. More durable and capable of driving a larger dynamo.

### Kaplan/Francis/Pelton water turbine — Era 3

Current water and location state recommends low-, medium-, or high-head machinery. Upgrades include runner efficiency, electronic governor, cavitation resistance, fish-safe operation, and high-efficiency generator.

### Small/run-of-river hydro — Era 3

- Reliable and inexpensive to operate
- Output follows flow and environmental release
- Natural successor at early mill locations

### Reservoir hydro — Era 3–4

- Uses sector-local water and improves rainy-season capture, retention, usable storage, and withdrawal for dispatchable peak output
- Competes for water and has environmental cost

Upgrades: greater storage, additional turbine, spillway, sediment control, variable-speed turbine, digital water scheduling.

Construction adds capability rather than water. A reservoir fills only from later accounted inflow or transfer; it never fills instantly. Pumped storage moves already-accounted water with losses and cannot create net water.

### Pumped-storage hydro — Era 4

- Storage, not a primary generator
- Consumes low-price electricity and returns less during peaks

Upgrades: reversible/variable-speed turbines, increased reservoir capacity, underground or depleted-mine configuration.

## Wind power

### Dynamo windmill — Era 1

Small wind-electric machine with iron reinforcement and copper generator.

### Iron/early steel wind turbine — Era 2

Upgrades: tower height, gearbox, sheet-metal blade, yaw, pitch, lightning protection, grid synchronization.

### Utility onshore wind turbine/farm — Era 4

- Concrete foundation, steel tower, copper, electronics, advanced blades
- Shared farm connection and maintenance

Upgrades: taller tower, larger rotor, direct drive, smart inverter, cold-weather package, low-wind rotor, storm package, predictive maintenance.

Mutually exclusive choices include low-wind versus storm-resistant rotor and gearbox versus direct drive.

### Fixed offshore wind — Era 5

- Stronger wind, high output
- Requires coast/port, submarine grid connection, corrosion control

### Floating offshore wind — Era 6

- Deep-water locations
- Expensive platform and mooring

Upgrades: shared floating substation, improved mooring, robotic inspection, integrated offshore electrolysis.

## Wood and biomass

### Wood furnace — Era 0

Produces heat for charcoal, early workshops, and processing.

### Charcoal steam engine — Era 1–2

- First controllable electrical generator
- Boiler/engine drives a dynamo
- Inefficient, smoky, dependent on forestry and water

Upgrades: boiler insulation, condenser, automatic feed, iron pressure vessel, improved dynamo, heat recovery.

### Wood-fired steam station — Era 2

Consumes timber waste or wood chips. Upgrades include fuel drying, steam turbine, ash handling, filters, and combined heat and power.

### Biomass/biogas plant — Era 4

Dispatchable but feedstock-limited. Later upgrades include gasification, mixed fuel, heat sales, emission controls, and optional carbon capture.

## Coal

### Reciprocating coal steam plant — Era 2

- Cheap early baseload
- Slow, inefficient, high pollution

Upgrades: mechanical feed, condenser, improved dynamo, filters, ash handling, combined heat and power.

### Coal steam-turbine plant — Era 3

Upgrades: pulverized coal, higher-pressure boiler, turbine stages, feedwater heating, automated controls, cooling improvement.

### Supercritical/ultra-supercritical coal — Era 4

Higher efficiency and capital cost, still carbon intensive. Supports flexible-operation and carbon-capture retrofits.

### Coal gasification combined cycle — Era 5

Cleaner local pollutants and capture-compatible, but complex, expensive, and water intensive.

### Carbon-capture retrofit

Reduces net output, increases water and capital use, and requires carbon storage. It does not remove mining impacts or all emissions.

## Oil

### Oil engine generator — Era 2

Small, modular, quick-start, expensive fuel. Upgrades include injection, automatic start, heat recovery, cleaner combustion, and dual-fuel operation.

### Diesel generator station — Era 3

Emergency, remote, peaking, and black-start role; remains useful even when rarely dispatched.

### Oil-fired steam plant — Era 3

Moderate ramping and easy fuel handling. May retrofit improved burners, controls, pollution reduction, thermal storage, or convert to gas.

## Natural gas

### Gas-engine station — Era 3

Modular fast response; can later use biogas or limited hydrogen blends.

### Open-cycle gas turbine — Era 3–4

Cheap and fast-starting peaker with low efficiency. Upgrades include low-emission burner, fast start, inlet cooling, and hydrogen-ready combustion.

### Combined-cycle gas turbine — Era 4

High efficiency through gas turbine plus waste-heat steam cycle. Upgrades include added blocks, improved heat recovery, flexible control, carbon capture, hydrogen blending, and eventual hydrogen conversion.

## Geothermal

### Geothermal heat well — Era 2–3

Provides district/process heat at a suitable location.

### Dry-steam plant — Era 3

Rare high-quality location; direct steam turbine. Add wells, reinjection, corrosion/scaling control, and improved turbine.

### Flash-steam plant — Era 4

High-pressure hot-water resource; manages reservoir decline and reinjection.

### Binary-cycle plant — Era 4

Works with lower temperatures using a secondary fluid; lower output but more possible locations and closed-loop operation.

### Enhanced geothermal — Era 5–6

Engineered hot-rock system with deep drilling cost and induced-seismicity risk.

### Superhot-rock geothermal — Era 7

Very high energy density requiring advanced drilling and materials.

## Solar

### Solar thermal collector — Era 1–2

Produces useful heat for water, drying, and reduced timber consumption.

### Primitive photovoltaic array — Era 3–4

Expensive silicon/glass/copper installation with low efficiency and daylight-only output.

### Utility solar farm — Era 4

Upgrades: tracking, bifacial modules, improved cells, smart inverters, cleaning, snow shedding, integrated battery.

### Concentrated solar power — Era 5

High-solar regional location; produces heat and can use molten-salt storage after sunset. Dry cooling and higher-temperature receivers reduce water dependence or increase efficiency.

## Marine

### Tide mill — Era 1

Coastal mechanical power, later dynamo-compatible.

### Tidal barrage — Era 3–4

Predictable but expensive and environmentally disruptive; restricted to suitable estuary locations.

### Tidal-stream turbine — Era 4–5

Underwater turbine with corrosion, maintenance, and submarine-connection challenges.

### Wave-energy converter — Era 5

Weather-dependent offshore generation. Upgrades improve conversion, shared connection, control, and storm survival.

## Nuclear fuel infrastructure

Required sequence: uranium survey/mine → processing/enrichment abstraction → fuel fabrication → reactor → spent-fuel storage.

Later systems:

- Reprocessing recovers some usable uranium/plutonium and leaves concentrated waste.
- Mixed-oxide fabrication supplies compatible reactors.
- Advanced partitioning supports waste-burning fast reactors.
- Closed fuel cycles reduce fresh draw on finite uranium/thorium sector reserves by returning recovered fuel material to the global company inventory, but retain processing losses and disposal needs. They never increase geological reserve records.

Recycling is a fuel-cycle facility, not a reactor type.

## Nuclear reactors

### Experimental reactor pile — Era 4

Consumes resources and produces research/heat rather than useful net electricity.

### Gas-cooled graphite reactor — Era 4

Large early design with flexible fuel/enrichment characteristics. Upgrades improve channels, circulation, steam generation, shutdown, and compatible online refuelling.

### Pressurized-water reactor — Era 4–5

Large reliable baseload with high capital, long construction, cooling needs, and slow output changes. Upgrades: fuel burn-up, steam generators, digital control, uprating, life extension, load following, mixed-oxide compatibility.

### Boiling-water reactor — Era 4–5

Alternative conventional branch with a simpler steam cycle and different maintenance/safety trade-offs; not a strictly superior tier.

### Heavy-water reactor — Era 5

Supports natural/lightly enriched uranium, flexible fuels, and online refuelling at greater construction/moderator cost.

### Small modular reactor — Era 5

Factory-produced modules, shorter staged construction, smaller-grid suitability. Add modules and choose electricity, district heat, hydrogen heat, or load-following configuration.

### Floating nuclear plant — Era 6

SMR deployment on a coastal platform. Seawater cooled and movable, but requires port, maritime security/maintenance, and coastal grid connection.

### High-temperature gas reactor — Era 6

High-temperature electricity/process heat, passive-safety potential, specialized fuel. Supports efficient hydrogen cogeneration.

### Molten-salt reactor — Era 6

High-temperature low-pressure system with complex chemistry and corrosion. Possible upgrades include fuel cleanup, thorium-compatible cycle, process heat, or waste-burning configuration.

### Fast reactor — Era 6

Requires advanced fuel processing; can consume transuranic material and support breeding. Coolant/material choices carry major cost and risk.

### Fast breeder reactor — Era 6–7

Creates fissile fuel from fertile material over time. It is not infinite: initial inventory, reprocessing energy, fabrication, losses, and waste remain.

### Accelerator-driven subcritical reactor — Era 7

External accelerator drives a subcritical waste/fuel blanket. High internal power and capital cost, shutdown on beam loss, useful waste-burning niche.

### Fusion–fission hybrid — Era 7

Fusion neutron source drives a subcritical blanket to generate power, consume waste, or breed fuel; bridge technology toward fusion.

## Hydrogen

Hydrogen is storage/energy carrier, not primary generation.

### Electrolyser — Era 4

Consumes electricity and water; best dispatched during surplus. Upgrades improve flexibility, efficiency, pressure, and heat integration.

### Fuel-cell generator — Era 4–5

Efficient modular backup and distributed power.

### Hydrogen gas turbine — Era 5

Large fast dispatch, reuses some gas infrastructure, but has poor electricity-to-electricity round-trip efficiency and possible NOx.

### Hydrogen combined cycle — Era 5–6

More efficient large discharge plant for seasonal hydrogen stores.

### High-temperature electrolysis — Era 6

Uses electricity plus nuclear, geothermal, solar, or industrial heat to improve hydrogen production.

## Fusion

### Experimental tokamak — Era 7

Net consumer of electricity that generates plasma and materials research.

### Demonstration fusion reactor — Era 7

Produces heat and limited net power; establishes tritium breeding and maintenance capability.

### Commercial deuterium–tritium tokamak — Era 7

High-output, high-capital system requiring superconductors, cooling, tritium breeding, blanket replacement, and robotic maintenance.

### Stellarator — Era 7

More complex magnets and construction, potentially better continuous operation and different disruption behavior.

### Inertial-confinement fusion — Era 7

Pulsed pellet ignition with demanding lasers/drivers and a distinct maintenance profile.

Advanced deuterium, helium-3, or proton–boron fuels belong only in speculative post-endgame content.

## Upgrade semantics

- **Upgrade:** modifies equipment while preserving plant identity.
- **Retrofit:** replaces a major subsystem, requires substantial downtime and materials.
- **Successor:** decommission/recycle old equipment and reuse an eligible location, connection, reservoir infrastructure, currently accounted water, water right, and civil work. Reuse does not grant a newly filled reservoir.

Common axes are capacity, efficiency, flexibility, reliability, lifetime, water use, pollution, waste, and automation. Some choices are exclusive: wet/dry cooling, gearbox/direct drive, low-wind/storm rotor, maximum efficiency/fast ramping, and electricity/process-heat specialization.

