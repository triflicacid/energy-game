# Sprites and texture atlases

## Decision summary

EnergyGame should use generated sprite sheets (texture atlases), but should not require handwritten JSON sprite metadata.

Recommended pipeline:

1. Keep each source sprite as an individual image or generated asset.
2. Run a deterministic build script that validates and positions sprites in one or more atlases.
3. Emit the atlas PNG and a generated TypeScript descriptor containing source rectangles and anchors.
4. Reference sprites from data-driven facility definitions through stable sprite IDs.

A uniform arithmetic grid with no descriptor is acceptable for a sheet containing only same-sized one-cell tiles. Buildings vary in size, may overhang their occupied cells, and may have animation or overlays, so their atlas needs generated metadata somewhere. Generated TypeScript provides that information without maintaining a separate handwritten runtime JSON file.

## Goals

- Efficient loading and drawing
- Stable data-driven sprite IDs
- Support one-cell and multi-cell buildings
- Keep gameplay footprints independent from image dimensions
- Make atlas placement reproducible
- Avoid manually calculating source coordinates
- Permit procedural and artist-created sprites
- Support variants, upgrades, animation, and overlays later

## World-cell composition

World visuals use layers rather than self-contained scene images:

- Every visible cell first receives one opaque `biome-*` background tile.
- Physical objects are transparent overlays. Forests, towns, reservoirs, and facilities must leave the biome visible wherever they do not paint the object itself.
- An overlay may include local scenery that is integral to its subject. In particular, the built waterwheel retains its river and bank along the bottom of the sprite; it does not repaint the whole biome background.
- Semantic site suitability is gameplay data, not a visible object. `general-site` and `waterwheel-site` do not have placeholder sprites. A waterwheel is drawn only after a waterwheel facility exists.
- A forest is different from an invisible build opportunity: standing forest is a physical resource and therefore remains visible as the `forest-site` overlay.

### Canonical world draw order

Draw a cell from back to front:

1. Opaque biome background.
2. Ground-level overlays, including connected reservoir water.
3. Persistent resources and entities, including forests and towns.
4. Constructed facilities and their physical construction/operation effects.
5. Transient interaction graphics: construction suitability, placement footprint, selection, warnings, and other UI effects.

The renderer must not choose gameplay state from sprite transparency or draw order. The simulation supplies biome, entities, facilities, topology, and placement eligibility; rendering only presents that state.

### Construction mode

When the player selects a facility to build, the application evaluates its real placement rules, including valid site tags, ownership/unlock state, biome or research restrictions, occupancy, footprint, and other facility requirements. Eligible cells or footprints receive a faint runtime outline. This highlight:

- Is drawn by the renderer as a transient vector/UI overlay, not loaded from a site-placeholder sprite.
- Uses the gameplay footprint rather than the completed sprite's opaque bounds.
- Disappears when construction mode ends and does not imply that a facility already exists.
- Must update when the candidate facility, rotation, ownership, occupancy, or other relevant placement state changes.

An optional construction-progress sprite, scaffolding, or effect may represent a facility after construction has actually begun. It must not be used as the pre-construction suitability marker.

### Sprite art direction

Preserve the established simple, muted pixel-art style:

- Buildings, towns, resources, and similar objects use a readable side-on or front-on elevation rather than a top-down or isometric view. A slight side face is acceptable when it helps describe the structure, but avoid strong perspective that conflicts with neighboring sprites.
- Author one logical pixel as an integer unit in the SVG `viewBox`; the current one-cell convention is `16 × 16` logical pixels rendered at `64 × 64` output pixels.
- Build artwork from integer-aligned rectangles with `shape-rendering="crispEdges"`. Avoid antialiasing-dependent curves, gradients, blur, filters, fractional coordinates, and smooth vector detail.
- Favor clear silhouettes, large block shapes, restrained dark outlines/shadows, and a few purposeful highlights over texture noise or tiny decoration.
- Use the existing subdued earthy palette and limited per-sprite color count. Biomes may vary the palette, but overlays should remain visually coherent when placed over any compatible background.
- Treat polish as improving readability, proportions, and silhouette while retaining the original visual character; do not redesign established sprites into a more elaborate style without a deliberate art-direction decision.
- Keep object backgrounds transparent and biome tiles opaque. Do not paint a generic sky or ground rectangle behind an overlay merely to make an individual source image look complete.
- Render with nearest-neighbor scaling and disabled image smoothing so logical pixels remain square and sharp.

