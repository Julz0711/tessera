"""Rendered review scenes and export validation. Import inside Blender after build_assets.py."""
from pathlib import Path
import math,json,struct,bpy
from mathutils import Vector
from meshkit import Mesh,rgba,materials,STONE,WOOD_DARK

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
OUT=HERE/'previews'
SOURCE=bpy.data.scenes['Tessera_Asset_Studio']

def setup():
    s=bpy.data.scenes.get('Tessera_Review')
    if s:
        for obj in list(s.objects):bpy.data.objects.remove(obj,do_unlink=True)
    else:s=bpy.data.scenes.new('Tessera_Review')
    if bpy.context.window:bpy.context.window.scene=s
    s.world=SOURCE.world
    s.render.engine=SOURCE.render.engine
    s.render.threads_mode='FIXED';s.render.threads=8
    s.view_settings.view_transform=SOURCE.view_settings.view_transform
    s.view_settings.look=SOURCE.view_settings.look
    s.view_settings.exposure=SOURCE.view_settings.exposure
    if s.render.engine=='CYCLES':
        s.cycles.samples=64;s.cycles.use_denoising=True
    s.render.image_settings.file_format=SOURCE.render.image_settings.file_format
    for obj in SOURCE.objects:
        if obj.type=='LIGHT' or obj.name=='Studio_Backdrop':
            o=obj.copy();s.collection.objects.link(o)
    c=SOURCE.camera.copy();c.data=SOURCE.camera.data.copy();s.collection.objects.link(c);s.camera=c
    return s

