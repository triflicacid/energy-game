# Towns and contracts

## Scope

Towns are semi-black-box electricity customers. The game simulates the properties relevant to an energy company but not streets, individual buildings, citizens, food, or municipal services.

Towns are independent entities placed within sectors:

- A sector may have no town, one town, or multiple towns.
- Each town has its own demand, grid connection, growth, and contracts.
- Several towns in one sector may share an upstream substation while retaining separate connection limits and settlement.
- Empty sectors remain useful for resources, reservoirs, generation, storage, or transmission corridors.

A town exposes:

- Population and growth trend
- Residential, commercial, public-service, and aggregated industrial load
- Daily, weekly, seasonal, and temperature-sensitive demand
- Current and forecast peak demand
- Grid connection capacity
- Reliability requirement
- Electricity price and active contracts
- Limited labor, industrial-development, and satisfaction indicators where needed

## Town archetypes

| Archetype | Demand character | Seasonal effect |
| --- | --- | --- |
| Rural village | Small residential and agricultural load | Heating and harvest peaks |
| Farming town | Pumps, refrigeration, and processing | Irrigation and harvest dependent |
| Mining town | Steady mine and worker load | May decline after local sector-reserve exhaustion and mine closure |
| Industrial town | Large, stable industrial load | High reliability requirement |
| Tourist town | Hotels and commerce | Summer or winter visitor peak |
| Port city | Logistics, refrigeration, and industry | Enables imports; relatively stable |
| Regional capital | Mixed and diverse | Morning/evening peaks and growth |
| Arctic settlement | Heating and essential services | Extreme winter peak |
| Desert city | Cooling and water pumping | Extreme summer peak |

## Demand model

Town demand is the sum of consumer-category loads. A readable approximation is:

`demand = base × hour factor × day factor × season factor × weather factor × growth factor`

Special industrial loads are then added. The UI must explain modifiers and show forecasts.

Priority classes support shortages:

1. Hospitals, emergency services, and critical water systems
2. Residential heating and essential public services
3. General residential and commercial load
4. Firm industry
5. Interruptible industry
6. Flexible loads such as electrolysis and vehicle charging

Automated load shedding follows priorities; advanced research may unlock player policies.

## Contracts

Electricity is sold at the receiving town connection, after grid losses and capacity constraints.

A contract defines:

- Town or customer ID
- Start, duration, and renewal terms
- Price per delivered MWh
- Minimum commitment and maximum accepted power
- Availability target
- Peak and off-peak rates
- Seasonal terms
- Shortage, blackout, and quality penalties
- Reliability bonuses
- Renewable, carbon, or source restrictions
- Whether demand is firm, interruptible, or flexible

### Contract types

- **Standard utility:** serve variable town demand at a regulated or fixed price.
- **Firm supply:** premium price and severe interruption penalties.
- **Interruptible supply:** lower price; player may curtail within agreed limits.
- **Seasonal supply:** tourism, irrigation, heating, or harvest demand.
- **Renewable supply:** requires qualifying generation and may pay a premium.
- **Capacity contract:** pays for available reserve, with failure penalties.
- **Spot/export sale:** variable price and no long-term guarantee.

## Town growth

Reliable, affordable electricity and employment allow demand to grow. Pollution, high prices, repeated blackouts, or mine closure can slow or reverse it.

Growth is forecast rather than surprising the player:

- Expected population range
- Expected base and peak demand next season/year
- Existing connection capacity
- Upgrade recommendation

The player influences growth only through energy-related interventions:

- Upgrade the connection
- Improve reliability
- Offer a tariff or contract
- Add district heating
- Fund efficiency, electrification, local storage, or demand response
- Approve a major industrial customer

### Visual growth tiers

Town markers visibly develop as population and demand grow. These are presentation tiers, not separately placed or simulated buildings:

1. **Timber hamlet:** a few low wooden huts.
2. **Wooden village:** larger and more numerous timber buildings.
3. **Stone town:** dense stone cottages and sturdier roofs.
4. **Brick/industrial town:** brick blocks, workshops, and chimneys.
5. **Modern city:** concrete and glass mid-rise buildings.
6. **Skyscraper metropolis:** a dense high-rise skyline.

The renderer selects the corresponding `town-tier-1` through `town-tier-6` visual from town growth state. Each tier is a transparent entity overlay drawn over the sector's normal biome background, not a replacement terrain tile. Simulation and save data must not contain atlas rectangles. The generic `town` visual remains the fallback when a tier cannot be resolved.

## Founding towns

The player may found a new town at a valid settlement site. This is a strategic energy-development action, not a city-building mode.

Founding requires a configurable combination of:

- Money and basic construction materials
- A suitable site in an owned/unlocked sector
- Initial electricity connection or a local generator
- Water availability
- A reason for settlement, such as a mine, plant, research site, port, or development charter

The player chooses a name and broad archetype/purpose, then the town constructs and grows internally. They do not place houses, roads, shops, or services.

A new town begins with small demand and high development cost, so it is not an immediate source of free revenue. Its value is to:

- Provide demand near remote generation
- Support extraction or research in an empty sector
- Establish a future regional grid hub
- Create a customer whose load profile the player can influence from its beginning

Growth requires reliable power and sufficient regional conditions. Founding multiple towns is constrained by suitable sites, capital, water, development time, and the demand/population growth model rather than an arbitrary hard cap.

## Major industrial customers

Ordinary industry remains inside town demand. Large energy-relevant loads may appear as explicit facilities or development proposals:

- Electric-arc steelworks
- Data center
- Electrolyser
- Aluminium smelter
- Desalination plant
- Recycling center
- Fuel-processing plant

These are primarily customers or player-owned energy processes, not a complete external commodity economy. A proposal specifies site requirements, power range, flexibility, reliability, duration, and local effects.

Spam is prevented by:

- Finite proposals and market demand
- Grid and site capacity
- Electricity opportunity cost
- Water and environmental limits
- Construction capital and time
- Town growth and connection constraints

Non-energy input logistics remain abstract unless later testing proves they add valuable energy decisions.

## Town decline and transition

A resource town may decline after a mine closes, reducing demand and creating redevelopment options. Existing connections and sites can attract:

- Recycling
- Energy storage
- Research
- Low-carbon industry
- Forestry processing
- Site restoration

The town reports energy consequences; the player does not manage housing or unemployment directly.

## First contract

The tutorial town should offer a small, forgiving contract after the first dynamo is built:

- Short local electrical connection
- Evening demand for lighting and water pumping
- Fixed price
- Modest reliability target
- Clear revenue and shortage feedback

The contract then grows enough to force the player to complement seasonal water power with wind, charcoal, or storage.

Later scenarios may start in an empty sector. In that case, the player can either connect to an existing town in a neighboring sector or found a small settlement after unlocking the required development capability.

