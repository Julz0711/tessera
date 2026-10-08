"""Add immutable content identifiers without changing exported geometry."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[2]
path=ROOT/'public/models/tessera/manifest.json'
m=json.loads(path.read_text())
for a in m['assets']:a['sha256']=hashlib.sha256((path.parent/a['file']).read_bytes()).hexdigest()
path.write_text(json.dumps(m,indent=2)+'\n')
print('Stamped',len(m['assets']),'GLB hashes')
