"""Background build and reproducible evidence, with no Blender UI dependency."""
from pathlib import Path
import sys,runpy
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['quick']
if 'build' in args or 'quick' in args:runpy.run_path(str(HERE/'build_assets.py'),run_name='__main__')
import review_assets as r
import check_geometry as g
if 'quick' in args:
    for name in ['settlement','metropolis','hex_pasture','hex_hills','hex_mountains']:r.individual(name)
if 'terrain-evidence' in args:
    import checkpoint as c
    for name in ['hex_gold','hex_mountains']:
        for view in ['hero','back','top']:r.individual(name,view)
    r.tiles();r.board();c.overhead()
if 'full' in args:
    import checkpoint as c
    for name in ['settlement','city','metropolis','road','ship','pirate_ship','barbarian_ship','hex_forest','hex_pasture','hex_fields','hex_hills','hex_mountains','hex_desert','hex_gold']:r.individual(name)
    for name in ['settlement','city','metropolis','ship','pirate_ship','barbarian_ship']:r.individual(name,'back')
    c.views();c.overhead();c.commodities()
if any(a in args for a in ['validate','quick','full']):
    assert not r.validate()['errors']
    assert g.run()['passed']
    r.roundtrip()
if 'full' in args or 'terrain-evidence' in args:
    number=next((int(a.split('=')[1]) for a in args if a.startswith('checkpoint=')),2)
    c.save_checkpoint(number)
