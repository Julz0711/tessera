"""Faceted plank-built hulls, billowed cloth and readable nautical silhouettes."""
from meshkit import *

OUTLINE=[(-.50,-.15),(-.29,-.25),(.24,-.25),(.49,-.16),(.64,0),(.49,.16),(.24,.25),(-.29,.25),(-.50,.15)]
LEVELS=[(.54,0),(.69,.068),(.84,.147),(.94,.225),(1,.303),(1.015,.368)]

def at_level(p,s,z):
    x,y=p;rise=.06*max(0,(abs(x)-.28)/.36)
    return (x*s,y*s,z+rise)

def hull(m,kind):
    wood=['#563821','#6c4627','#80532e','#99683c'] if kind!='pirate' else ['#413024','#573b29','#6a4730','#79513a']
    rings=[[at_level(p,s,z) for p in OUTLINE] for s,z in LEVELS]
    for k in range(len(rings)-1):
        for j in range(9):
            a,b=rings[k][j],rings[k][(j+1)%9];c,d=rings[k+1][(j+1)%9],rings[k+1][j]
            color=wood[min(k,3)]
            if k==4:color=MAIN if kind=='ship' else '#9a4137' if kind=='pirate' else WOOD_LIGHT
            m.face([a,b,c,d],color)
            if k in [1,2,3]:
                # A thin physical lip along each strake catches shadow from above.
                aa=(a[0]*1.001,a[1]*1.018,a[2]+.006);bb=(b[0]*1.001,b[1]*1.018,b[2]+.006)
                m.face([a,b,bb,aa],WOOD_DARK)
    m.face(rings[0],wood[0],True)
    deck=[(x*.9541,y*.8323,.286) for x,y in OUTLINE]
    m.face(deck,WOOD_DARK)
    # Clip longitudinal deck boards to the faceted outline.
    def clip(poly,bound,above):
        out=[]
        for a,b in zip(poly,poly[1:]+poly[:1]):
            ia=(a[1]>=bound) if above else (a[1]<=bound);ib=(b[1]>=bound) if above else (b[1]<=bound)
            if ia:out.append(a)
            if ia!=ib:
                t=(bound-a[1])/(b[1]-a[1]);out.append((a[0]+t*(b[0]-a[0]),bound,.289))
        return out
    for i in range(8):
        y=-.198+i*.05;poly=clip(clip(deck,y,True),y+.045,False)
        if len(poly)>2:m.face([(x,q,.289) for x,q,z in poly],['#a47445','#ad7b49','#96683d'][i%3])
    for j in range(9):
        a,b=rings[-1][j],rings[-1][(j+1)%9];ai=(a[0]*.94,a[1]*.82,a[2]);bi=(b[0]*.94,b[1]*.82,b[2])
        m.face([a,b,bi,ai],WOOD_LIGHT if kind!='pirate' else '#a94d42')
        m.face([ai,bi,(bi[0],bi[1],.285),(ai[0],ai[1],.285)],WOOD_DARK)
        # End grain in the gunwale corners.
        m.beam(a,b,.009,WOOD_LIGHT if kind=='ship' else '#765334',4)

def sail_point(u,v,kind):
    y=(u-.5)*.94*(1.10-.16*v)
    z=.49+.64*v
    if v==0:
        z+=.065*math.sin(u*math.pi)
        if kind!='ship':z+=.050 if round(u*10)%2 else -.022
    x=.055+.19*math.sin(v*math.pi)*(.89+.11*math.sin(u*math.pi))
    return (x,y,z)

