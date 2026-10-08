"""Dense, asymmetric miniature landscapes with protected gameplay clearances."""
from meshkit import *

COLORS={'forest':('#468229','#76a73c'),'pasture':('#82b927','#abd345'),'fields':('#cd991f','#efc33d'),'hills':('#b94d24','#dc7137'),'mountains':('#787e88','#a2a4a8'),'desert':('#d4a64b','#f1ca70'),'gold':('#c58e27','#e8b73f')}

def base(name):
    m=Mesh('hex_'+name);side,top=COLORS[name]
    m.rings((0,0,0),[(1,-.15),(1,-.025),(.985,-.006)],6,STONE,angle=math.pi/6,bottom=True)
    m.rings((0,0,0),[(.927,-.004),(.927,.103),(.905,.13)],6,side,angle=math.pi/6,cap=False)
    n=36;outer=[];inner=[]
    for j in range(n):
        a=j*TAU/n;proj=max(math.cos(a-k*math.pi/3) for k in range(6));r=.905*math.cos(math.pi/6)/proj
        outer.append((r*math.cos(a),r*math.sin(a),.13));inner.append((.435*math.cos(a),.435*math.sin(a),.13))
    for j in range(n):
        k=(j+1)%n;m.face([inner[j],outer[j],outer[k],inner[k]],top)
        m.face([(.419*math.cos(j*TAU/n),.419*math.sin(j*TAU/n),.128),inner[j],inner[k],(.419*math.cos(k*TAU/n),.419*math.sin(k*TAU/n),.128)],side)
    m.face([(.419*math.cos(j*TAU/n),.419*math.sin(j*TAU/n),.128) for j in range(n)],top)
    m.prop_vertex_start=len(m.v);return m

def pebble(m,x,y,r=.03,seed=1,colors=None):
    boulder(m,(x,y,.13),(r,r*.84,r*1.3),colors or ['#aba99f','#c7c3b6','#999b99'],seed)

def shrub(m,x,y,r=.055,seed=1):
    boulder(m,(x,y,.131),(r,r*.88,r*1.65),['#3f7d35','#5a922e','#7cab3e'],seed)

def sapling(m,x,y,r=.028,h=.07):
    m.rings((x,y,.13),[(r,0),(r*.53,h*.60),(0,h)],5,['#3c7b2c','#599234','#659e38'],angle=x*3)

def stump(m,x,y,r=.056):
    m.rings((x,y,.13),[(r*1.3,0),(r,.08),(r*.82,.12)],7,[WOOD,WOOD_DARK,WOOD_LIGHT],cap=False)
    m.rings((x,y,.25),[(r*.82,0)],7,'#c69559')
    for j in range(9):
        a=j*TAU/9;b=(j+1)*TAU/9
        m.face([(x+math.cos(a)*r*.48,y+math.sin(a)*r*.48,.2505),(x+math.cos(a)*r*.54,y+math.sin(a)*r*.54,.2505),(x+math.cos(b)*r*.54,y+math.sin(b)*r*.54,.2505),(x+math.cos(b)*r*.48,y+math.sin(b)*r*.48,.2505)],WOOD_LIGHT)

