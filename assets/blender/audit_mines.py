"""Print the geometry intersecting the mine's reserved walking/rail approach."""
from pathlib import Path
import sys,bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
from terrain import terrain
from check_geometry import mine_approach_collisions
for name in ['mountains','gold']:
    m=terrain(name);source=bpy.data.scenes['Tessera_Asset_Studio'].objects[m.name]
    source.data.calc_loop_triangles()
    tris=[t for t in source.data.loop_triangles if min(t.vertices)>=m.prop_vertex_start]
    collisions=mine_approach_collisions(m,tris,source.data.vertices)
    for idx in collisions:
        t=source.data.loop_triangles[idx]
        print(name,idx,[tuple(round(c,4) for c in source.data.vertices[v].co) for v in t.vertices])
