# Classic theme: Blender files

`blend/` holds every Classic model as a Blender file (made with Blender 5.2, textures packed in):

- `classic_all.blend`: everything in one file, one collection per row (pieces, ships, props, tiles).
- One file per model: `settlement`, `city`, `metropolis`, `knight`, `robber`, `road`, `wall`, `ship`, `pirate`,
  `longship`, `harbor`, `treasure`, `props` (all Blender-built tile props), `tiles`, and the Higgsfield props `hf_*`.

They are made from the game's GLBs (`public/models/classic`) by `tools/blender/export_blend.py`; run it again after
the models change. Colours: Blender-built models paint their colours into vertex colours; the Higgsfield pieces keep
their texture. Player colours are applied in the game (red parts of the texture, and the `player` / `playerdark` /
`accent` material slots), so here they show as painted. See `tools/README.md` for how the models are made.
