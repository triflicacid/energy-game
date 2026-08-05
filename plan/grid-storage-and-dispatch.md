# Grid, storage, and dispatch

## Electrical network

Represent the grid as a capacity-and-loss graph rather than a full AC power-flow simulation.

Nodes:

- Generators
- Storage
- Mechanical-to-electrical dynamos
- Substations
- Town/customer connections
- Flexible player facilities
- Region interconnections

Edges:

- Local distribution cable
- Medium-voltage line
- High/extra-high-voltage transmission
- Underground cable
- Submarine cable
- Later long-distance HVDC

Each edge defines construction cost, material bill, capacity, loss, distance, condition, maintenance, availability, and valid endpoint/region types.

## Delivery and settlement

Per interval:

1. Determine customer and player-facility demand.
2. Determine available plant capacity, fuel, water, and outages.
3. Dispatch must-run and controllable generation.
4. Route available power within edge and node capacities.
5. Charge storage from remaining economical supply.
6. Discharge storage and fast reserve if necessary.
7. Apply transmission and conversion losses.
8. Deliver to prioritized demand.
9. Settle revenue, curtailment, shortages, and contract penalties.

Electricity is sold only at the customer connection. A disconnected or congested generator does not automatically earn revenue.

## Mechanical networks

Before electricity, waterwheels and windmills provide facility-local mechanical capacity.

- Adjacent or explicitly linked machines draw from a shared mechanical-power pool.
- Short shaft/belt extensions add range and loss.
- A dynamo consumes mechanical capacity and supplies local electrical capacity.
- Avoid individual gear alignment or detailed shaft routing.

## Substations and voltage progression

Substations:

- Connect generation, storage, regions, and customers
- Change voltage tier
- Limit transfer capacity
- Combine or split connections
- Meter delivered energy
- Isolate faults after research

A town may have enough theoretical generation nearby but still experience shortages because its line or receiving substation is undersized.

## Dispatch categories

### Variable

Wind, solar, run-of-river, wave, and some tidal generation produce according to availability and are curtailed when unusable.

### Baseload/slow

Coal steam, conventional nuclear, and some geothermal have long start times, limited ramping, and economical continuous operation.

### Flexible

Reservoir hydro, gas engines, gas turbines, biomass, and some modern reactors follow demand within plant limits.

### Fast reserve

Batteries, flywheels, reservoir hydro, gas peakers, and fuel cells cover sudden changes and black start.

### Flexible consumption

Electrolysers, pumped storage, charging, water pumping, and some industrial processes increase load when electricity is abundant.

## Player control

Begin with automatic economic dispatch and simple policies:

- Plant priority order
- Minimum fuel or water reserve
- Storage charge/discharge thresholds
- Contract and critical-load priority
- Maximum allowed emissions or fuel price
- Flexible-load price threshold

Later research unlocks advanced scheduling, demand response, forecasting, reserve targets, and region-specific policies. Manual control remains possible but is not required every tick.

## Storage types

### Mechanical/early

- Flywheel: short duration, high power, low energy capacity
- Small mill pond: smooths waterwheel flow, not electrical storage

### Batteries

Progression may include lead-acid, lithium-ion, sodium-ion, and flow batteries. Differentiate:

- Power capacity
- Energy capacity
- Round-trip efficiency
- Self-discharge
- Cycle degradation
- Material cost
- Fire/environmental risk

### Pumped hydro

High capital and location restricted; long life and large capacity. Uses regional water but operates as a mostly closed transfer between reservoirs subject to loss/evaporation.

### Thermal storage

- Hot-water tank
- Molten salt with concentrated solar or high-temperature heat
- Industrial/process heat store

### Hydrogen

- Electrolyser + tank/cavern + fuel cell/turbine
- Low round-trip efficiency
- Valuable long-duration/seasonal capacity and industrial compatibility

### Compressed air or depleted-location storage

A later use for appropriate mines or reservoirs; moderate/long duration and geography dependent.

## Capacity versus energy

Always distinguish:

- **Power capacity (MW):** maximum instantaneous charge, discharge, generation, or transfer
- **Energy capacity (MWh):** total energy available over time

A 200 MWh battery limited to 25 MW cannot cover a 100 MW shortage, while a 100 MW/25 MWh battery can only cover it briefly.

## Reliability

Track at least:

- Energy-not-served
- Peak unmet power
- Contract availability
- Reserve margin
- Number/duration of interruptions
- Congestion and curtailment

Possible consequences:

- Reliability bonus
- Shortage or blackout penalty
- Town satisfaction/growth effect
- Contract nonrenewal
- Emergency-price purchases

Failures should arise mainly from visible condition, deferred maintenance, overload, fuel/water shortage, or forecast weather—not arbitrary punishment.

## Initial scope

MVP grid features:

- Local and regional cables
- Substation capacity
- Simple proportional or priority routing
- Edge loss and congestion
- Automatic dispatch with priority policy
- One battery type and reservoir storage
- Contract settlement at town nodes
- Forecast and historical charts

Do not initially implement reactive power, frequency waveform simulation, phase balance, or realistic AC optimal power flow.

