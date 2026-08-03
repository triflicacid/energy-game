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

## Asset categories

Use a small number of atlases grouped by rendering characteristics rather than one unlimited image.

Possible groups:

- Terrain or sector tiles
- Buildings and power plants
- Grid infrastructure, cables, and substations
- Resource/site markers
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

Explicit layers may include:

1. Ground/sector tiles
2. Underground or background infrastructure
3. Ground overlays and cables
4. Buildings
5. Tall/animated components
6. Selection, warnings, and effects

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
- Optional construction sprite/overlay
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
- Missing visual-reference diagnostics

Visual tests should include:

- One-cell facility
- Multi-cell facility
- Sprite overhanging its footprint
- Rotation variants
- Animated overlay
- Placement and selection highlight alignment
- Adjacent atlas sprites at multiple zoom levels to detect bleeding

## Initial implementation scope

For the first visual slice, implement only:

- One building atlas page
- Individual source sprites for forest/forestry, waterwheel, workshop, town, and site markers
- Deterministic atlas generator
- Generated TypeScript descriptor
- One-cell and one multi-cell test facility
- Footprint-aligned placement/selection rendering
- A visible missing-sprite fallback

Defer animation, rotation variants, modular cable art, atlas page splitting, and upgrade overlays until the underlying facility/render model needs them.

## Final rule

Use spritesheets for efficient rendering, but treat the sheet as generated output rather than an authoring surface.

- Authors and scripts create individual named sprites.
- Content defines facility footprints and references semantic sprite IDs.
- The atlas generator chooses placement and emits typed coordinates/anchors.
- The renderer combines runtime position, content footprint, and generated visual metadata.

This supports multi-cell buildings without coupling gameplay occupancy to image layout or requiring handwritten JSON atlas metadata.

