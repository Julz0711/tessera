"""Build the editable pack and GLBs. Run inside Blender, or blender -b --python this_file."""
from pathlib import Path
import sys, json, math, os, hashlib
import bpy
from mathutils import Vector

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
sys.path.insert(0,str(HERE))
from meshkit import *
from buildings import settlement,city,metropolis,road
from terrain import terrain
from ships import ship

EXPORT=ROOT/'public'/'models'/'tessera'
PREVIEW=HERE/'previews'
EXPORT.mkdir(parents=True,exist_ok=True);PREVIEW.mkdir(exist_ok=True)

# This namespace belongs exclusively to this generated pack. Preserve unrelated scenes.
scene=bpy.data.scenes.get('Tessera_Asset_Studio')
if scene:
    for obj in list(scene.objects):bpy.data.objects.remove(obj,do_unlink=True)
else:scene=bpy.data.scenes.new('Tessera_Asset_Studio')
if bpy.context.window:bpy.context.window.scene=scene
collection=scene.collection
mats=materials()
assets=[settlement(),city(),metropolis(),road(),ship('ship'),ship('pirate'),ship('barbarian')]
assets += [terrain(n) for n in ['forest','pasture','fields','hills','mountains','desert','gold']]
manifest={'schema':1,'sourceRepository':'Julz0711/tessera','sourceTree':'9b822013c3008a001fb1e719d1a8b78a5d801d7e','blender':bpy.app.version_string,'units':'Tessera board units; hex circumradius 1','up':'Y in GLB, Z in Blender','materials':{'Tessera_Neutral':'Vertex colors, preserve white material factor','Tessera_Player':'Replace base color with PLAYER_COLORS[color].hex','Tessera_PlayerDark':'Replace base color with PLAYER_COLORS[color].dark','Tessera_Track':'Metropolis improvement track accent'},'assets':[]}
objs={}
for mesh in assets:
    obj=mesh.finish(collection,mats);objs[mesh.name]=obj
    obj['tessera_asset']=mesh.name
    obj['origin_contract']='tile surface' if mesh.name in ['settlement','city','metropolis'] else 'tile frame: surface 0.13' if mesh.name.startswith('hex_') else 'waterline' if 'ship' in mesh.name else 'road midpoint: tile surface +0.06'
    bpy.context.view_layer.update()
    obj.data.calc_loop_triangles()
    tris=len(obj.data.loop_triangles)
    mins=[min(v.co[k] for v in obj.data.vertices) for k in range(3)]
    maxs=[max(v.co[k] for v in obj.data.vertices) for k in range(3)]
    item={'id':mesh.name,'file':mesh.name+'.glb','triangles':tris,'boundsBlender':{'min':mins,'max':maxs},'dimensionsBlender':[maxs[k]-mins[k] for k in range(3)],'origin':obj['origin_contract'],'materials':[mats[i].name for i in sorted(set(mesh.slots))]}
    if hasattr(mesh,'prop_vertex_start'):
        pv=mesh.v[mesh.prop_vertex_start:]
        item['propMinRadius']=min(math.hypot(x,y) for x,y,z in pv)
        item['propMaxRadius']=max(math.hypot(x,y) for x,y,z in pv)
        item['propMaxEdgeProjection']=max(x*math.cos(j*math.pi/3)+y*math.sin(j*math.pi/3) for x,y,z in pv for j in range(6))
    manifest['assets'].append(item)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    # Inspect supported export enums at runtime; GLB is a dynamic identifier.
    props=bpy.ops.export_scene.gltf.get_rna_type().properties
    assert 'ACTIVE' in [i.identifier for i in props['export_vertex_color'].enum_items]
    try:
        bpy.ops.export_scene.gltf(filepath=str(EXPORT/(mesh.name+'.glb')),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_extras=True,export_vertex_color='ACTIVE',export_all_vertex_colors=False,export_materials='EXPORT')
    except TypeError as exc:raise RuntimeError(f'Export options rejected by this Blender: {exc}')
    item['sha256']=hashlib.sha256((EXPORT/item['file']).read_bytes()).hexdigest()

(EXPORT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')

# Curated studio: models at game scale, arranged in two separate review rows.
for i,name in enumerate(['settlement','city','metropolis','road','ship','pirate_ship','barbarian_ship']):
    objs[name].location=(i*1.0-3.0,-1.9,.02)
for i,name in enumerate(['forest','pasture','fields','hills','mountains','desert','gold']):
    objs['hex_'+name].location=((i%4)*2.25-3.35,(i//4)*2.5+1.0,.17)

ground=bpy.data.materials.get('Tessera_Studio_Backdrop') or bpy.data.materials.new('Tessera_Studio_Backdrop');ground.use_nodes=True
bsdf=next(n for n in ground.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bsdf.inputs['Base Color'].default_value=rgba('#c3cbd0');bsdf.inputs['Roughness'].default_value=.92
mesh=Mesh('Studio_Backdrop');mesh.box((0,0,-.041),(200,200,.08),'#c3cbd0')
floor=mesh.finish(collection,mats);floor.data.materials.clear();floor.data.materials.append(ground)
world=bpy.data.worlds.new('Tessera_Studio_World');world.use_nodes=True
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.65,.73,.85,1);bg.inputs['Strength'].default_value=.35;scene.world=world
for name,loc,power,size in [('Studio_Key',(-3,-4,7),700,4),('Studio_Fill',(5,-1,5),200,4),('Studio_Rim',(1,6,7),550,4)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(Vector((0,0,0))-obj.location).to_track_quat('-Z','Y').to_euler()
camdata=bpy.data.cameras.new('Tessera_Camera');camdata.type='ORTHO';cam=bpy.data.objects.new('Tessera_Camera',camdata);collection.objects.link(cam);scene.camera=cam
cam.location=(8,-12,12);target=Vector((0,.8,.1));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.ortho_scale=12.3
scene.render.resolution_x=1800;scene.render.resolution_y=1400;scene.render.resolution_percentage=100
enum_set(scene.render.image_settings,'file_format','PNG')
try:scene.render.engine='CYCLES'
except TypeError as exc:raise RuntimeError(f'Render engine not supported: {exc}')
scene.render.film_transparent=False
scene.cycles.samples=64
scene.cycles.use_denoising=True
try:scene.view_settings.view_transform='Standard'
except TypeError:pass
try:scene.view_settings.look='None'
except TypeError:pass
scene.view_settings.exposure=-.55
scene.render.filepath=str(PREVIEW/'pack-overview.png')
for area in bpy.context.screen.areas if bpy.context.screen else []:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_perspective='CAMERA'
        area.spaces.active.shading.color_type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'tessera-assets.blend'))
print('TESSERA_BUILD '+json.dumps([{'id':i['id'],'triangles':i['triangles'],'dimensions':i['dimensionsBlender'],'edge':i.get('propMaxEdgeProjection'),'clear':i.get('propMinRadius')} for i in manifest['assets']]))