def rock_portal(m,z,colors,outer,inner,depth=.18,bluff=False):
    # A real opening: front arch, interior returns, a ceiling and a recessed back.
    n=len(outer)
    for i in range(n-1):
        a,b=outer[i],outer[i+1];c,d=inner[i+1],inner[i]
        front=[(a[0],.025,z+a[1]),(b[0],.025,z+b[1]),(c[0],-.006,z+c[1]),(d[0],-.006,z+d[1])]
        m.face([front[0],front[1],front[2]],colors[i%len(colors)],True)
        m.face([front[0],front[2],front[3]],colors[(i+1)%len(colors)],True)
        m.face([(d[0],-.006,z+d[1]),(c[0],-.006,z+c[1]),(c[0]*.86,depth,z+c[1]*.88),(d[0]*.86,depth,z+d[1]*.88)],'#4a4034',True)
        if not bluff:m.face([(a[0],.025,z+a[1]),(a[0]*.86,depth+.04,z+a[1]*.83),(b[0]*.86,depth+.04,z+b[1]*.83),(b[0],.025,z+b[1])],colors[(i+2)%len(colors)],True)
    m.face([(a*.86,depth,z+b*.88) for a,b in reversed(inner)],DARK)
    if bluff:
        # A ridge continues behind the tunnel, then falls into a broken rear slope.
        # Every triangle belongs to the rock shell: no rectangular end wall.
        front=[(a,.025,z+b) for a,b in outer]
        mid=[(a*s+.013,depth*.65+d,z+b*h) for (a,b),s,d,h in zip(outer,[1.18,1.10,1.07,.70,1.08,1.12,1.08],[0,.018,-.020,.026,-.006,.022,0],[1,1.05,1.12,1.26,1.04,.94,1])]
        rear=[(a*s-.012,depth+.095+d,z+b*h) for (a,b),s,d,h in zip(outer,[.89,.88,.72,.52,.80,.89,1.06],[.015,-.020,.018,-.009,.022,-.004,.018],[1,.65,.62,.69,.56,.68,1])]
        center=Vector((0,depth*.7,z+.12))
        def rock_face(vs,color):
            a,b,c=[Vector(p) for p in vs];normal=(b-a).cross(c-a)
            m.face(vs,color,normal.dot((a+b+c)/3-center)<0)
        for level,(aa,bb) in enumerate([(front,mid),(mid,rear)]):
            for i in range(n-1):
                rock_face([aa[i],bb[i],bb[i+1]],colors[(i+level)%len(colors)])
                rock_face([aa[i],bb[i+1],aa[i+1]],colors[(i+level+1)%len(colors)])
        tail=(.027,depth+.165,z+.092)
        for i in range(n-1):rock_face([rear[i],tail,rear[i+1]],colors[(i+2)%len(colors)])
        rock_face([rear[-1],tail,rear[0]],colors[0])
    else:m.face([(a*.86,depth+.04,z+b*.83) for a,b in outer],colors[0])
    m.box((0,depth*.45,z+.002),(.22,depth*1.2,.008),'#696052',bottom=True)

def mine(m,x,y,z=.13,angle=0,gold=False):
    start=len(m.v)
    colors=['#9c702f','#b78534','#c69943','#a77a31'] if gold else ['#80848c','#989ba0','#727984','#a2a4a8']
    rock_portal(m,z,colors,[(-.177,0),(-.183,.155),(-.132,.255),(-.045,.318),(.09,.29),(.174,.19),(.18,0)],[(-.084,0),(-.084,.135),(-.076,.187),(0,.21),(.076,.187),(.084,.135),(.084,0)],bluff=True)
    for dx in [-.112,.112]:m.block((dx,0,z+.108),(.052,.065,.218),WOOD,.004)
    m.block((0,-.011,z+.229),(.300,.088,.052),WOOD_LIGHT,.005)
    for dx in [-.08,.08]:m.beam((dx,0,z+.18),(dx*.60,-.005,z+.23),.02,WOOD_DARK,4)
    # Sleepers and rails continue inside the opening on a continuous gravel bed.
    m.block((0,-.022,z+.002),(.161,.34,.012),'#8c8270',.003)
    for j in range(9):m.block((0,-.165+j*.035,z+.012),(.137,.021,.019),WOOD_LIGHT,.002)
    for dx in [-.043,.043]:m.box((dx,-.025,z+.028),(.010,.31,.016),'#56565a',bottom=True)
    m.transform(offset=(x,y,0),rot=angle,start=start)
    if not hasattr(m,'mine_approaches'):m.mine_approaches=[]
    m.mine_approaches.append({'x':x,'y':y,'angle':angle,'exclude':(start,len(m.v))})

def peak(m,x,y,r,h,seed=1,gold=False):
    rng=random.Random(seed);n=7;ang=seed*.4
    rings=[]
    for k,(rad,height) in enumerate([(1,0),(.86,.30),(.51,.66)]):
        heights=[.13+h*(height+rng.random()*.055) for j in range(n)]
        if k==0:heights=[.125]*n
        if k==2:heights=[.13+h*t for t in [.61,.78,.66,.73,.55,.76,.61]]
        rings.append([(x+math.cos(ang+j*TAU/n+.13*k)*r*rad*(.87+rng.random()*.22),y+math.sin(ang+j*TAU/n+.13*k)*r*rad*.83,heights[j]) for j in range(n)])
    cols=['#977034','#af813b','#c49848','#b38944'] if gold else ['#80838b','#93969c','#a6a8ad','#777d86']
    for k in range(2):
        for j in range(n):
            a,b,c,d=rings[k][j],rings[k][(j+1)%n],rings[k+1][(j+1)%n],rings[k+1][j]
            m.face([a,b,c],cols[(j+k)%4]);m.face([a,c,d],cols[(j+k+1)%4])
    tip=(x-r*.15,y+r*.04,.13+h)
    for j in range(n):m.face([rings[-1][j],rings[-1][(j+1)%n],tip],cols[j%4] if gold else ['#f2eee7','#dedee0','#faf4e9'][j%3])

