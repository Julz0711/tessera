"""Reuse user-supplied geometry and original linear corner colours, without running scripts."""
from pathlib import Path
import bpy,math
ROOT=Path(__file__).resolve().parents[2]/'assets/imported/higgsfield/classic_blend'
CACHE={}

def load(name):
    if name in CACHE:return CACHE[name]
    with bpy.data.libraries.load(str(ROOT/(name+'.blend')),link=False) as (src,dst):dst.objects=src.objects
    result=[];allverts=[]
    for obj in dst.objects:
        if obj and obj.type=='MESH':
            verts=[tuple(obj.matrix_world@v.co) for v in obj.data.vertices];allverts.extend(verts)
            attr=obj.data.color_attributes.get('Color')
            faces=[]
            for p in obj.data.polygons:
                cols=[tuple(attr.data[li if attr.domain=='CORNER' else obj.data.loops[li].vertex_index].color) for li in p.loop_indices] if attr else [(1,1,1,1)]*len(p.vertices)
                faces.append(([verts[i] for i in p.vertices],cols))
            result.extend(faces)
        if obj:bpy.data.objects.remove(obj,do_unlink=True)
    lo=[min(v[k] for v in allverts) for k in range(3)];hi=[max(v[k] for v in allverts) for k in range(3)]
    CACHE[name]=(result,lo,hi);return CACHE[name]

def append(m,name,x,y,z,size,rot=0):
    faces,lo,hi=load(name);factor=size/max(hi[k]-lo[k] for k in range(3));cx=(lo[0]+hi[0])/2;cy=(lo[1]+hi[1])/2
    c,s=math.cos(rot),math.sin(rot)
    for pts,cols in faces:
        transformed=[]
        for a,b,h in pts:
            aa=(a-cx)*factor;bb=(b-cy)*factor
            transformed.append((x+aa*c-bb*s,y+aa*s+bb*c,z+(h-lo[2])*factor))
        m.face(transformed,'#ffffff');m.corner_colors[len(m.f)-1]=cols
