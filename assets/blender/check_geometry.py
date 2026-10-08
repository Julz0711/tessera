"""Geometry checks independent of Blender's export success message."""
import json,math,struct
from pathlib import Path
from buildings import settlement,city,metropolis,road
from ships import ship
from terrain import terrain

def distance_segment(a,b):
    vx,vy=b[0]-a[0],b[1]-a[1]
    d=vx*vx+vy*vy
    t=max(0,min(1,(-a[0]*vx-a[1]*vy)/d)) if d else 0
    return math.hypot(a[0]+t*vx,a[1]+t*vy)

def triangle_radius(a,b,c):
    def cross(p,q):return p[0]*q[1]-p[1]*q[0]
    signs=[cross(a,b),cross(b,c),cross(c,a)]
    area=abs(cross((b[0]-a[0],b[1]-a[1]),(c[0]-a[0],c[1]-a[1])))
    if area>1e-12 and (min(signs)>=0 or max(signs)<=0):return 0
    return min(distance_segment(a,b),distance_segment(b,c),distance_segment(c,a))

def mine_approach_collisions(mesh,triangles,vertices):
    """Clip every other prop triangle against the full rail/sleeper approach."""
    collisions=[]
    for zone in getattr(mesh,'mine_approaches',[]):
        start,end=zone['exclude'];co,si=math.cos(zone['angle']),math.sin(zone['angle'])
        for t in triangles:
            if min(t.vertices)>=start and max(t.vertices)<end:continue
            poly=[]
            for idx in t.vertices:
                xx,yy,zz=vertices[idx].co;x,y=xx-zone['x'],yy-zone['y']
                poly.append((x*co+y*si,-x*si+y*co,zz))
            for axis,bound,sign in [(0,-.082,1),(0,.082,-1),(1,-.190,1),(1,-.052,-1)]:
                clipped=[]
                for i,a in enumerate(poly):
                    b=poly[(i+1)%len(poly)];va=(a[axis]-bound)*sign;vb=(b[axis]-bound)*sign
                    if va>=0:clipped.append(a)
                    if (va>=0)!=(vb>=0):
                        ratio=va/(va-vb);clipped.append(tuple(a[k]+(b[k]-a[k])*ratio for k in range(3)))
                poly=clipped
                if not poly:break
            if poly and max(p[2] for p in poly)>.141:collisions.append(t.index)
    return sorted(set(collisions))

def run():
    from review_assets import validate,HERE,ROOT
    report=validate()
    budgets={'settlement':750,'city':1250,'metropolis':2000,'road':200,'ship':750,'pirate_ship':900,'barbarian_ship':900,'hex_forest':600,'hex_pasture':400,'hex_fields':400,'hex_hills':500,'hex_mountains':600,'hex_desert':300,'hex_gold':600}
    generated=[settlement(),city(),metropolis(),road(),ship('ship'),ship('pirate'),ship('barbarian')]+[terrain(n) for n in ['forest','pasture','fields','hills','mountains','desert','gold']]
    for mesh,item in zip(generated,report['assets']):
        item['referenceTriangleLabel']=budgets[mesh.name]
        item['exceedsReferenceLabel']=item['triangles']>budgets[mesh.name]
        if hasattr(mesh,'prop_vertex_start'):
            # Evaluate projected TRIANGLES, not only vertex radii: a long edge can intrude.
            source=__import__('bpy').data.scenes['Tessera_Asset_Studio'].objects[mesh.name]
            source.data.calc_loop_triangles()
            triangles=[t for t in source.data.loop_triangles if min(t.vertices)>=mesh.prop_vertex_start]
            radius=min(triangle_radius(*(tuple(source.data.vertices[i].co) for i in t.vertices)) for t in triangles)
            edge=max(x*math.cos(j*math.pi/3)+y*math.sin(j*math.pi/3) for x,y,z in mesh.v[mesh.prop_vertex_start:] for j in range(6))
            item['tokenClearRadius']=radius;item['edgeClearance']=math.sqrt(3)/2-edge
            if radius<.42-1e-5:report['errors'].append(mesh.name+': token reserve violated')
            if edge>math.sqrt(3)/2-.10:report['errors'].append(mesh.name+': road shoulder violated')
            if getattr(mesh,'mine_approaches',[]):
                collisions=mine_approach_collisions(mesh,triangles,source.data.vertices)
                item['mineApproachObstructions']=len(collisions)
                if collisions:report['errors'].append(mesh.name+': mine approach obstructed by '+str(len(collisions))+' triangles')
        p=ROOT/'public/models/tessera'/(mesh.name+'.glb');raw=p.read_bytes();size=struct.unpack_from('<I',raw,12)[0]
        doc=json.loads(raw[20:20+size]);bin_offset=20+size+8
        bin_data=raw[bin_offset:]
        def accessor(i):
            a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];start=v.get('byteOffset',0)+a.get('byteOffset',0)
            components={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];fmt={5121:'B',5123:'H',5125:'I',5126:'f'}[a['componentType']]
            pack='<'+fmt*components;stride=v.get('byteStride',struct.calcsize(pack))
            out=[struct.unpack_from(pack,bin_data,start+k*stride) for k in range(a['count'])]
            if a.get('normalized'):
                denominator={5121:255,5123:65535}[a['componentType']];out=[tuple(x/denominator for x in row) for row in out]
            return out
        for prim in doc['meshes'][0]['primitives']:
            positions=accessor(prim['attributes']['POSITION']);normals=accessor(prim['attributes']['NORMAL']);colors=accessor(prim['attributes']['COLOR_0'])
            indices=[x[0] for x in accessor(prim['indices'])]
            if not all(math.isfinite(x) for row in positions+normals+colors for x in row):report['errors'].append(mesh.name+': nonfinite attribute')
            if any(abs(sum(x*x for x in n)-1)>.005 for n in normals):report['errors'].append(mesh.name+': invalid normal')
            if any(i>=len(positions) for i in indices):report['errors'].append(mesh.name+': out-of-range index')
            material=doc['materials'][prim['material']]['name']
            if material!='Tessera_Neutral' and any(abs(x-1)>1e-4 for col in colors for x in col):report['errors'].append(mesh.name+': tint material has nonwhite vertex colors')
        item['attributesChecked']=True
    report['passed']=not report['errors']
    (HERE/'validation.json').write_text(json.dumps(report,indent=2))
    print('GEOMETRY_CHECK',json.dumps({'passed':report['passed'],'errors':report['errors'],'tiles':[{'id':r['id'],'tokenClear':r.get('tokenClearRadius'),'edgeClear':r.get('edgeClearance')} for r in report['assets'] if r['id'].startswith('hex_')]}))
    return report
