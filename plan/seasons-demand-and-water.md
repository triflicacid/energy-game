# Seasons, demand, and water

## Purpose

Seasons create forecastable planning problems across both supply and demand. They must do more than apply one global renewable multiplier.

Seasonal variables include:

- Day length and solar intensity
- Temperature
- Wind distribution
- Rainfall, snowmelt, and water inflow
- Reservoir evaporation
- Forest growth and harvest accessibility
- Heating and cooling demand
- Agricultural or tourism load
- Storm, drought, flood, freeze, and fire risk

## Annual cycle

### Winter

- High heating and lighting demand
- Weak solar output
- Often stronger but stormier wind
- Possible frozen-water constraints
- Low forest growth
- Greater fuel-stockpile value

### Spring

- Strong river inflow and hydro output
- Rapid forest growth
- Moderate electricity demand
- Flood and spill risk
- Good maintenance window

### Summer

- Strong solar output
- Cooling, irrigation, and water-pumping demand
- Lower river flow and higher evaporation
- Cooling constraints on thermal and nuclear plants
- Drought and fire risk

### Autumn

- Harvest, food-processing, and drying demand
- Increasing heating demand
- Often useful wind generation
- Time to refill fuel and storage before winter

Region climate archetypes modify these patterns.

## Weather and forecasting

Weather should be deterministic for a seed and presented through forecasts:

- Seasonal outlook: broad probabilistic range
- Seven-day forecast: useful but imperfect
- Twenty-four-hour forecast: highly accurate
- Current conditions: exact

Research improves forecast horizon and accuracy through measurement, meteorology, smart meters, and demand modelling.

Unexpected events should be uncommon, bounded, and preferably telegraphed. Difficulty should come from planning under uncertainty rather than invisible dice rolls.

## Renewable output

Each renewable plant combines:

- Regional potential
- Current season and weather
- Installed capacity
- Technology-specific response curve
- Plant condition
- Curtailment or site saturation

Examples:

- Solar uses daylight, irradiance, clouds, snow, panel orientation, and temperature.
- Wind uses a turbine power curve, cut-in/rated/cut-out speeds, storms, and wake/site limits.
- Run-of-river hydro uses current flow and environmental minimum release.
- Reservoir hydro uses stored water and dispatch policy.
- Forestry uses seasonal growth, moisture, and harvest policy.
- Tidal output is highly predictable; wave output follows sea conditions.

## Town demand

Demand combines:

- Consumer category
- Hour of day
- Weekday/weekend
- Season
- Actual temperature/weather
- Population and growth
- Efficiency/electrification projects

The player receives current, next-day, seasonal-peak, and longer-range demand forecasts.

Useful interactions:

- Winter demand rises as solar falls.
- Summer solar overlaps daytime cooling but may not cover the evening peak.
- Wind may complement solar but remains variable.
- Reservoir hydro, fuel plants, and storage cover forecast peaks.
- Flexible electrolysis, pumping, charging, and industrial loads consume surplus energy.

## Regional water model

Water is a regional stock and flow, not generated terrain.

A region defines:

- Current stored water
- Natural and constructed storage capacity
- Seasonal inflow curve
- Weather-adjusted rainfall/snowmelt
- Evaporation
- Environmental minimum reserve/release
- Town and background use
- Groundwater recharge if applicable
- Water-site suitability

Per interval:

`next storage = current storage + inflow − withdrawals − evaporation − required releases`

A reservoir is a regional facility that increases controllable storage. No simulated lake shape or pipe routing is required.

The map may present a reservoir with transparent connected water tiles over the normal biome background. The renderer selects one of 16 north/east/south/west variants for each visual cell and joins only cardinal neighbors in the same reservoir visual group. This presentation shape is derived from state for readability; it never determines capacity, inflow, evaporation, facility footprint, water balance, or simulation connectivity.

## Water users

- Town drinking water and essential services
- Thermal and nuclear cooling
- Hydroelectric generation
- Electronics and fuel processing
- Hydrogen electrolysis
- Forestry/biomass where relevant
- Abstract agricultural demand

Default shortage priority:

1. Essential town use
2. Environmental minimum
3. Plant safety and essential cooling
4. Contracted industrial processes
5. Optional generation and manufacturing
6. Flexible loads

Policies may adjust nonessential priorities.

## Power-plant cooling

### Once-through cooling

- Low capital cost
- Very high withdrawal
- Returns most water at a higher temperature
- Requires strong flow and faces drought/temperature limits

### Wet cooling tower

- Moderate cost
- Lower withdrawal
- Significant consumption through evaporation
- Reduced hot-weather performance

### Dry cooling

- High cost
- Very low water use
- Efficiency and output penalty, especially in heat

### Seawater cooling

- Coastal only
- High available capacity
- Corrosion, intake, discharge, and construction costs

Cooling is a plant configuration with retrofit constraints, not a separate pipe-layout game.

## Hydro and reservoirs

A hydro site defines head class, flow, storage potential, capacity limit, and environmental flow. Relevant facility types are:

- Waterwheel
- Run-of-river turbine
- Small hydro
- Reservoir hydro
- Pumped storage

Reservoir decisions include:

- Generate now or save water for a forecast peak
- Maintain emergency reserve
- Prepare for drought or flood inflow
- Share water with towns and cooling
- Pump water uphill when electricity is cheap

## Suggested time model

Prototype with one simulation tick equal to one in-game hour and support pause plus speed controls. Tune real-time duration through testing; an initial target is a complete game year in roughly 1.5–3 hours at normal speed.

Construction, maintenance, research, forestry, and contracts use simulation time so pausing also pauses consequences.

