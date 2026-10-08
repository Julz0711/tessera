from meshkit import *

COLORS={
 'forest':('#477a38','#6c924a'), 'pasture':('#8aac43','#b0cb58'),
 'fields':('#d7ad44','#e7c25c'), 'hills':('#b85830','#d77643'),
 'mountains':('#858891','#a1a2a5'), 'desert':('#d6b366','#efcd80'),
 'gold':('#be903e','#deb75c')}

def base(name):
    m=Mesh('hex_'+name);side,top=COLORS[name]
    m.rings((0,0,0),[(1.0,-.15),(1.0,-.02),(.985,.01)],6,STONE,angle=math.pi/6,bottom=True)
    # Wide pale shoulder leaves roads legible and protects edge intersections.
    m.rings((0,0,0),[(.925,.012),(.925,.105),(.902,.13)],6,side,angle=math.pi/6,cap=False)
    m.face([(.902*math.cos(math.pi/6+j*TAU/6),.902*math.sin(math.pi/6+j*TAU/6),.13) for j in range(6)],top)
    # Inlaid token ring; open center, no numbers baked into the mesh.
    for j in range(24):
        a=j*TAU/24;b=(j+1)*TAU/24
        m.face([(.410*math.cos(a),.410*math.sin(a),.131),(.420*math.cos(a),.420*math.sin(a),.131),(.420*math.cos(b),.420*math.sin(b),.131),(.410*math.cos(b),.410*math.sin(b),.131)],side)
    m.prop_vertex_start=len(m.v)
    return m

def pebble(m,x,y,r=.035,z=.13):
    m.rings((x,y,z),[(r,0),(r*.82,r*.6),(0,r*1.35)],5,['#aaa9a1','#c1bfb4','#959891'])

def shrub(m,x,y,r=.055):
    m.rings((x,y,.13),[(r*.75,0),(r,r*.7),(0,r*1.9)],5,['#3b743e','#548c3e','#6d9a40'])

def mine(m,x,y,z=.13):
    # Timber-framed portal with a broad dark interior; four sleepers communicate scale.
    m.plaque(x,y+.021,z,.19,.16,DARK,arch=True)
    for dx in [-.094,.094]:m.box((x+dx,y,z+.084),(.032,.044,.17),WOOD)
    m.box((x,y,z+.17),(.246,.054,.040),WOOD_LIGHT)
    for i in range(4):m.box((x,y-.035-i*.036,z+.008),(.105,.017,.015),WOOD_LIGHT)
    for dx in [-.037,.037]:m.box((x+dx,y-.079,z+.016),(.011,.186,.014),'#4e4c46')

