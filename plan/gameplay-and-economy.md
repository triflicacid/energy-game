# Gameplay and economy

## Player role

The player owns an energy and infrastructure company. They control:

- Forestry, mines, wells, and energy-fuel processing
- Energy-related material factories and recycling
- Power generation and storage
- Transmission connections and substations
- Research, construction, maintenance, retrofits, and decommissioning
- Electricity contracts with towns and major industrial customers

They do not manage individual residents, roads, shops, housing, or a complete commodity economy.

## Timescale loops

### Immediate: seconds to minutes

- Observe output and demand.
- Start, stop, or reprioritize controllable plants.
- Charge or discharge storage.
- Prevent shortages, line overloads, fuel starvation, and excessive curtailment.
- Construct, upgrade, or repair facilities.

### Planning: minutes to an hour

- Read weather, seasonal-demand, and reservoir forecasts.
- Stockpile fuel and prepare backup generation.
- Schedule maintenance during low-demand periods.
- Expand mines, factories, storage, and transmission.
- Select research and prepare its material prerequisites.

### Strategic: years and eras

- Replace or relocate extraction facilities as finite sector reserves are exhausted, and replace obsolete plants.
- Expand to new regions and larger town contracts.
- Transition from mechanical power to electricity and from carbon-intensive generation to advanced systems.
- Build increasingly circular material and nuclear-fuel cycles.

## Money

### Primary income

The principal income source is electricity delivered to towns under contracts:

`payment = delivered energy × contract price + bonuses − penalties`

Generated energy earns nothing unless it is delivered, stored for later, or consumed by a productive player facility.

Contract settlement can include:

- Fixed price per MWh
- Time-of-use or peak pricing
- Minimum guaranteed delivery
- Maximum accepted power
- Availability and reliability targets
- Renewable or emissions conditions
- Seasonal terms
- Shortage and blackout penalties
- Contract duration and renewal

### Later income

- Major industrial electricity contracts
- Capacity payments for maintaining reserve generation
- Grid-balancing and fast-response services
- Electricity exports to neighboring regions
- Heat contracts and district heating
- Sale of surplus energy materials
- Recovery or recycling services

These support the energy game and should not replace town supply as its economic center.

## Costs

- Facility construction materials and cash
- Research and prototype costs
- Fuel extraction or imports
- Factory and recycling energy
- Operating and maintenance costs
- Grid losses
- Water rights or treatment
- Decommissioning and waste storage
- Emergency imports and contract penalties

## Contract progression

### Early contracts

- Small nearby town
- Short cable
- Fixed price
- Low demand and forgiving reliability target
- Example objective: power streetlights and a water pump every evening

### Mid-game contracts

- Seasonal demand profiles
- Peak commitments
- Renewable-energy requirements
- Industrial and commercial load
- More severe reliability penalties

### Late contracts

- Wholesale or indexed pricing
- Firm, interruptible, and capacity products
- Cross-region delivery
- Carbon limits
- Demand response
- Long-duration commitments requiring resource and decommissioning planning

## Failure and recovery

A poor decision should be expensive but should not permanently deadlock a save.

Recovery routes include:

- Emergency material and fuel imports at punitive prices
- Renegotiating, declining, or allowing a contract to expire
- Temporary demand shedding
- Mothballed or emergency generators
- Selling reusable inventory
- Refurbishing instead of replacing a plant
- Researching efficiency or an alternative technology

Bankruptcy, if included, should be an explicit scenario condition rather than an accidental result of having exhausted the only accessible sector reserve. Emergency imports enter the same global company inventory as extracted and recovered goods.

## Player information

Decisions should depend on forecasts rather than hidden randomness. The UI should expose:

- Current and forecast generation
- Current, daily-peak, and seasonal-peak demand
- Delivered, curtailed, stored, and unmet energy
- Contract revenue and projected penalties
- Fuel runway at current use
- Sector reserve/endowment quantity, survey confidence, and decline forecast associated with each extractor
- Innate woodland viability/depletion risk and planted-forest lifecycle forecast
- Reservoir inflow, capture, fill, spill, and withdrawal forecast
- Global inventory contribution breakdown for fresh extraction, imports, and recovery
- Plant condition and scheduled downtime
- Material requirements for planned projects
- Expected construction and payback periods

## Progression currencies

Use a restrained set:

- **Money:** contracts, imports, operating costs, and construction
- **Materials:** goods in the single global company inventory used for construction, operation, retrofit, and recycling; unextracted sector reserves, standing woodland, and local water are not inventory
- **Research:** unlocks capabilities and designs
- **Time:** construction, experiments, maintenance, forestry growth, and fuel processing
- **Energy:** powers extraction, factories, recycling, and research

Avoid introducing separate prestige currencies unless testing demonstrates a need.

