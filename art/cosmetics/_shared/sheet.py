"""Review sheet: full-body and portrait renders of each variant, plus lobby-size (150 px) and 64 px checks.

    py art/cosmetics/_shared/sheet.py <item folder> [out.png]
"""
import sys
from pathlib import Path

from PIL import Image

folder = Path(sys.argv[1])
out = Path(sys.argv[2]) if len(sys.argv) > 2 else folder / "review.png"
variants = sorted(p.stem.split("-")[1] for p in folder.glob("preview-*.png"))
BG = (42, 33, 27, 255)
full = Image.open(folder / f"preview-{variants[0]}.png").size[0]
por = Image.open(folder / f"portrait-{variants[0]}.png").size[0]
sheet = Image.new("RGBA", (len(variants) * (full + por), max(full, por + 170)), BG)
for i, v in enumerate(variants):
    x = i * (full + por)
    f = Image.open(folder / f"preview-{v}.png").convert("RGBA")
    p = Image.open(folder / f"portrait-{v}.png").convert("RGBA")
    sheet.alpha_composite(f, (x, 0))
    sheet.alpha_composite(p, (x + full, 0))
    sheet.alpha_composite(f.resize((150, 150), Image.LANCZOS), (x + full + 10, por + 10))
    sheet.alpha_composite(p.resize((64, 64), Image.LANCZOS), (x + full + 175, por + 50))
sheet.convert("RGB").save(out)
print(out)