def forest(m):
    for i,(x,y,r,h) in enumerate([(-.38,.49,.17,.53),(-.015,.66,.18,.78),(-.62,.035,.14,.43),(.56,-.25,.14,.45),(-.29,-.56,.12,.32)]):pine(m,x,y,.13,r,h,i)
    for i,(x,y,r,h) in enumerate([(.36,.51,.195,.57),(.60,.22,.165,.43),(-.24,.62,.13,.39)]):broadleaf(m,x,y,.13,r,h,i+10,dark=i==1)
    for x,y in [(.23,-.59),(.67,.04)]:stump(m,x,y)
    for i,(x,y,r) in enumerate([(-.56,-.26,.09),(-.59,-.33,.06),(-.66,.30,.065),(.49,-.48,.085),(.07,-.68,.07),(-.50,.35,.065),(.21,.61,.055)]):shrub(m,x,y,r,i)
    for i,(x,y,r) in enumerate([(-.51,-.11,.085),(-.57,-.17,.045),(.23,.54,.07),(.27,.62,.038)]):pebble(m,x,y,r,i)
    for x,y in [(-.08,-.57),(-.48,-.42),(.42,-.30),(.60,.40),(-.60,.45),(.34,-.64),(.03,.54),(-.42,.25),(.55,.09)]:sapling(m,x,y,.029,.095)

def sheep(m,x,y,rot=0):
    from hf_imports import append
    append(m,'hf_sheep',x,y,.13,.205,rot)

def pasture(m):
    broadleaf(m,.17,.65,.13,.17,.48,9)
    pine(m,-.59,-.06,.13,.12,.32,3)
    broadleaf(m,.58,.16,.13,.108,.27,4,dark=True)
    for x,y,a in [(-.37,.49,-.6),(.54,-.24,.4),(-.11,-.64,-.1)]:sheep(m,x,y,a)
    for i,(x,y,r) in enumerate([(-.55,.28,.072),(-.65,.22,.055),(.34,-.54,.077),(.46,-.47,.057),(-.40,-.47,.06),(.62,.44,.054),(-.04,.57,.045)]):shrub(m,x,y,r,i)
    for i,(x,y,r) in enumerate([(-.15,.66,.075),(.40,.49,.08),(-.48,-.26,.07),(.46,-.35,.052)]):pebble(m,x,y,r,i+3)
    for x,y in [(-.56,.08),(.32,.56),(-.30,-.60),(.58,-.07),(-.61,-.32),(.24,-.63)]:sapling(m,x,y,.021,.065)

def fence(m,x,y,rot=0):
    start=len(m.v)
    for xx in [-.10,.10]:m.block((xx,0,.211),(.038,.038,.16),WOOD,.004)
    m.box((0,0,.218),(.22,.028,.045),WOOD_LIGHT)
    m.transform(offset=(x,y,0),rot=rot,start=start)

