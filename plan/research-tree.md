# Research progression

## Structure

Research is a validated directed acyclic graph, not a single linear list. Nodes reference prerequisites and unlock resources, recipes, buildings, upgrades, behaviors, surveys, and policies by stable ID.

A node can require:

- Parent research nodes
- Research points
- Money, materials, energy, and time
- A suitable research facility
- Operational experience or a milestone
- Discovery of a resource or site

Research should unlock capability, not grant a finished plant for free.

## Gaining research

### Continuous experimentation

Research workshops and laboratories consume time, power, and sometimes materials to generate research.

- Early workshop: labor and mechanical power
- Electrical laboratory: electricity and basic materials
- Industrial laboratory: electricity, electronics, prototypes, and specialized materials
- Atomic/fusion laboratory: large power requirement, advanced components, and experimental facilities

### Milestones

First-time achievements grant focused research or insight:

- First sustainable timber harvest
- First waterwheel and windmill
- First mechanically processed timber
- First charcoal, iron, and copper
- First copper wire and dynamo
- First electricity and town connection
- First seasonal shortage survived
- First material recovered through decommissioning
- First reactor operation and fuel reprocessing

This connects discovery to player action.

## Eras

### Era 0: timber and mechanical power

Starting capability:

- Forestry and replanting
- Carpentry and timber structures
- Wooden gears, shafts, and belts
- Waterwheels and windmills
- Sawmill and mechanical workshop

Research branches:

- Improved water power
- Improved wind power
- Sustainable forestry
- Charcoal production
- Prospecting
- Local exploration

No electrical grid exists.

### Era 1: metals and first electricity

Key unlocks:

- Surface mining and quarrying
- Iron and copper smelting
- Forging and wire drawing
- Iron reinforcement and bearings
- Electromagnetism
- Dynamo and electric motor
- Primitive cables and local distribution
- Explorer capability for the first distance band
- Initial biome exploration and construction adaptations

Milestone: attach a dynamo to mechanical power and generate the first electricity.

### Era 2: steam and industrial construction

Key unlocks:

- Deep mining
- Coal and oil extraction
- Steel, glass, and concrete
- Boilers and reciprocating steam engines
- Early thermal generation
- Transformers and improved distribution
- Mechanical pumps and larger reservoirs

### Era 3: regional grids

Key unlocks:

- Steam and gas turbines
- Modern water turbines
- High-voltage transmission and substations
- Grid synchronization and automatic governors
- Gas extraction and refining
- Larger town contracts
- Basic electronics and dispatch controls

### Era 4: renewables and atomic power

Key unlocks:

- Utility wind and solar
- Reservoir hydro and pumped storage
- Modern geothermal
- Uranium mining, enrichment/fuel fabrication, and conventional reactors
- Batteries, electrolysis, and fuel cells
- Advanced forecasting

### Era 5: advanced systems

Key unlocks:

- Offshore wind and marine generation
- Small modular reactors
- Combined-cycle gas
- Carbon capture
- Enhanced geothermal
- Hydrogen turbines and storage
- Nuclear reprocessing and mixed-oxide fuel
- Smart-grid and flexible-demand controls

### Era 6: closed cycles

Key unlocks:

- Fast and breeder reactors
- High-temperature and molten-salt reactors
- Thorium-compatible fuel cycles
- Floating nuclear and floating wind
- Advanced material recycling
- High-temperature electrolysis
- Long-duration and seasonal storage

### Era 7: fusion

Key unlocks:

- Experimental fusion research machines
- Fusion–fission hybrid systems
- Demonstration fusion
- Commercial tokamak and stellarator branches
- Inertial-confinement branch
- Tritium breeding, advanced superconductors, and robotic maintenance

## Major branches

### Exploration and construction adaptation

`local exploration → explorer I → explorer II → explorer III → remote expedition capability`

Explorer research increases the maximum sector distance that can be explored and acquired from the campaign centre. It does not by itself permit entry into every biome.

Biome branches split exploration from construction, for example:

`cold exploration → cold surveying → cold construction → extreme-cold engineering`

`desert exploration → arid surveying → desert construction → extreme-heat engineering`

Equivalent data-defined branches may cover wetland, mountain, volcanic, coastal, and offshore environments.

- **Exploration research** permits entering/revealing sectors with the biome tag.
- **Survey research** improves deposit and site estimates where specialized equipment is justified.
- **Construction research** permits ordinary facilities and grid infrastructure in that biome.
- **Advanced adaptation** improves construction cost, reliability, maintenance, or plant performance there.

General explorer range and biome permissions are cumulative prerequisites. A distant cold sector requires both sufficient explorer level and cold exploration; building there additionally requires cold construction.

### Forestry and biomass

`forestry → replanting/rotation → charcoal → wood steam → biomass/biogas → gasification/carbon capture`

### Mechanical engineering

`carpentry → gearing/shafts → improved wheels/mills → pumps → steam machinery → turbines`

### Materials

`prospecting → quarry/iron/copper → smelting → steel/concrete/glass → electronics → advanced alloys/recycling`

### Grid

`dynamo → cable → transformer → high-voltage grid → automation → smart grid → superconducting systems`

### Water

`waterwheel → reinforced wheel → hydro turbine → small/reservoir hydro → pumped storage`

### Wind

`windmill → dynamo windmill → iron/steel turbine → utility wind → offshore → floating offshore`

### Thermal fuels

`charcoal steam → coal/oil steam → steam turbine → gas turbine/combined cycle → capture/conversion`

### Solar

`glass + copper + electronics → photovoltaics → utility tracking → concentrated solar/thermal storage`

### Geothermal

`survey → heat well → steam/binary plant → enhanced geothermal → superhot rock`

### Nuclear

`nuclear physics → fuel fabrication → conventional reactor → SMR/high-temperature reactor`

`spent fuel → reprocessing → mixed-oxide fuel → fast reactor → breeder/closed cycle`

`advanced chemistry → molten-salt/thorium-compatible systems`

### Hydrogen

`electrochemistry → electrolyser → storage → fuel cell/turbine → combined cycle/high-temperature electrolysis`

### Fusion

`plasma physics → experiment → demonstration → tokamak/stellarator/inertial branches`

`fusion research + nuclear recycling → fusion–fission hybrid`

## Upgrade semantics

Research unlocks three different actions:

1. **Operational upgrade:** improve a subsystem with limited downtime.
2. **Major retrofit:** change fuel, cooling, controls, or major equipment with substantial materials and downtime.
3. **Replacement design:** decommission old equipment and construct a successor while retaining eligible site and grid infrastructure.

Mutually exclusive upgrades create specialization, such as wet versus dry cooling, low-wind versus storm-resistant rotor, or maximum efficiency versus fast ramping.

## Validation requirements

At data-load or build time, detect:

- Duplicate IDs
- Missing references
- Cycles
- Unreachable nodes
- Unlocks without definitions
- Required resources unlocked after their first mandatory use
- Research facilities that require their own unlock
- Invalid graph/UI positions
- Nodes with no effect

Generate a development report containing the complete unlock order, resource dependencies, unreachable content, and estimated research costs.

## Opening tutorial path

1. Forestry
2. Waterwheel or windmill
3. Sawmill and mechanical workshop
4. Charcoal and prospecting
5. Surface iron and copper mining
6. Smelting and wire drawing
7. Electromagnetism and dynamo
8. First electricity
9. Cable and town contract
10. Reinforced wheel/turbine, wind alternative, or charcoal backup
11. Research explorer range and choose the first biome adaptation for outward expansion

This pre-electric phase should teach the foundation in roughly 15–30 minutes for a new player rather than delaying the main game for hours.

