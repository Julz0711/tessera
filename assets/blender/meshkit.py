"""Small deterministic mesh authoring toolkit. Blender Z-up; colors authored in sRGB."""
import math, random
import bpy
from mathutils import Vector

TAU = math.tau
STONE = '#ead8b6'
STONE_LIGHT = '#f6e8ce'
STONE_DARK = '#bca47c'
WOOD = '#88562e'
WOOD_LIGHT = '#ae7740'
WOOD_DARK = '#503620'
DARK = '#30291f'
GOLD = '#efb936'
WHITE = '#f7edda'
MAIN = '@player'
SHADE = '@player_dark'
ACCENT = '@track'

def linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def rgba(h):
    return tuple(linear(int(h[i:i+2], 16)) for i in (1,3,5)) + (1.0,)

def enum_set(owner, attr, requested):
    """Validate static RNA enums; dynamic enums must be tried on the running version."""
    prop = owner.bl_rna.properties[attr]
    options = [i.identifier for i in prop.enum_items]
    if options and requested not in options and options != ['NONE']:
        raise ValueError((attr, requested, options))
    try:
        setattr(owner, attr, requested)
    except TypeError as e:
        raise RuntimeError(f'{attr}: {e}')

def materials():
    out=[]
    for name,color in [('Tessera_Neutral','#ffffff'),('Tessera_Player','#1767e0'),('Tessera_PlayerDark','#144693'),('Tessera_Track','#28753d')]:
        m=bpy.data.materials.get(name) or bpy.data.materials.new(name)
        m.use_nodes=True
        m.diffuse_color=rgba(color)
        bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        bsdf.inputs['Base Color'].default_value=rgba(color)
        bsdf.inputs['Roughness'].default_value=.83
        if name=='Tessera_Neutral':
            vc=next((n for n in m.node_tree.nodes if n.type=='VERTEX_COLOR'),None) or m.node_tree.nodes.new('ShaderNodeVertexColor')
            vc.layer_name='Color'
            m.node_tree.links.new(vc.outputs['Color'],bsdf.inputs['Base Color'])
        out.append(m)
    return out

