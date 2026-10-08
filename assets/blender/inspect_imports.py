from pathlib import Path
import bpy,json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
src=ROOT/'assets/imported/higgsfield/classic_blend'
report=[]
for filename in ['hf_sheep.blend','hf_kiln.blend','hf_round_tree.blend','hf_fir.blend','hf_cactus.blend','hf_scarecrow.blend']:
    with bpy.data.libraries.load(str(src/filename),link=False) as (a,b):b.objects=a.objects
    for o in b.objects:
        if not o or o.type!='MESH':continue
        o.data.calc_loop_triangles()
        verts=[o.matrix_world@v.co for v in o.data.vertices]
        item={'file':filename,'name':o.name,'triangles':len(o.data.loop_triangles),'bounds':[[min(v[k] for v in verts) for k in range(3)],[max(v[k] for v in verts) for k in range(3)]],'materials':[],'attributes':[(a.name,a.domain,a.data_type) for a in o.data.color_attributes]}
        for mat in o.data.materials:
            item['materials'].append({'name':mat.name,'nodes':[(n.type,n.image.name if getattr(n,'image',None) else None) for n in mat.node_tree.nodes] if mat.use_nodes else [],'images':[(n.image.name,list(n.image.size),bool(n.image.packed_file)) for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image] if mat.use_nodes else []})
        report.append(item)
(src.parent/'inspection.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