def fields(m):
    for x,y,rot,w,d in [(-.33,.53,-.55,.44,.25),(.61,.035,1.6,.40,.24),(-.34,-.51,.67,.38,.23)]:
        start=len(m.v);m.block((0,0,.145),(w+.018,d+.008,.03),WOOD,.005)
        # Connected faceted ridges: irregular ripe crowns above dark furrows,
        # with neither box-shaped bars nor repeated gaps across the whole plot.
        for j in range(5):
            yy=(j-2)*d/5;half=d/5*.40
            rng=random.Random(j+44);sections=[]
            for k in range(7):
                xx=-w/2+k*w/6;zz=.234+rng.uniform(-.018,.020)
                sections.append([(xx,yy-half,.159),(xx,yy-half*.8,zz-.020),(xx,yy,zz),(xx,yy+half*.8,zz-.016),(xx,yy+half,.159)])
            cols=['#dfa219','#efb922','#ffd345','#f0b51f']
            for k in range(6):
                for q in range(4):m.face([sections[k][q],sections[k+1][q],sections[k+1][q+1],sections[k][q+1]],cols[(q+j)%4])
            m.face(sections[0],cols[0],True);m.face(sections[-1],cols[1])
            # Sparse paired ears give the silhouette a recognisably planted edge.
            for k in [1,3,5]:
                xx=-w/2+k*w/6;zz=sections[k][2][2]
                m.beam((xx,yy,.19),(xx,yy,zz+.025),.003,'#d39a17',4)
                m.poly([(xx-.009,yy,zz-.005),(xx,yy-.007,zz+.024),(xx+.010,yy,zz+.007),(xx,yy+.008,zz+.024),(xx,yy,zz+.045)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],'#ffd653')
        m.transform(offset=(x,y,0),rot=rot,start=start)
    for x,y,r,h in [(.05,.67,.064,.35),(-.65,.04,.064,.29),(.43,.43,.072,.26)]:
        m.rings((x,y,.13),[(r*.3,0),(r*.23,.08)],5,WOOD)
        m.rings((x,y,.17),[(r*.55,0),(r,h*.40),(r*.64,h*.70),(0,h)],7,['#487530','#628b37','#5a8331'])
    fence(m,-.59,.20,-.6);fence(m,.20,-.57,.18)
    for x,y in [(.25,.57),(.03,-.65)]:
        for xx,yy,z in [(-.035,0,.162),(.038,0,.162),(0,.008,.226)]:
            m.block((x+xx,y+yy,z),(.067,.076,.064),'#f0bf38',.005)
            m.box((x+xx,y+yy,z+.032),(.008,.075,.003),'#d7a32c')
    for i,(x,y) in enumerate([(-.60,-.21),(.47,-.35),(.61,.34),(-.39,-.62)]):shrub(m,x,y,.048,i)
    for i,(x,y) in enumerate([(.28,-.65),(-.58,.36),(.33,.44),(-.68,-.14)]):pebble(m,x,y,.029,i)

def mountains(m,gold=False):
    if gold:
        gold_outcrops(m);return
    for i,(x,y,r,h) in enumerate([(-.05,.67,.22,.82),(-.37,.47,.165,.40),(.40,.45,.155,.38),(-.60,-.12,.128,.32),(-.31,-.53,.105,.23),(.27,-.59,.105,.22)]):peak(m,x,y,r,h*(.89 if gold else 1),i+4,gold)
    ore=['#465267','#5b6780','#3e485b'] if not gold else ['#edb71d','#ffd640','#e2a21a','#f4c128']
    for i,(x,y,r,h) in enumerate([(-.53,.31,.096,.27),(-.24,.60,.095,.30),(.50,.29,.100,.24),(-.57,-.31,.082,.18),(.42,-.50,.082,.21),(.05,-.66,.066,.14)]):boulder(m,(x,y,.13),(r,r*.76,h),ore,i)
    peak(m,-.22,.57,.17,.45,19)
    peak(m,.13,.64,.14,.51,16)
    # Portal embedded in a lower rocky bluff, not a freestanding doorway.
    mine(m,.59,-.105,angle=-.32)
    crate(m,.715,-.21,.13,.059)
    for i,(x,y,r) in enumerate([(-.56,.06,.055),(-.44,.22,.045),(.22,.54,.048),(.32,.62,.053),(-.37,-.37,.05),(-.18,-.57,.054),(.17,-.54,.042),(.45,-.32,.031),(.68,.10,.043),(-.17,.49,.034)]):pebble(m,x,y,r,i+5)
    for i,(x,y) in enumerate([(-.47,-.45),(.52,.40),(-.64,.19),(.14,.61),(-.14,-.68),(.45,-.41)]):
        pebble(m,x,y,.019,i);pebble(m,x+.026,y-.008,.012,i+10)

