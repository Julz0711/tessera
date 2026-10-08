# Integrating the Tessera Blender pack

The source repository was inspected through GitHub. No remote files, branches, or deployments were changed. These are asset deliverables; live browser integration remains a separate code change.

## Files and coordinates

Copy `public/models/tessera` into the game's public directory. Load each GLB with the existing Three.js / React Three Fiber stack. Files contain one mesh with one to four material primitives, vertex colors, normals, and no textures. No Draco or Meshopt decoder is needed.

Exports are Y-up, measured in the existing game's units. Blender sources are Z-up. Do **not** rotate the imported GLBs by 90 degrees. Object transforms in each export are neutral; the studio layout is not baked into the GLBs.

| File | Mounting contract |
| --- | --- |
| `settlement.glb`, `city.glb`, `metropolis.glb` | Local ground Y=0. Use the existing wrapper at `[x, TILE_TOP, z]`, including `pieceScale`. |
| `road.glb` | X along edge, length 0.6125, maximum width 0.148. Local bottom Y=-0.045. Mount at `[x, TILE_TOP + 0.06, z]`, rotation `[0, -angle, 0]`. Check existing wall trim and scaling against these updated bounds. |
| `ship.glb`, `pirate_ship.glb` | Bow +X, keel Y=0. Use existing waterline wrapper. The sail is wider than the hull, intentionally. Preserve the pirate wrapper's 1.6 scale. |
| `barbarian_ship.glb` | Bow +Z, keel Y=0. Preserve the barbarian wrapper's 1.7 scale. |
| `hex_*.glb` | Local tile center at origin; tile surface Y=0.13, underside Y=-0.15. Use `[x, producing ? 0.06 : 0, z]`. Pointy-top radius 1. |

Full tile meshes include both the cream base and the colored terrain top. Replace the existing tile base/top and terrain props together to avoid overlapping surfaces. Keep the existing number-token component, interaction targets, producing highlights, harbor logic, fog/ocean behavior, and game state. There are no baked token numbers in the GLBs. The studio number tokens are demonstration objects only.

Terrain names match the resource meaning: forest=lumber, pasture=wool, fields=grain, hills=brick, mountains=ore, plus desert and gold. There are no ocean/fog/robber/knight replacements in this reference set.

## Material contract

Preserve vertex colors on every primitive. Recolor only these named material slots:

| Name | Runtime color |
| --- | --- |
| `Tessera_Neutral` | Leave its white base factor and vertex colors intact. |
| `Tessera_Player` | `PLAYER_COLORS[color].hex` |
| `Tessera_PlayerDark` | `PLAYER_COLORS[color].dark` |
| `Tessera_Track` | Metropolis improvement-track accent |

Player/track primitives have white vertex colors so tinting produces the requested palette without baked blue contamination. Neutral mesh colors remain independent of the player. The metropolis peripheral roofs and side banners carry player color; its tallest roof and central banner carry commodity color, with a player-colored crown symbol. Use paper `#28753d`, coin `#a5afb9`, and wool `#a3d467`, following the user's specified naming and palette.

Clone or cache material instances by palette and opacity instead of mutating the shared GLTFLoader cache. Apply placement-preview opacity to every material, including neutral stone/timber, with consistent transparency and depth-write behavior. Preserve shadow flags and the existing appearance/ship animation wrappers. Shared geometries can be reused; dispose cloned materials without disposing geometry still used by other instances.

The classic `ThemeKit.Road` is decoration layered over an always-present primitive road. A full replacement should replace that base mesh in `pieces.tsx`, not add the GLB as decoration above it. Similarly, full hex tiles cannot be installed only through the current per-prop theme interface.

## Verified constraints

- All GLB files were parsed independently of the exporter. Exactly one mesh per file; no default cube, cameras, or lights.
- Exported triangle counts match the authoring meshes. The detailed iteration exceeds reference-sheet labels; exact counts and byte sizes are in the manifest and validation report.
- Valid finite positions, normalized normals, vertex-color attributes, and index ranges.
- Player-color material primitives contain white vertex colors.
- Every GLB was re-imported into Blender; maximum bounds difference is less than 0.00001 units.
- Terrain triangle projections stay outside radius 0.42. The current measured clearances are in `validation.json`.
- Prop geometry stays at least 0.10 units inside every hex edge. Tightest measured clearance is approximately 0.1054.
- The standalone Three.js viewer loads the actual GLBs and checks a populated board, independent colours, normal/far/overhead views, and detail views. Its downloaded performance report applies only to that machine and scene. Larger custom `pieceScale` values, interaction, animation and transparent previews still require checks in the game during integration.
