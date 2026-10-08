"""Package the validated source, required imports, actual GLBs, and review evidence."""
from pathlib import Path
import hashlib,json,zipfile

ROOT=Path(__file__).resolve().parents[2]
HERE=ROOT/'assets/blender'
DIST=ROOT/'dist'
DIST.mkdir(exist_ok=True)
validation=json.loads((HERE/'validation.json').read_text())
roundtrip=json.loads((HERE/'roundtrip-validation.json').read_text())
assert validation['passed'] and all(a['passed'] for a in roundtrip['assets'])
models=sorted((ROOT/'public/models/tessera').glob('*'))
files=sorted(HERE.glob('*.py'))+sorted(HERE.glob('*.md'))
files += [HERE/'tessera-assets.blend',HERE/'validation.json',HERE/'roundtrip-validation.json']
files += sorted((HERE/'previews').glob('*.png'))
files += [p for p in (HERE/'reviews').rglob('*') if p.is_file() and 'checkpoint-' in str(p)]
files += [p for p in (ROOT/'assets/review').rglob('*') if p.is_file() and p.suffix!='.log']
files += [ROOT/'assets/imported/higgsfield/classic_blend/hf_sheep.blend']
files += models
files=sorted(set(files))
hashes={str(p.relative_to(ROOT)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
(DIST/'asset-pack-sha256.json').write_text(json.dumps(hashes,indent=2)+'\n')
for name,entries in [('tessera-blender-asset-pack.zip',files),('tessera-glb-assets.zip',models+[HERE/'INTEGRATION.md',HERE/'validation.json'])]:
    with zipfile.ZipFile(DIST/name,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for p in entries:z.write(p,str(p.relative_to(ROOT)))
        z.write(DIST/'asset-pack-sha256.json','asset-pack-sha256.json')
    with zipfile.ZipFile(DIST/name) as z:assert z.testzip() is None
    print(name,(DIST/name).stat().st_size,'bytes',len(entries),'files')