def terrain(name):
    m=base(name)
    if name=='forest':
        for x,y,r,h in [(-.42,.42,.14,.48),(-.03,.65,.15,.61),(.40,.44,.12,.43),(-.62,.01,.105,.31),(.62,.0,.11,.31),(-.38,-.48,.09,.25)]:fir(m,x,y,.13,r,h)
        leafy(m,.53,.24,.13,.115,.36)
        leafy(m,-.28,.57,.13,.09,.30)
        for x,y in [(.32,-.51),(-.54,-.28)]:
            m.rings((x,y,.13),[(.06,0),(.047,.09)],6,WOOD,cap=False)
            m.rings((x,y,.22),[(.047,0)],6,WOOD_LIGHT)
        for x,y in [(.57,-.27),(-.11,-.62),(.13,.54)]:shrub(m,x,y,.045)
        pebble(m,-.52,.20,.055)
    elif name=='pasture':
        leafy(m,-.17,.63,.13,.13,.38)
        fir(m,-.55,.25,.13,.08,.26)
        for x,y,rot in [(-.47,-.32,-.4),(.53,.26,.7),(.28,-.54,.2)]:
            start=len(m.v)
            m.rings((0,0,.17),[(.06,0),(.075,.055),(.06,.105),(0,.12)],6,[WHITE,'#e7e0ce'],aspect=(1.28,.80))
            m.box((.074,-.003,.208),(.050,.050,.052),WOOD_DARK)
            for xx in [-.046,.046]:
                for yy in [-.031,.031]:m.rings((xx,yy,.13),[(.013,0),(0,.05)],4,WOOD_DARK,angle=math.pi/4)
            m.transform(offset=(x,y,0),rot=rot,start=start)
        for x,y in [(.48,-.27),(-.59,-.08)]:shrub(m,x,y,.045)
        pebble(m,-.13,-.64,.043)
    elif name=='fields':
        for x,y,rot,w,d in [(-.40,.47,.70,.30,.15),(.61,.04,math.pi/2,.28,.15),(-.32,-.52,-.55,.28,.15)]:
            start=len(m.v)
            m.box((0,0,.143),(w,d,.026),WOOD)
            for j in range(4):
                yy=(j-1.5)*d/4
                # Six-sided extruded crop ridges, not individual stalks.
                m.gable((0,yy,.157),d/4*.85,w,.05,['#edb92e','#ffce49','#d59b20'],axis=math.pi/2)
            m.transform(offset=(x,y,0),rot=rot,start=start)
        fir(m,.11,.62,.13,.060,.27)
        leafy(m,-.61,.04,.13,.055,.20)
        for x,y in [(.29,.49),(.20,-.57)]:
            for dx,dy,h in [(-.033,0,.05),(.033,0,.05),(0,0,.11)]:m.box((x+dx,y+dy,.13+h),(.060,.065,.06),'#eabc3d',top='#f7d465')
        for x,y in [(.47,-.37),(-.54,-.20)]:shrub(m,x,y,.04)
    elif name in ['mountains','gold']:
        col=['#81838b','#9c9da2','#6e727d'] if name=='mountains' else ['#a68142','#bc934a','#d0a454']
        for i,(x,y,r,h) in enumerate([(-.05,.64,.16,.53),(-.39,.44,.13,.30),(.41,.44,.13,.27),(-.60,-.06,.10,.19),(-.35,-.49,.085,.14),(.38,-.47,.08,.14)]):
            if name=='mountains':
                m.rings((x,y,.13),[(r,0),(r*.85,h*.40),(r*.50,h*.73),(0,h)],5,col,angle=.2+i*.37,stagger=.13)
                m.rings((x,y,.13+h*.71),[(r*.51,0),(0,h*.30)],5,['#f4eee4','#dedee0','#ffffff'],angle=.2+i*.37)
            else:
                rock(m,(x,y,.13),(r,r*.8,h),col,i+8)
                m.rings((x+r*.48,y-r*.38,.13+h*.35),[(r*.47,0),(r*.50,h*.25),(0,h*.47)],5,['#fbc342','#e5a729','#ffda6c'])
        # Mine faces toward front, outside the token reserve.
        mine(m,.56,-.13)
        for x,y in [(-.46,.23),(.19,.49),(-.13,-.58),(-.57,-.27)]:pebble(m,x,y,.035)
    elif name=='desert':
        for x,y,r,h in [(-.32,.49,.16,.17),(.30,-.50,.11,.10)]:
            m.rings((x,y,.13),[(r,0),(r*.59,h*.58),(0,h)],6,['#e4bd6c','#f4d78d','#d8b063'],aspect=(1.2,.65),stagger=.3)
        for x,y,r in [(-.58,-.12,.047),(.33,.48,.041),(-.26,-.55,.041)]:pebble(m,x,y,r)
        x,y=.57,.05
        m.rings((x,y,.13),[(.028,0),(.028,.20),(.018,.23)],5,'#65883c')
        m.beam((x-.043,y,.22),(x+.050,y,.22),.018,'#718b3b')
        m.rings((x-.043,y,.22),[(.017,0),(.015,.066)],5,'#829749')
        # Dry branch silhouettes.
        for x,y in [(-.55,.22),(.04,.63)]:
            m.beam((x,y,.13),(x+.012,y,.22),.009,WOOD)
            m.beam((x,y,.17),(x-.032,y+.008,.207),.007,WOOD_LIGHT)
    elif name=='hills':
        clay=['#b45430','#d87343','#e48953']
        for i,(x,y,r,h) in enumerate([(-.33,.49,.14,.26),(.07,.65,.11,.21),(-.59,-.05,.09,.15),(-.34,-.47,.10,.14)]):rock(m,(x,y,.13),(r,r*.83,h),clay,i)
        # Kiln and open drying shelter, distinct from player architecture.
        m.rings((.55,-.12,.13),[(.10,0),(.098,.11),(.061,.18),(0,.21)],7,['#cc8e62','#dba277','#bc7a54'])
        m.plaque(.55,-.216,.13,.071,.094,DARK,arch=True)
        for x in [.40,.60]:m.box((x,.35,.23),(.023,.023,.20),WOOD)
        m.gable((.50,.36,.34),.27,.23,.046,'#ac4f2f')
        for x,y in [(.31,-.49),(.50,.30)]:
            for i in range(2):
                for j in range(2-i):m.box((x+(j-.5)*.067,y,.154+i*.04),(.062,.078,.038),clay[(i+j)%3])
    return m

from landscape_v2 import terrain