def sail(m,kind):
    cols=10;rows=4
    for i in range(cols):
        for j in range(rows):
            pts=[sail_point(i/cols,j/rows,kind),sail_point((i+1)/cols,j/rows,kind),sail_point((i+1)/cols,(j+1)/rows,kind),sail_point(i/cols,(j+1)/rows,kind)]
            color=MAIN if kind=='ship' and i in [4,5] else '#f4e5c9' if kind=='ship' else ['#ad4335','#f1e3c9'][(i//2)%2] if kind=='barbarian' else ['#252728','#2a2b2d','#303133'][i%3]
            for f in [(0,1,2),(0,2,3)]:
                m.face([pts[k] for k in f],color)
                m.face([(pts[k][0]-.003,pts[k][1],pts[k][2]) for k in reversed(f)],color)
    if kind=='pirate':
        shape=[(-.125,.06),(-.083,.137),(0,.19),(.083,.137),(.125,.06),(.113,-.030),(.071,-.059),(.054,-.143),(.026,-.070),(0,-.147),(-.028,-.072),(-.057,-.143),(-.076,-.059),(-.113,-.030)]
        # Clip every emblem triangle against the actual sail triangles. Its depth
        # therefore matches the rendered cloth, including the diagonal facets.
        from mathutils.geometry import tessellate_polygon
        cells=[]
        for i in range(cols):
            for j in range(rows):
                p=[Vector(sail_point(i/cols,j/rows,kind)),Vector(sail_point((i+1)/cols,j/rows,kind)),Vector(sail_point((i+1)/cols,(j+1)/rows,kind)),Vector(sail_point(i/cols,(j+1)/rows,kind))]
                cells.extend([[p[k] for k in f] for f in [(0,1,2),(0,2,3)]])
        def decal(outline,color,layer):
            vertices=[Vector((y,.79+z,0)) for y,z in outline]
            triangles=tessellate_polygon([vertices])
            for tri in triangles:
                tri=[vertices[v] if isinstance(v,int) else v for v in tri]
                for cell in cells:
                    poly=[(v.x,v.y) for v in tri]
                    for a,b in zip(cell,cell[1:]+cell[:1]):
                        def signed(p):return (b.y-a.y)*(p[1]-a.z)-(b.z-a.z)*(p[0]-a.y)
                        out=[]
                        for u,v in zip(poly,poly[1:]+poly[:1]):
                            su,sv=signed(u),signed(v)
                            if su>=-1e-9:out.append(u)
                            if (su>=0)!=(sv>=0):
                                t=su/(su-sv);out.append((u[0]+t*(v[0]-u[0]),u[1]+t*(v[1]-u[1])))
                        poly=out
                        if len(poly)<3:break
                    if len(poly)<3:continue
                    normal=(cell[1]-cell[0]).cross(cell[2]-cell[0])
                    for side in [-1,1]:
                        off=(.0015+layer*.0007)*side-(.003 if side<0 else 0)
                        pts=[(cell[0].x-(normal.y*(y-cell[0].y)+normal.z*(z-cell[0].z))/normal.x+off,y,z) for y,z in poly]
                        # Clipping can put duplicate points on grid corners.
                        clean=[]
                        for p in pts:
                            if not any((Vector(p)-Vector(q)).length<1e-7 for q in clean):clean.append(p)
                        if len(clean)>=3:m.face(clean,color,reverse=side==-1)
        decal(shape,'#d4c3a5',0)
        for sign in [-1,1]:decal([(sign*y,z) for y,z in [(.023,.032),(.078,.066),(.097,.016),(.050,-.027)]],'#252728',1)
        decal([(-.012,-.043),(0,-.008),(.012,-.043)],'#252728',1)

def hull_y(x,z):
    k=max(0,min(4,int(z/.075)))
    s=LEVELS[k][0]
    q=x/s
    for (x1,y1),(x2,y2) in zip(OUTLINE[:4],OUTLINE[1:5]):
        if x1<=q<=x2:return abs(y1+(y2-y1)*(q-x1)/(x2-x1))*s
    return .15*s

def armor(m,x,side,width=.055):
    pts=[]
    for s,z in LEVELS:
        band=[]
        for xx in [x-width/2,x+width/2]:
            for (x1,y1),(x2,y2) in zip(OUTLINE[:4],OUTLINE[1:5]):
                if x1<=xx<=x2:
                    yy=abs(y1+(y2-y1)*(xx-x1)/(x2-x1))
                    px,py,pz=at_level((xx,side*yy),s,z)
                    band.append((px,py+side*.005,pz+.001));break
        pts.append(band)
    for a,b in zip(pts,pts[1:]):m.face([a[0],a[1],b[1],b[0]],'#42474b',reverse=side==1)
    def seated(xx,zz):
        yy=next(abs(y1+(y2-y1)*(xx-x1)/(x2-x1)) for (x1,y1),(x2,y2) in zip(OUTLINE[:4],OUTLINE[1:5]) if x1<=xx<=x2)
        points=[Vector(at_level((xx,side*yy),s,z)) for s,z in LEVELS]
        for a,b in zip(points,points[1:]):
            if a.z<=zz<=b.z:
                p=a.lerp(b,(zz-a.z)/(b.z-a.z));p.y+=side*.003
                return tuple(p)
        raise ValueError('Stud outside hull band')
    half=min(width*.37,.022);center=Vector(seated(x,.325));center.y+=side*.023
    m.poly([seated(x-half,.325),seated(x,.354),seated(x+half,.325),seated(x,.297),tuple(center)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],['#767b7e','#9b9d98','#62686c','#8a8f90'])

def wheel(m,x,y,z):
    for j in range(8):
        a=j*TAU/8;b=(j+1)*TAU/8
        m.beam((x,y+math.cos(a)*.065,z+math.sin(a)*.065),(x,y+math.cos(b)*.065,z+math.sin(b)*.065),.009,WOOD_LIGHT,4)
        m.beam((x,y,z),(x,y+math.cos(a)*.096,z+math.sin(a)*.096),.008,WOOD_DARK,4)
    m.beam((x-.025,y,z),(x+.025,y,z),.018,WOOD_LIGHT,6)

def ship(kind):
    m=Mesh(kind if kind=='ship' else kind+'_ship');hull(m,kind);sail(m,kind)
    mast=WOOD if kind=='ship' else WOOD_DARK
    m.beam((-.012,0,.285),(-.012,0,1.32),.027,mast,8)
    m.beam((.055,-.52,1.137),(.055,.52,1.137),.028,WOOD_LIGHT,6)
    m.block((.018,0,1.137),(.115,.085,.075),WOOD,.005)
    for yy in [-.52,.52]:m.beam((.055,yy-.015,1.137),(.055,yy+.015,1.137),.036,WOOD if kind=='ship' else '#454648',6)
    m.block((-.012,0,.317),(.105,.10,.065),WOOD_LIGHT,.006)
    for z in [.36,1.15]:m.rings((-.012,0,z),[(.032,0),(.032,.033)],8,WOOD_LIGHT)
    flag(m,-.012,0,1.305,.18,.23,MAIN if kind=='ship' else '#27292a' if kind=='pirate' else '#ab3b2f')
    if kind=='ship':
        m.rings((-.012,0,1.47),[(.025,0),(.034,.026),(.025,.05),(0,.065)],8,GOLD)
        m.box((-.385,0,.32),(.245,.34,.075),WOOD,bottom=True)
        m.block((-.385,0,.38),(.245,.34,.062),MAIN,.009)
        for x in [-.48,-.27]:
            for y in [-.138,.138]:m.block((x,y,.46),(.038,.038,.17),WOOD,.004)
        for y in [-.138,.138]:m.block((-.375,y,.55),(.285,.061,.045),WOOD_LIGHT,.005)
        m.block((-.49,0,.55),(.048,.327,.045),WOOD_LIGHT,.005)
        for x in [-.48,-.27]:
            for y in [-.138,.138]:m.block((x,y,.576),(.060,.062,.026),WOOD_LIGHT,.003)
        m.beam((-.012,0,1.15),(-.31,.135,.43),.0065,'#c3a97d',5)
        m.beam((.43,0,.21),(.645,0,.455),.033,MAIN,4)
        m.block((.635,0,.451),(.097,.103,.085),MAIN,.007)
        crate(m,.18,.075,.291,.066)
    elif kind=='pirate':
        m.block((-.37,0,.402),(.26,.33,.234),'#72492f',.009)
        m.block((-.37,0,.53),(.315,.37,.040),'#9c4338',.006)
        for side in [-1,1]:
            for x in [-.45,-.34]:
                m.box((x,side*.167,.431),(.068,.014,.075),'#b5a081')
                m.box((x,side*.178,.431),(.043,.009,.052),DARK)
            for x in [-.22,-.02,.18]:
                yy=side*(hull_y(x,.235)+.002)
                m.block((x,yy,.242),(.065,.020,.063),'#747677',.006)
                m.box((x,yy+side*.012,.244),(.041,.012,.039),DARK)
            for x in [-.48,-.28]:m.block((x,side*.145,.585),(.034,.034,.11),WOOD,.003)
            m.box((-.38,side*.15,.638),(.26,.042,.034),WOOD_LIGHT)
            armor(m,.40,side,.034)
        m.block((-.394,0,.597),(.037,.042,.11),WOOD_DARK,.003)
        wheel(m,-.36,0,.642)
        m.rings((-.012,0,1.22),[(.055,0),(.079,.10)],8,WOOD,cap=False)
        m.rings((-.012,0,1.219),[(.055,0),(.055,.009)],8,WOOD_LIGHT,bottom=True)
        m.rings((-.012,0,1.32),[(.084,0),(.084,.023)],8,WOOD_LIGHT,cap=False)
        m.block((-.50,0,.582),(.045,.045,.085),WOOD,.004)
        m.beam((-.50,0,.59),(-.70,0,.69),.017,WOOD_LIGHT,5)
        m.beam((-.70,0,.69),(-.70,0,.625),.008,DARK,4)
        m.block((-.70,0,.572),(.065,.060,.10),'#ffc04c',.004)
        for xx in [-.034,.034]:
            for yy in [-.030,.030]:m.box((-.70+xx,yy,.572),(.009,.009,.105),DARK)
        for z in [.515,.63]:m.block((-.70,0,z),(.085,.079,.020),DARK,.004)
        m.poly([(.51,-.055,.38),(.51,.055,.38),(.59,0,.475),(.83,0,.45)],[(0,1,2),(0,3,1),(1,3,2),(2,3,0)],'#4a5157')
    else:
        for x in [-.30,.02,.37]:
            for side in [-1,1]:armor(m,x,side,.064)
        for x in [-.48,-.32]:
            for y in [-.14,.14]:m.block((x,y,.455),(.044,.044,.18),WOOD_DARK,.004)
        for y in [-.17,.17]:m.block((-.385,y,.431),(.29,.040,.046),WOOD_LIGHT,.004)
        m.box((-.40,0,.334),(.21,.26,.096),WOOD,bottom=True)
        m.block((-.40,0,.394),(.21,.26,.035),WOOD_LIGHT,.004)
        m.poly([(.47,-.085,.36),(.47,.085,.36),(.57,0,.49),(.87,0,.46)],[(0,1,2),(0,3,1),(1,3,2),(2,3,0)],['#484c50','#292f33','#6d7378','#42474c'])
        m.beam((.44,0,.12),(.61,0,.43),.046,'#45494d',5)
        for side in [-1,1]:barrel(m,-.35,side*.08,.409,.031,.074)
    m.transform(.35 if kind=='ship' else .32,rot=-math.pi/2 if kind=='barbarian' else 0)
    return m