### Current authored visual set

Multi-cell or overhanging art scales from the same logical grid: the workshop is two cells wide and the waterwheel extends below its one-cell anchor.

The current opaque biome backgrounds are:

- `biome-temperate`
- `biome-cold`
- `biome-desert`
- `biome-wetland`
- `biome-mountain`
- `biome-volcanic`
- `biome-coastal`
- `biome-offshore`

The mountain tile must read as mountainous at cell scale, with two distinct peaks rather than a low generic ridge. Town presentation progresses through six transparent tiers, from a timber hamlet to a skyscraper metropolis, as defined in `plan/towns-and-contracts.md`. Reservoir variants are generated from the cardinal-mask convention later in this document so matching edges cannot drift apart.

## Asset categories

Use a small number of atlases grouped by rendering characteristics rather than one unlimited image.

Possible groups:

- Terrain or sector tiles
- Buildings and power plants
- Grid infrastructure, cables, and substations
- Physical resource and entity overlays
- Construction and upgrade overlays
- Animated effects
- UI icons, if CSS/individual SVG use is not more appropriate

Reasons to split atlases include:

- Browser/GPU texture-size limits
- Different filtering or scaling rules
- Different update cadence
- Avoid loading late-game assets before they are needed
- Easier regeneration and review

Do not create one atlas per building. Do not force every visual asset into one global atlas.

## Source assets

Source sprites should have stable file or manifest IDs, for example conceptually:

```text
assets/sprites/buildings/waterwheel.png
assets/sprites/buildings/wooden-windmill.png
assets/sprites/buildings/mechanical-workshop.png
assets/sprites/grid/wooden-cable-pole.png
```

The final naming convention should be consistent with content IDs but need not expose filesystem paths to simulation code.

Sources may be:

- Hand-authored PNGs
- SVGs rasterized by the build process
- Images generated procedurally by scripts
- Separate animation frames

The atlas script packs existing source images. A separate generator may create source sprites when procedural art is useful. Packing and drawing/generation should remain conceptually separate so an artist can replace one sprite without rewriting the atlas layout.

## Atlas generation script

The build script should:

1. Discover or read a manifest of source sprites.
2. Validate unique sprite IDs.
3. Validate dimensions and expected tile/footprint constraints.
4. Sort inputs deterministically.
5. Pack images into one or more atlas pages.
6. Add padding/extruded edge pixels to prevent texture bleeding.
7. Write atlas PNG files.
8. Write a generated TypeScript descriptor.
9. Fail with clear diagnostics for duplicate IDs, missing files, invalid frames, or oversized sprites.

The same inputs and tool version must produce the same atlas placement and generated descriptor. Generated output should contain a notice that it must not be edited manually.

The script should support a verification/check mode for CI that fails when generated outputs are stale.

The world manifest uses explicit `atlasRow` categories so generated sheets are easy to inspect without making source coordinates part of the public contract:

0. Biome backgrounds
1. Reservoir-water autotiles
2. Forest and town/entity overlays
3. Constructed facilities

Every sprite in a manifest that opts into explicit rows must declare a row. A category must fit on one atlas shelf; generation should fail clearly rather than silently split that category. Runtime code still resolves sprites by ID through the generated descriptor and must not rely on these row numbers.

## Generated descriptor

The generated TypeScript descriptor should provide, per sprite or frame:

- Stable sprite ID
- Atlas/page ID
- Source rectangle (`x`, `y`, `width`, `height`)
- Draw anchor/origin
- Optional frame sequence and timing reference
- Optional visual bounds used for culling

It should not define gameplay behavior, price, research, construction materials, or occupied footprint. Those belong in validated content definitions.

Generating a TypeScript module rather than JSON provides:

- Typed sprite IDs where practical
- No runtime metadata fetch
- Build-time duplicate checks
- Tree/build integration
- A single generated source of atlas coordinates

If future modding requires runtime-provided assets, JSON descriptors can be added at that boundary later. They are not required for the bundled game.

## Gameplay footprint versus sprite size

A facility has two separate concepts.

### Gameplay footprint

Defined in the data-driven facility content:

- Width and height in map cells
- Occupied/blocked cells, if not rectangular
- Placement and site requirements
- Connection points where needed
- Rotation support

