"""Write delivery facts from the actual validated manifest."""
from pathlib import Path
import json
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
manifest=json.loads((ROOT/'public/models/tessera/manifest.json').read_text())
report=json.loads((HERE/'validation.json').read_text())
rows='\n'.join(f"| {a['id']} | {a['triangles']:,} | {a['drawCalls']} |" for a in report['assets'])
text=f'''# Tessera Blender asset pack — reference iteration

14 low-poly assets for Tessera, authored against the supplied October 7, 2026 turnaround references. Editable Blender geometry, standalone GLBs, reproducible build scripts, renders and a Three.js review page are included.

## Deliverables

- `tessera-assets.blend`: editable asset studio at game scale.
- `../../public/models/tessera/`: 14 GLBs and their manifest.
- `../review/`: local interactive GLB viewer with populated board, palette controls and close-up inspection.
- `previews/`: actual Blender renders, including reverse views, board context and independent commodity colours.
- `reviews/`: frozen checkpoint evidence and reviewer reports.
- `validation.json` and `roundtrip-validation.json`: export, attribute, clearance and re-import checks.
- `INTEGRATION.md`: mounting and material contracts for the existing game.

The current GLBs total **{report['totalBytes']:,} bytes** and **{report['totalTriangles']:,} triangles**. They have vertex colours and no external textures or decoder dependencies. Triangle counts exceed the labels printed on the reference sheets; those labels are recorded in validation rather than represented as achieved budgets. The pack is a detailed low-poly iteration, not a completed game integration or a certified AAA release.

| Asset | Triangles | Material draws |
| --- | ---: | ---: |
{rows}

## Art direction and corrections

Saturated faceted landscapes, cream stone and warm timber, broad player-coloured roofs, blue/red road rails and centre paving. Gameplay reserves an empty token centre and clear road shoulders. Metropolis peripheral roofs remain the player colour; its tallest roof and central banner use a separate commodity colour: paper green `#28753d`, coin silver-grey `#a5afb9`, wool light green `#a3d467`.

The structural pass closes roof undersides, joins chimney shafts and rims, seats crowns and finials, supports porches and shelter roofs, grounds rock bases and props, and builds recessed mine and kiln interiors with rails continuing into them. Ships use supported spar fittings, stern decks, and conforming sail emblems.

## Source and reuse

Game source inspected through GitHub: https://github.com/Julz0711/tessera, branch `feat/game`, tree `9b822013c3008a001fb1e719d1a8b78a5d801d7e`. This workspace contains asset work; the remote game has not been modified or deployed. The Three.js viewer is a representative board, not the React game application.

The user-supplied `classic_blend.zip` is preserved externally. An extracted copy is under `assets/imported/higgsfield/classic_blend/`. The pasture uses its `hf_sheep.blend` geometry and original corner colours, resized and grounded for this board. The supplied source sheep is 1,668 triangles before placement. Other imported files are preserved for comparison, not silently substituted into the pack. Asset provenance is user-supplied; this work does not independently establish the source service's distribution rights.

## Rebuilding

Requires Blender 5.2.2 LTS, verified at `E:/Steam/steamapps/common/Blender/blender.exe`. Run from the repository root:

```powershell
& 'E:/Steam/steamapps/common/Blender/blender.exe' --background --factory-startup --disable-autoexec --python assets/blender/run_checkpoint.py -- build full
```

`architecture_v2.py`, `landscape_v2.py` and `navy_v2.py` author the current geometry. `hf_imports.py` reads source mesh data without executing embedded scripts. Each export is one combined mesh with named material groups and editable loose components. These are game-rendering meshes, not fabrication solids. Ships and flags are static.

Serve the repository over localhost and open `/assets/review/`. Inspect includes whole assets and detail views for chimney, porch, crown, sheep, shelter, mines and kiln. Toggle shadows to distinguish shading artifacts from geometry; front/side/rear and auto orbit aid inspection.

Hunyuan3D remains deferred at the user's request.
'''
(HERE/'README.md').write_text(text,encoding='utf-8')