def asset(s,name,at=(0,0,0),scale=1,rot=0,color=None,commodity=None):
    source=SOURCE.objects.get(name)
    obj=source.copy();s.collection.objects.link(obj);obj.location=at;obj.scale=(scale,)*3;obj.rotation_euler=(0,0,rot)
    if color or commodity:
        obj.data=source.data.copy()
        for i,mat in enumerate(obj.data.materials):
            if color and mat.name in ['Tessera_Player','Tessera_PlayerDark']:
                new=mat.copy();node=next(n for n in new.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
                node.inputs['Base Color'].default_value=rgba(color[0] if mat.name=='Tessera_Player' else color[1]);obj.data.materials[i]=new
            elif commodity and mat.name=='Tessera_Track':
                new=mat.copy();node=next(n for n in new.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
                node.inputs['Base Color'].default_value=rgba(commodity);obj.data.materials[i]=new
    return obj

def camera(s,target,eye,span,w,h):
    s.camera.location=Vector(eye);s.camera.rotation_euler=(Vector(target)-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.ortho_scale=span
    s.render.resolution_x=w;s.render.resolution_y=h;s.render.resolution_percentage=100

def render(s,name):
    s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True,scene=s.name)
    print('RENDERED',name)

def individual(name,view='hero'):
    s=setup();source=SOURCE.objects[name]
    lo=Vector([min(v.co[k] for v in source.data.vertices) for k in range(3)])
    hi=Vector([max(v.co[k] for v in source.data.vertices) for k in range(3)])
    span=max(hi.x-lo.x,hi.y-lo.y,(hi.z-lo.z)*1.22)*1.23
    asset(s,name,(0,0,-lo.z))
    target=(0,0,(hi.z-lo.z)*.45)
    d=Vector((-3,-5,3.6)).normalized()
    if 'ship' in name and name!='barbarian_ship':d=Vector((4,-5,3.1)).normalized()
    if view=='back':d=Vector((-3,5,3.6)).normalized()
    if view=='top':d=Vector((0,-.0001,1))
    camera(s,target,Vector(target)+d*6,span,800,800)
    render(s,name+('' if view=='hero' else '-'+view))

def buildings():
    s=setup()
    for name,x in [('settlement',-1.65),('city',0),('metropolis',1.8)]:asset(s,name,(x,0,0),2.6)
    camera(s,(0,0,.73),(3,-9,5),6.3,1800,950);render(s,'buildings')

def navy():
    s=setup()
    for name,x in [('ship',-1.7),('pirate_ship',0),('barbarian_ship',1.7)]:asset(s,name,(x,0,0),2.6,math.pi/2 if name=='barbarian_ship' else 0)
    camera(s,(0,0,.55),(6,-10,5),5.9,1800,950);render(s,'ships')

def tiles():
    s=setup()
    names=['forest','pasture','fields','hills','mountains','desert','gold']
    for i,name in enumerate(names):asset(s,'hex_'+name,((i%4)*2.15-3.22,(i//4)*2.3,.15))
    camera(s,(0,1.0,.18),(1,-9,11),9.4,1800,1100);render(s,'terrain')

def board():
    s=setup();mats=materials()
    coords=[(0,0,'pasture',8),(1,0,'fields',6),(0,1,'forest',5),(-1,1,'mountains',10),(-1,0,'hills',9),(0,-1,'desert',0),(1,-1,'gold',4)]
    for q,r,name,n in coords:
        x=math.sqrt(3)*(q+r/2);y=1.5*r
        asset(s,'hex_'+name,(x,y,0))
        if not n:continue
        disc=Mesh('Token_'+str(n));disc.rings((x,y,.132),[(.34,0),(.33,.06)],24,STONE)
        disc.rings((x,y,.193),[(.303,0)],24,'#fff0d1');disc.finish(s.collection,mats)
        txt=bpy.data.curves.new('Number','FONT');txt.body=str(n);txt.align_x='CENTER';txt.size=.37;txt.extrude=.0002
        ob=bpy.data.objects.new('Number_'+str(n),txt);s.collection.objects.link(ob);ob.location=(x,y-.095,.195)
        ink=bpy.data.materials.get('Tessera_Token_Ink') or bpy.data.materials.new('Tessera_Token_Ink');ink.use_nodes=True
        ink.diffuse_color=rgba('#302a20');next(n for n in ink.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'].default_value=rgba('#302a20');txt.materials.append(ink)
        dots=6-abs(7-n)
        for i in range(dots):
            dot=Mesh('Pip');dot.rings((x+(i-(dots-1)/2)*.054,y-.194,.195),[(.013,0)],8,'#302a20');dot.finish(s.collection,mats)
    asset(s,'city',(.866,-.5,.13))
    asset(s,'settlement',(.866,.5,.13))
    asset(s,'metropolis',(-1.732,-1,.13),color=('#d9483b','#8f2a22'))
    asset(s,'road',(.866,0,.19),rot=math.pi/2)
    asset(s,'road',(0,-1.50,.19),rot=math.pi/2,color=('#d9483b','#8f2a22'))
    asset(s,'settlement',(0,-2,.13),color=('#d9483b','#8f2a22'))
    camera(s,(0,0,.15),(5,-8,9),7.4,1600,1400);render(s,'board-context')

def validate():
    manifest=json.loads((ROOT/'public/models/tessera/manifest.json').read_text())
    report={'assets':[],'errors':[]}
    for item in manifest['assets']:
        p=ROOT/'public/models/tessera'/item['file'];raw=p.read_bytes()
        magic,version,length=struct.unpack_from('<4sII',raw)
        assert magic==b'glTF' and version==2 and length==len(raw)
        size,kind=struct.unpack_from('<II',raw,12);doc=json.loads(raw[20:20+size])
        primitives=[p for m in doc.get('meshes',[]) for p in m['primitives']]
        counts=[doc['accessors'][p['indices']]['count']//3 for p in primitives]
        errors=[]
        if len(doc.get('meshes',[]))!=1:errors.append('Expected exactly one mesh')
        if sum(counts)!=item['triangles']:errors.append('Triangle count differs from source')
        if any(n.get('name') in ['Cube','Camera','Light'] for n in doc['nodes']):errors.append('Unrelated default scene content')
        if doc.get('images') or doc.get('textures'):errors.append('Unexpected texture dependency')
        for p in primitives:
            if 'COLOR_0' not in p['attributes']:errors.append('Missing vertex colors')
            if 'NORMAL' not in p['attributes']:errors.append('Missing normals')
        colors={m['name']:m.get('pbrMetallicRoughness',{}).get('baseColorFactor',[1,1,1,1]) for m in doc['materials']}
        if colors.get('Tessera_Neutral')!=[1,1,1,1]:errors.append('Neutral vertex-color material must have white base factor')
        record={'id':item['id'],'triangles':sum(counts),'drawCalls':len(primitives),'bytes':len(raw),'materials':colors,'errors':errors}
        report['assets'].append(record);report['errors'].extend([item['id']+': '+e for e in errors])
    report['totalBytes']=sum(x['bytes'] for x in report['assets']);report['totalTriangles']=sum(x['triangles'] for x in report['assets'])
    (HERE/'validation.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
    return report

def roundtrip():
    """Import every GLB into a separate scene, compare bounds, render imported buildings."""
    s=setup()
    manifest=json.loads((ROOT/'public/models/tessera/manifest.json').read_text())
    result=[]
    imported={}
    for item in manifest['assets']:
        before=set(s.objects)
        bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/tessera'/item['file']))
        new=list(set(s.objects)-before)
        meshes=[o for o in new if o.type=='MESH']
        assert len(meshes)==1,(item['id'],len(meshes))
        obj=meshes[0];imported[item['id']]=obj
        bpy.context.view_layer.update()
        verts=[obj.matrix_world@v.co for v in obj.data.vertices]
        lo=[min(v[k] for v in verts) for k in range(3)]
        hi=[max(v[k] for v in verts) for k in range(3)]
        expected=item['boundsBlender']
        delta=max(abs(lo[k]-expected['min'][k]) for k in range(3))
        delta=max(delta,max(abs(hi[k]-expected['max'][k]) for k in range(3)))
        assert delta<1e-5,(item['id'],delta,lo,hi,expected)
        result.append({'id':item['id'],'maxBoundsError':delta,'passed':True})
        obj.hide_render=True
    for name,x in [('settlement',-1.65),('city',0),('metropolis',1.8)]:
        o=imported[name];o.hide_render=False;o.location=(x,0,0);o.scale=(2.6,)*3
    camera(s,(0,0,.73),(3,-9,5),6.3,1800,950);render(s,'glb-roundtrip-buildings')
    (HERE/'roundtrip-validation.json').write_text(json.dumps({'passed':True,'assets':result},indent=2))
    print('ROUNDTRIP: all 14 GLBs import with unchanged bounds')