The footprint controls placement, collision/occupancy, selection, construction, and demolition.

### Visual sprite

Defined by the atlas descriptor:

- Pixel dimensions
- Source rectangle
- Draw anchor
- Visual/culling bounds

A sprite may be taller or wider than its footprint. For example, a one-cell wind turbine base may have blades extending over neighboring cells without occupying them. Transparent pixels never determine gameplay occupancy.

## Multi-cell buildings

Most fixed multi-cell facilities should use one composite sprite spanning their full visual area.

Example conceptual facility data:

```text
footprint: 3 × 2 cells
spriteId: coal-steam-plant
anchor: generated visual descriptor
```

At render time:

1. The facility instance identifies its origin cell and rotation.
2. Gameplay uses the facility definition's footprint to determine occupied cells.
3. Rendering converts the origin cell to screen coordinates.
4. The generated sprite anchor offsets the composite image correctly.
5. Selection/placement highlights use the gameplay footprint, not the sprite rectangle.

Benefits of one composite image:

- Simple draw call
- Consistent building art
- No seams between cells
- Easy construction and condition variants

## Non-rectangular footprints

A facility may occupy a mask rather than every cell in its bounding rectangle. This should be exceptional because it increases placement and UI complexity.

If supported, the facility definition supplies normalized occupied-cell offsets. Rotation transforms the offsets. The sprite remains a single composite image.

Do not infer masks from transparency.

## Structures better rendered from pieces

Some structures should not use one fixed composite sprite:

- Cables and transmission lines
- Roads, if ever added
- Pipelines
- Large variable-size solar or wind farms
- Reservoir boundaries
- Construction scaffolding

These use modular sprites selected from connection/topology state, such as straight, corner, junction, endpoint, and crossing pieces.

The atlas descriptor still identifies the individual pieces. Gameplay/network state chooses the piece; rendering does not alter connectivity.

A large farm can be represented as one facility with a footprint while visually repeating modules within it, avoiding a unique giant image for every possible farm size.

### Reservoir water autotiles

Reservoir water uses 16 transparent cardinal-neighbour variants named `reservoir-water-00` through `reservoir-water-0f`. The hexadecimal suffix is a stable connection mask:

- North = `0x1`
- East = `0x2`
- South = `0x4`
- West = `0x8`

The set covers the isolated rounded pond, four endpoints, two straights, four corners, four T-junctions, and the fully connected tile. A connection is present only when the adjacent cardinal cell belongs to the same reservoir visual join group. Diagonal-only contact does not join, and different reservoirs do not join merely because their cells touch.

These pieces are a presentation overlay drawn over the biome and below dams, powerhouses, and other facility sprites. Their visual cell count and shape do not determine reservoir capacity, facility footprint, water balance, or simulation connectivity.

## Building states and upgrades

Do not require a unique full sprite for every numeric upgrade.

Use one of:

- Base sprite plus small overlay
- Alternative sprite for a major visible retrofit
- Animation/effect layer for operation
- Tint/status overlay for construction, damage, outage, or selection
- Full successor sprite when the facility is physically replaced

Content definitions can reference visual-state IDs for meaningful variants. Atlas coordinates remain in generated descriptors.

Examples:

- A dynamo attachment adds an overlay to a waterwheel.
- Iron reinforcement may use an alternate wheel sprite or reinforcement overlay.
- A modern hydro station is a successor facility with a new sprite.
- Smoke, steam, rotating blades, and power-flow highlights are separate animated/effect layers.

## Animation

Animation should use frame sequences generated into an atlas descriptor.

Possible animated parts:

- Waterwheel rotation
- Windmill/turbine blades
- Steam and smoke
- Generator activity
- Construction
- Electrical effects

Prefer separating a moving component from a large static building where practical. For example, draw a static wind-turbine tower plus animated rotor frames rather than duplicating the tower in every frame.

Animation is visual only. It reflects simulation state but does not determine production timing or output.

## Rotation

The implementation should not assume arbitrary image rotation unless the art style supports it.

Options:

- Generate explicit north/east/south/west variants.
- Allow 90-degree canvas rotation for symmetric/simple top-down art.
- Mark facilities as non-rotatable.

Gameplay footprints and connection points must rotate through deterministic cell transforms. Visual orientation is selected independently through its sprite/variant ID.

## Anchoring and drawing order