def gold_outcrops(m):
    stone=['#9c702f','#b78534','#c69943','#a77a31']
    layouts=[(-.03,.66,.24,.58),(-.43,.42,.17,.33),(.40,.44,.16,.31),(-.55,-.25,.16,.27),(.08,-.66,.15,.25),(.43,-.48,.105,.27)]
    for i,(x,y,r,h) in enumerate(layouts):
        # A separate broader composition than ore, with seams on the rock faces.
        n=7;ang=.2+i*.39;rng=random.Random(90+i);rings=[]
        for k,(rad,hh) in enumerate([(1,-.02),(.93,.31),(.63,.76)]):
            rings.append([(x+r*rad*math.cos(ang+j*TAU/n)*(1+rng.uniform(-.08,.08)),y+r*rad*.8*math.sin(ang+j*TAU/n),.13+h*(hh+rng.uniform(-.04,.04))) for j in range(n)])
            if k==0:rings[-1]=[(xx,yy,.125) for xx,yy,zz in rings[-1]]
        def mineral_value(p):
            xx,yy,zz=p;hh=(zz-.13)/h
            theta=math.atan2((yy-y)/.8,xx-x)
            phase=[-2.10,-1.35,-2.35,-.65,-2.65,-1.50][i]
            width=[.68,.45,.79,.54,.83,.48][i]
            value=math.cos(theta-phase-.42*math.sin(hh*5+i))-math.cos(width)
            # Selected deposits broaden into a cap that reads from overhead.
            if i in [0,2,4]:value=max(value,(hh-[.67,.72,.62][i//2])*2.0)
            return value
        def mineral_face(tri,color,shade):
            # Split the face itself using a continuous field shared at its edges.
            # This produces connected mineral regions, without decals or z-fighting.
            values=[mineral_value(p) for p in tri]
            for positive,mat in [(False,color),(True,shade)]:
                poly=[]
                for j in range(3):
                    k=(j+1)%3;a,b=Vector(tri[j]),Vector(tri[k]);va,vb=values[j],values[k]
                    ina=va>=0 if positive else va<0;inb=vb>=0 if positive else vb<0
                    if ina:poly.append(tuple(a))
                    if ina!=inb:poly.append(tuple(a+(b-a)*(va/(va-vb))))
                if len(poly)>=3:m.face(poly,mat)
        for k in range(2):
            for j in range(n):
                a,b,c,d=rings[k][j],rings[k][(j+1)%n],rings[k+1][(j+1)%n],rings[k+1][j]
                mineral_face([a,b,c],stone[(i+j+k)%4],['#f4c229','#ffdb4f','#e9ad18'][(i+j+k)%3])
                mineral_face([a,c,d],stone[(i+j+1)%4],['#edba24','#ffd64b','#eeb625'][(i+j+k)%3])
        tip=(x-r*.12,y+r*.04,.13+h)
        for j in range(n):mineral_face([rings[-1][j],rings[-1][(j+1)%n],tip],stone[j%4],['#ffda4b','#edbc30','#f6ca37'][j%3])
    mine(m,.59,-.09,angle=-.40,gold=True)
    for i,(x,y,r) in enumerate([(-.57,.12,.075),(-.27,.58,.059),(.20,.54,.058),(-.40,-.45,.072),(-.18,-.60,.055),(.31,-.55,.068),(.61,.28,.072)]):pebble(m,x,y,r,i)
    for i,(x,y) in enumerate([(-.50,.27),(-.61,-.06),(.12,.67),(-.33,-.49),(.31,-.47)]):pebble(m,x,y,.026,i,['#dba426','#f2c63c','#bc8c32'])
    crate(m,.69,-.18,.13,.06)

def scrub(m,x,y,seed=1):
    rng=random.Random(seed)
    m.beam((x,y,.13),(x+.008,y,.255),.013,WOOD,5)
    for i in range(5):
        a=i*TAU/5+seed*.8;end=(x+math.cos(a)*.067,y+math.sin(a)*.046,.19+rng.random()*.055)
        m.beam((x,y,.16),end,.009,WOOD_LIGHT,4)

def desert(m):
    for i,(x,y,r,h) in enumerate([(-.32,.55,.21,.23),(.33,-.54,.18,.135)]):
        peak(m,x,y,r,h,i+21,True)
        # All dune facets use sand rather than rock tones.
        for j in range(len(m.c)-35,len(m.c)):m.c[j]=rgba(['#eabe5c','#f6d17d','#fada89','#dcad50'][j%4])
    for i,(x,y,r) in enumerate([(-.58,-.13,.086),(.34,.52,.065),(-.14,-.66,.074),(.55,-.29,.041),(-.64,.08,.030),(.07,.62,.027),(.45,-.49,.030)]):pebble(m,x,y,r,i)
    x,y=.59,.08
    m.rings((x,y,.13),[(.035,0),(.035,.225),(.025,.256),(0,.268)],7,['#647e29','#7e9630','#577325'])
    for side,hh in [(-1,.13),(1,.17)]:
        m.beam((x,y,.13+hh),(x+side*.060,y,.13+hh),.023,'#708c2d',5)
        m.rings((x+side*.06,y,.13+hh),[(.023,0),(.020,.070),(0,.08)],6,'#7c942e')
    for i,(x,y) in enumerate([(-.57,.28),(.03,.70),(-.42,-.46),(.47,-.33)]):scrub(m,x,y,i)

def hills(m):
    clay=['#cb5b2c','#e3783b','#d56a31','#ee8846']
    for i,(x,y,r,h) in enumerate([(-.34,.53,.19,.35),(.03,.66,.17,.30),(-.63,-.02,.16,.26),(-.36,-.50,.15,.26)]):
        start=len(m.v);boulder(m,(x,y,.068),(r,r*.87,h),clay,i+30,2)
        for j in range(start,len(m.v)):
            xx,yy,zz=m.v[j];m.v[j]=(xx,yy,max(.13,zz))
        boulder(m,(x+r*.45,y-r*.30,.104),(r*.60,r*.40,h*.40),clay,i+45)
    # Excavation terraces are broad broken clay benches.
    for i in range(3):m.block((-.58,-.27,.16+i*.05),(.16-i*.018,.25-i*.05,.06),clay[i],.008,rot=-.4)
    for x,y in [(.31,-.54),(.47,.33)]:
        for j in range(3):
            for i in range(3-j):m.block((x+(i-(2-j)/2)*.065,y+j*.012,.1525+j*.045),(.059,.085,.045),clay[(i+j)%4],.002)
    # The kiln shares the same real recessed throat construction as the mines.
    start=len(m.v)
    rock_portal(m,.13,['#c18358','#d89463','#e1a473'],[(-.118,0),(-.127,.11),(-.087,.206),(0,.252),(.087,.206),(.127,.11),(.118,0)],[(-.046,0),(-.046,.055),(-.034,.088),(0,.105),(.034,.088),(.046,.055),(.046,0)],.13)
    m.transform(offset=(.58,-.20,0),start=start)
    start=len(m.v)
    for xx in [-.106,.106]:
        for yy in [-.072,.072]:
            h=.223+yy*.15;m.block((xx,yy,.13+h/2),(.030,.030,h),WOOD_DARK,.002)
    for yy in [-.072,.072]:m.box((0,yy,.346+yy*.15),(.245,.033,.025),WOOD,bottom=True)
    panel=[(-.137,-.099,.360-.099*.15),(.137,-.099,.360-.099*.15),(.137,.099,.360+.099*.15),(-.137,.099,.360+.099*.15)]
    m.face(panel,WOOD_DARK);m.face([(a,b,c-.012) for a,b,c in reversed(panel)],WOOD)
    for j in range(4):
        a=panel[j];b=panel[(j+1)%4];m.face([(a[0],a[1],a[2]-.012),(b[0],b[1],b[2]-.012),b,a],WOOD)
    for j in range(4):
        for i in range(5):
            yy=(j-1.5)*.046;m.block(((i-2)*.052,yy,.367+yy*.15),(.050,.044,.017),clay[(i+j)%4],.002)
    m.transform(offset=(.45,.40,0),rot=-.45,start=start)
    for i,(x,y) in enumerate([(-.46,.35),(-.52,-.45),(-.17,-.61),(.61,.15),(.26,.59),(.50,-.39)]):
        pebble(m,x,y,.035,i,clay);pebble(m,x+.04,y+.015,.018,i+11,clay)

def terrain(name):
    m=base(name)
    {'forest':forest,'pasture':pasture,'fields':fields,'hills':hills,'mountains':mountains,'desert':desert,'gold':lambda m:mountains(m,True)}[name](m)
    # Keep silhouettes within the free annulus, including overhanging foliage.
    for i in range(m.prop_vertex_start,len(m.v)):
        x,y,z=m.v[i];r=math.hypot(x,y)
        if r<.453:x*=.453/r;y*=.453/r
        edge=max(x*math.cos(j*math.pi/3)+y*math.sin(j*math.pi/3) for j in range(6))
        if edge>.76:x*=.76/edge;y*=.76/edge
        m.v[i]=(x,y,z)
    return m