class Mesh:
    def __init__(self,name):
        self.name=name; self.v=[]; self.f=[]; self.c=[]; self.slots=[];self.corner_colors={}
    def face(self,vs,color,reverse=False):
        idx=list(range(len(self.v),len(self.v)+len(vs)))
        self.v.extend(vs); self.f.append(idx[::-1] if reverse else idx)
        self.slots.append({MAIN:1,SHADE:2,ACCENT:3}.get(color,0))
        self.c.append((1,1,1,1) if color.startswith('@') else rgba(color))
    def poly(self,vs,faces,color):
        for j,f in enumerate(faces): self.face([vs[i] for i in f],color[j%len(color)] if isinstance(color,list) else color)
    def box(self,p,s,c,rot=0,top=None,bottom=False):
        x,y,z=p; w,d,h=[a/2 for a in s]
        coords=[(-w,-d,-h),(w,-d,-h),(w,d,-h),(-w,d,-h),(-w,-d,h),(w,-d,h),(w,d,h),(-w,d,h)]
        vs=[(x+a*math.cos(rot)-b*math.sin(rot),y+a*math.sin(rot)+b*math.cos(rot),z+k) for a,b,k in coords]
        for f in [(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]: self.face([vs[i] for i in f],c)
        self.face([vs[i] for i in (4,5,6,7)],top or c)
        if bottom:self.face([vs[i] for i in (3,2,1,0)],c)
    def block(self,p,s,c,bevel=.01,rot=0,top=None):
        """One-segment bevel, deliberately flat shaded; useful for large cut stone."""
        x,y,z=p;w,d,h=[v/2 for v in s];b=min(bevel,w*.3,d*.3,h*.45)
        def ring(w,d,b,z):
            pts=[(-w+b,-d),(w-b,-d),(w,-d+b),(w,d-b),(w-b,d),(-w+b,d),(-w,d-b),(-w,-d+b)]
            return [(x+a*math.cos(rot)-q*math.sin(rot),y+a*math.sin(rot)+q*math.cos(rot),z) for a,q in pts]
        rings=[ring(w-b,d-b,b*.3,z-h),ring(w,d,b,z-h+b),ring(w,d,b,z+h-b),ring(w-b,d-b,b*.3,z+h)]
        for a,q in zip(rings,rings[1:]):
            for j in range(8):self.face([a[j],a[(j+1)%8],q[(j+1)%8],q[j]],c)
        self.face(rings[-1],top or c);self.face(rings[0],c,True)
    def extrude(self,points,depth,c):
        """Front outline in XYZ, extruded toward +Y."""
        back=[(x,y+depth,z) for x,y,z in points]
        self.face(points,c);self.face(back,c,True)
        for i in range(len(points)):self.face([points[i],points[(i+1)%len(points)],back[(i+1)%len(points)],back[i]],c)
    def rings(self,p,rings,n,c,angle=0,aspect=(1,1),cap=True,bottom=False,stagger=0):
        x,y,z=p
        vs=[]
        for k,(radius,height) in enumerate(rings):
            vs.extend([(x+radius*aspect[0]*math.cos(angle+j*TAU/n+(stagger if k%2 else 0)),y+radius*aspect[1]*math.sin(angle+j*TAU/n+(stagger if k%2 else 0)),z+height) for j in range(n)])
        for k in range(len(rings)-1):
            for j in range(n):
                f=[k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j]
                col=c[(j+k)%len(c)] if isinstance(c,list) else c
                if rings[k+1][0]==0:
                    self.face([vs[f[t]] for t in (0,1,2)],col)
                else:self.face([vs[i] for i in f],col)
        if cap and rings[-1][0]>0:self.face(vs[-n:],c[0] if isinstance(c,list) else c)
        if bottom:self.face(vs[:n],c[0] if isinstance(c,list) else c,True)
    def beam(self,a,b,r,c,n=4):
        a,b=Vector(a),Vector(b); axis=(b-a).normalized()
        ref=Vector((0,0,1)) if abs(axis.z)<.95 else Vector((1,0,0))
        u=axis.cross(ref).normalized()*r; v=axis.cross(u).normalized()*r
        rings=[[tuple(p+u*math.cos(j*TAU/n+math.pi/4)+v*math.sin(j*TAU/n+math.pi/4)) for j in range(n)] for p in (a,b)]
        for j in range(n):self.face([rings[0][j],rings[0][(j+1)%n],rings[1][(j+1)%n],rings[1][j]],c)
        self.face(rings[0],c,True);self.face(rings[1],c)
    def gable(self,p,w,d,h,c=MAIN,axis=0):
        x,y,z=p
        vs=[(-w/2,-d/2,0),(w/2,-d/2,0),(w/2,d/2,0),(-w/2,d/2,0),(0,-d/2,h),(0,d/2,h)]
        vs=[(x+a*math.cos(axis)-b*math.sin(axis),y+a*math.sin(axis)+b*math.cos(axis),z+k) for a,b,k in vs]
        self.poly(vs,[(0,1,4),(1,2,5,4),(2,3,5),(3,0,4,5)],c)
    def plaque(self,x,y,z,w,h,c,arch=False,notch=False):
        # Front-facing planar detail (normal -Y).
        if arch:pts=[(-.5,0),(.5,0),(.5,.7),(0,1),(-.5,.7)]
        elif notch:pts=[(-.5,0),(0,.18),(.5,0),(.5,1),(-.5,1)]
        else:pts=[(-.5,0),(.5,0),(.5,1),(-.5,1)]
        self.face([(x+a*w,y,z+b*h) for a,b in pts],c)
    def transform(self,scale=1,offset=(0,0,0),rot=0,start=0):
        if isinstance(scale,(int,float)):scale=(scale,)*3
        co,si=math.cos(rot),math.sin(rot)
        for i in range(start,len(self.v)):
            x,y,z=[self.v[i][k]*scale[k] for k in range(3)]
            self.v[i]=(x*co-y*si+offset[0],x*si+y*co+offset[1],z+offset[2])
    def finish(self,collection,mats):
        data=bpy.data.meshes.new(self.name+'_geometry');data.from_pydata(self.v,[],self.f);data.update()
        for m in mats:data.materials.append(m)
        vc=data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
        for p,col,slot in zip(data.polygons,self.c,self.slots):
            p.material_index=slot
            for corner,li in enumerate(p.loop_indices):vc.data[li].color=self.corner_colors[p.index][corner] if p.index in self.corner_colors else col
        obj=bpy.data.objects.new(self.name,data);collection.objects.link(obj)
        return obj

def rock(m,p,size,colors,seed=1):
    r=random.Random(seed); n=5
    x,y,z=p; sx,sy,sz=size
    rings=[]
    for rad,h in [(1,0),(.93,.38),(.52,.83)]:
        rings.append([(x+sx*rad*(.86+r.random()*.23)*math.cos(j*TAU/n),y+sy*rad*(.86+r.random()*.23)*math.sin(j*TAU/n),z+sz*(h+r.random()*.1)) for j in range(n)])
    for k in range(2):
        for j in range(n):
            a,b,c,d=rings[k][j],rings[k][(j+1)%n],rings[k+1][(j+1)%n],rings[k+1][j]
            m.face([a,b,c],colors[(j+k)%len(colors)])
            m.face([a,c,d],colors[(j+k+1)%len(colors)])
    for j in range(n):m.face([rings[-1][j],rings[-1][(j+1)%n],(x+sx*.13,y-sy*.08,z+sz)],colors[j%len(colors)])

def fir(m,x,y,z,r,h):
    m.rings((x,y,z),[(r*.21,0),(r*.17,h*.3)],5,WOOD)
    m.rings((x,y,z),[(r,h*.19),(0,h*.78)],6,['#205332','#28623a','#2e6940'])
    m.rings((x,y,z),[(r*.74,h*.5),(0,h)],6,['#306d3d','#235b34','#3a7542'])

def leafy(m,x,y,z,r,h):
    m.rings((x,y,z),[(r*.22,0),(r*.15,h*.56)],5,WOOD)
    m.rings((x,y,z),[(r*.55,h*.32),(r,h*.53),(r*.78,h*.79),(0,h)],6,['#548738','#6c9d40','#80ab4b'])

def flag(m,x,y,z,h=.28,w=.24,c=MAIN):
    m.beam((x,y,z),(x,y,z+h),.015,WOOD_LIGHT,4)
    m.face([(x+.013,y,z+h-.025),(x+w,y+.028,z+h-.06),(x+w*.72,y+.019,z+h-.12),(x+w,y+.028,z+h-.19),(x+.013,y,z+h-.165)],c)
    m.face([(x+.013,y-.001,z+h-.165),(x+w,y+.027,z+h-.19),(x+w*.72,y+.018,z+h-.12),(x+w,y+.027,z+h-.06),(x+.013,y-.001,z+h-.025)],c)

def boulder(m,p,size,colors,seed=1,subdivisions=1,grounded=True):
    """Irregular triangular convex facets, with broad faces rather than a ring cone."""
    import bmesh
    bm=bmesh.new();bmesh.ops.create_icosphere(bm,subdivisions=subdivisions,radius=1)
    rng=random.Random(seed);sx,sy,sz=size;x,y,z=p
    for v in bm.verts:
        v.co.x*=sx*(.84+rng.random()*.25);v.co.y*=sy*(.86+rng.random()*.23)
        height=(v.co.z*.5+.5)*(.94+rng.random()*.12)
        v.co.z=(max(0,(height-.22)/.78) if grounded else height)*sz
        v.co+=Vector((x,y,z))
    for f in bm.faces:m.face([tuple(v.co) for v in f.verts],colors[rng.randrange(len(colors))] if isinstance(colors,list) else colors)
    bm.free()

def broadleaf(m,x,y,z,r,h,seed=1,dark=False):
    m.rings((x,y,z),[(r*.32,0),(r*.24,h*.22),(r*.19,h*.57)],6,[WOOD,WOOD_LIGHT,WOOD])
    for a in [.2,2.5,4.5]:m.beam((x,y,z+h*.15),(x+math.cos(a)*r*.34,y+math.sin(a)*r*.34,z+h*.49),r*.10,WOOD,4)
    cols=['#397837','#4d883b','#5b933e'] if dark else ['#679a35','#79aa40','#8db746']
    boulder(m,(x,y,z+h*.23),(r,r*.92,h*.77),cols,seed,2,grounded=False)

def pine(m,x,y,z,r,h,seed=1):
    m.rings((x,y,z),[(r*.25,0),(r*.18,h*.34)],6,[WOOD,WOOD_DARK,WOOD])
    for k,(rad,base,tip) in enumerate([(r,.19,.72),(r*.76,.47,1)]):
        n=6;ang=.18+seed*.39+k*.08
        m.rings((x,y,z),[(rad*.84,h*base),(rad,h*(base+.045)),(rad*.57,h*(base+tip)*.5),(0,h*tip)],n,['#205736','#2c633b','#2c663c','#215b36','#357442','#2a643a'],angle=ang)

def crate(m,x,y,z,s=.14):
    m.block((x,y,z+s/2),(s,s,s),WOOD,bevel=s*.04)
    for side in [-1,1]:
        for q in [-.37,.37]:
            m.box((x+q*s,y+side*s*.505,z+s/2),(s*.12,s*.035,s*.90),WOOD_LIGHT)
            m.box((x,y+side*s*.51,z+s*(q+.5)),(s*.90,s*.035,s*.12),WOOD_LIGHT)
        m.beam((x-s*.33,y+side*s*.52,z+s*.2),(x+s*.33,y+side*s*.52,z+s*.8),s*.045,WOOD_LIGHT,4)
    for q in [-.25,0,.25]:m.box((x+q*s,y,z+s*1.002),(s*.012,s*.8,s*.01),WOOD_DARK)

def barrel(m,x,y,z,r=.075,h=.18):
    m.rings((x,y,z),[(r*.8,0),(r,h*.26),(r,h*.73),(r*.8,h)],10,[WOOD,WOOD_LIGHT,WOOD,'#986536'])
    for t in [.23,.74]:m.rings((x,y,z),[(r*1.015,h*t),(r*1.015,h*(t+.09))],10,STONE_DARK,cap=False)
    m.rings((x,y,z+h+.001),[(r*.70,0)],10,WOOD_LIGHT)