Choose one consistent facility origin convention, such as the footprint's top-left cell for gameplay. Each sprite descriptor then supplies the pixel anchor that aligns the visual base to that origin.

For top-down rendering, draw order can primarily use:

- Render layer
- Footprint base row or anchor row
- Stable facility ID as a deterministic tie-breaker

For the current world-layer contract, use the canonical order in [World-cell composition](#world-cell-composition). Future underground infrastructure, cables, tall components, and weather effects must be inserted deliberately without violating the core rule that biome backgrounds are behind transparent world objects and transient interaction graphics are in front.

If art becomes isometric, depth sorting needs a separate reviewed design; do not build isometric complexity pre-emptively.

## Tile resolution and scaling

Select one logical cell size for authored world art. The exact pixel dimensions should be chosen after a visual prototype rather than fixed by architecture.

Rules:

- Keep world-space cell size independent from screen zoom.
- Scale the canvas for device pixel ratio.
- Choose smoothing consistently with the art style.
- Snap source rectangles to integer pixels.
- Add atlas padding so zoom/filtering does not sample neighboring sprites.
- UI icons need not use the same logical size as world sprites.

## Content references

A facility definition references semantic visual IDs, for example:

- Default sprite ID
- Optional construction-progress sprite/overlay for a facility that already exists in an under-construction state
- Optional operating animation ID
- Optional major-upgrade visual variants

Simulation code does not import the atlas descriptor and does not know source rectangles. The renderer resolves semantic IDs through a visual catalog.

Missing visual IDs should produce a development validation error and a visible fallback marker in non-production builds rather than silently drawing the wrong sprite.

## Loading and caching

The renderer should:

- Load each atlas once
- Decode it before first use where practical
- Cache atlas/page image objects
- Draw by source rectangle
- Avoid extracting a separate bitmap for every facility instance
- Cull sprites using generated visual bounds

Static sector layers may later be cached in offscreen canvases, but facilities that change state or animate should remain independently drawable.

## Build integration

Suggested workflow:

- Source images live outside generated/static output.
- Atlas generation runs explicitly during asset development and in a verification mode during CI/build.
- Generated descriptors are imported by rendering code.
- Generated PNGs are copied or emitted to the web asset output.
- The client build fails if required generated assets are missing or stale.

Do not regenerate large atlases unconditionally on every hot-reload event if that makes development slow. Watch only asset sources or provide a dedicated asset-watch process.

## Testing and validation

Automated tests should cover:

- Deterministic packing
- Duplicate sprite IDs
- Missing source files
- Source rectangle bounds
- Padding and page-size limits
- Generated descriptor consistency
- Multi-cell anchor calculations
- Footprint rotation/masks
- Culling bounds
- Modular network-piece selection
- Explicit atlas-row grouping and oversized-row diagnostics
- Missing visual-reference diagnostics

Visual tests should include:

- One-cell facility
- Multi-cell facility
- Sprite overhanging its footprint
- Rotation variants
- Animated overlay
- Biome background visible through transparent object overlays
- Reservoir edge joins for all 16 cardinal masks
- Placement and selection highlight alignment
- No placeholder art for invisible site suitability
- Adjacent atlas sprites at multiple zoom levels to detect bleeding

## Initial implementation scope

For the first visual slice, implement only:

- One generated world atlas page
- Opaque biome backgrounds and transparent source overlays for forest/forestry, waterwheel, workshop, and town tiers
- Sixteen cardinal reservoir-water autotiles
- Deterministic atlas generator
- Generated TypeScript descriptor
- One-cell and one multi-cell test facility
- Layered biome/overlay rendering and footprint-aligned placement/selection rendering
- Faint runtime construction-suitability outlines; no `general-site` or `waterwheel-site` placeholder art
- A visible missing-sprite fallback

Defer animation, rotation variants, modular cable art, atlas page splitting, and upgrade overlays until the underlying facility/render model needs them.

## Final rule

Use spritesheets for efficient rendering, but treat the sheet as generated output rather than an authoring surface.

- Authors and scripts create individual named sprites.
- Content defines facility footprints and references semantic sprite IDs.
- The atlas generator chooses placement and emits typed coordinates/anchors.
- The renderer combines runtime position, content footprint, and generated visual metadata.

This supports multi-cell buildings without coupling gameplay occupancy to image layout or requiring handwritten JSON atlas metadata.

