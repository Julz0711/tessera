from meshkit import *

def door(m,x,y,z,w,h):
    m.plaque(x,y,z,w*1.3,h*1.12,STONE_LIGHT,arch=True)
    m.plaque(x,y-.006,z,w,h,WOOD_DARK,arch=True)
    m.plaque(x,y-.009,z+.015,w*.78,h*.90,WOOD,arch=True)
    for dx in [-.2,.2]: m.plaque(x+dx*w,y-.011,z+.03,w*.025,h*.57,WOOD_DARK)
    for zz in [.25,.52]:m.plaque(x,y-.013,z+h*zz,w*.72,h*.025,WOOD_DARK)
    m.plaque(x+w*.18,y-.015,z+h*.4,w*.055,w*.08,GOLD)

def window(m,x,y,z,w=.07,h=.18,rot=0):
    start=len(m.v)
    m.plaque(0,0,0,w*1.35,h*1.15,STONE_DARK,arch=True)
    m.plaque(0,-.002,.015,w,h,DARK,arch=True)
    m.transform(offset=(x,y,z),rot=rot,start=start)

def roof(m,x,y,z,r,h,n=8):
    m.rings((x,y,z),[(r,0),(r,.045),(r*.9,.065),(0,h)],n,MAIN,angle=math.pi/8 if n==8 else math.pi/4)

def chimney(m,x,y,z,h=.30):
    m.box((x,y,z+h/2),(.12,.14,h),STONE)
    m.box((x,y,z+h),(.16,.18,.055),STONE_LIGHT)
    m.face([(x-.042,y-.052,z+h+.028),(x+.042,y-.052,z+h+.028),(x+.042,y+.052,z+h+.028),(x-.042,y+.052,z+h+.028)],DARK)

def house(m,x,y,w,d,h,roofh=.28,timber=False):
    m.box((x,y,.055),(w+.04,d+.04,.11),STONE_DARK,top=STONE)
    m.box((x,y,h/2+.05),(w,d,h),STONE)
    m.box((x,y,h+.048),(w+.12,d+.12,.045),SHADE)
    m.gable((x,y,h+.07),w+.14,d+.14,roofh)
    if timber:
        for xx in [-1,1]:
            for yy in [-1,1]:
                m.box((x+xx*(w/2-.022),y+yy*(d/2+.007),h/2),(.055,.055,h),WOOD)
        m.box((x,y-d/2-.016,h-.02),(w,.045,.06),WOOD_LIGHT)
    window(m,x,y-d/2-.024,.26)
    window(m,x,y+d/2+.024,.26,rot=math.pi)

def banner(m,x,y,z,w,h,trim=False,track=False):
    if trim:m.plaque(x,y,z-.012,w*1.13,h*1.045,GOLD,notch=True)
    m.plaque(x,y-.004,z,w,h,ACCENT if track else MAIN,notch=True)
    m.beam((x-w*.64,y-.008,z+h),(x+w*.64,y-.008,z+h),.017,GOLD if trim else WOOD_LIGHT,4)
    if trim:
        yy=y-.008;zz=z+h*.52
        m.face([(x-w*.17,yy,zz),(x+w*.17,yy,zz),(x+w*.22,yy,zz+h*.13),(x+w*.07,yy,zz+h*.08),(x,yy,zz+h*.19),(x-w*.07,yy,zz+h*.08),(x-w*.22,yy,zz+h*.13)],MAIN if track else GOLD)

def turret(m,x,y,r,h,roofh,grand=False):
    m.rings((x,y,0),[(r*1.17,0),(r*1.17,.16),(r,.23),(r,h)],8,STONE,angle=math.pi/8)
    m.rings((x,y,h-.07),[(r*1.02,0),(r*1.17,.04),(r*1.17,.16)],8,STONE_LIGHT,angle=math.pi/8)
    roof(m,x,y,h+.09,r*1.27,roofh)
    for a in [-math.pi/2,0,math.pi/2,math.pi]:
        window(m,x+math.cos(a)*r*.934,y+math.sin(a)*r*.934,h*.52,.055,.17,rot=a+math.pi/2)
    if grand:
        for a in range(8):
            ang=a*TAU/8
            m.box((x+math.cos(ang)*r*1.08,y+math.sin(ang)*r*1.08,h+.125),(.08,.055,.08),STONE_LIGHT,rot=ang+math.pi/2)
    m.rings((x,y,h+.1+roofh),[(.025,0),(.043,.025),(.025,.059),(0,.12)],6,GOLD)

def settlement():
    m=Mesh('settlement')
    house(m,-.42,.025,.59,.78,.57,.32,True)
    house(m,.40,.12,.56,.67,.51,.28,True)
    m.rings((0,-.09,0),[(.275,0),(.26,.10),(.25,.88)],8,STONE,angle=math.pi/8)
    m.rings((0,-.09,.84),[(.25,0),(.31,.045),(.31,.10)],8,WOOD_LIGHT,angle=math.pi/8)
    roof(m,0,-.09,.93,.355,.42)
    for x in [-.20,.20]:m.box((x,-.30,.86),(.06,.08,.10),WOOD)
    door(m,0,-.327,.075,.18,.40)
    banner(m,0,-.327,.55,.13,.25)
    for i in range(3):m.box((0,-.40-i*.055,.06-i*.016),(.28,.15,.04),STONE_LIGHT)
    chimney(m,-.50,.21,.75,.32)
    chimney(m,.49,.28,.67,.21)
    # Small roofed porch, echoing the tower roof color.
    m.box((-.44,-.47,.48),(.41,.25,.045),SHADE)
    m.gable((-.44,-.47,.50),.42,.26,.07)
    for x in [-.60,-.28]:m.box((x,-.56,.23),(.045,.045,.46),WOOD)
    # Shutters and a single crate are large enough to survive game zoom.
    m.plaque(.41,-.225,.20,.17,.19,MAIN)
    m.plaque(.41,-.228,.20,.012,.19,SHADE)
    m.box((-.37,-.51,.08),(.15,.14,.16),WOOD_LIGHT)
    m.plaque(-.37,-.582,.021,.115,.11,WOOD)
    flag(m,0,-.09,1.35,.29,.23)
    m.transform(.26)
    return m

def city():
    m=Mesh('city')
    house(m,-.43,.24,.62,.78,.85,.34)
    house(m,.43,.24,.57,.82,.75,.33)
    chimney(m,-.49,.42,1.05,.24)
    chimney(m,.51,.41,.96,.22)
    turret(m,0,.20,.265,1.32,.49)
    window(m,0,-.048,1.05,.055,.17)
    turret(m,-.51,-.34,.195,.66,.30)
    turret(m,.51,-.34,.195,.66,.30)
    m.box((0,-.33,.33),(.65,.28,.66),STONE)
    m.box((0,-.33,.64),(.69,.32,.08),STONE_LIGHT)
    for x in [-.27,-.09,.09,.27]:m.box((x,-.33,.72),(.085,.32,.10),STONE_LIGHT)
    door(m,0,-.478,0,.25,.50)
    banner(m,-.25,-.50,.29,.10,.31)
    banner(m,.25,-.50,.29,.10,.31)
    # Back and side elevations carry windows; no blank box backs.
    window(m,-.748,.23,.38,rot=-math.pi/2)
    window(m,.724,.23,.35,rot=math.pi/2)
    m.transform(.31)
    return m

def metropolis():
    m=Mesh('metropolis')
    m.rings((0,0,0),[(.98,0),(.98,.045),(.94,.07)],8,STONE_DARK,angle=math.pi/8,aspect=(1,.87))
    house(m,-.46,.29,.56,.80,.97,.32)
    house(m,.46,.29,.56,.80,.93,.32)
    house(m,0,.49,.74,.55,1.17,.36)
    turret(m,0,.10,.30,1.68,.48,True)
    for x in [-.59,.59]:
        turret(m,x,-.34,.205,.92,.31,True)
        turret(m,x,.48,.165,1.10,.30,False)
    m.box((0,-.34,.42),(.78,.40,.84),STONE)
    m.box((0,-.34,.85),(.80,.44,.08),STONE_LIGHT)
    for x in [-.33,-.11,.11,.33]:m.box((x,-.34,.95),(.105,.44,.12),STONE_LIGHT)
    door(m,0,-.548,.075,.29,.54)
    for i in range(3):m.box((0,-.58-i*.09,.08-i*.019),(.43,.23,.047),STONE_LIGHT)
    # Track banners are separate from player-colored roofs and side banners.
    banner(m,0,-.189,1.03,.22,.54,True,True)
    banner(m,-.59,-.535,.29,.14,.51,True)
    banner(m,.59,-.535,.29,.14,.51,True)
    # Two small side porches and pointed evergreens.
    for side in [-1,1]:
        x=side*.77
        m.box((x,.08,.40),(.30,.43,.055),SHADE)
        m.gable((x,.08,.425),.31,.45,.10)
        for y in [-.09,.25]:m.box((x+side*.1,y,.22),(.045,.045,.38),STONE_LIGHT)
        fir(m,side*.81,-.48,.06,.07,.31)
        m.box((side*.70,-.67,.055),(.10,.10,.11),WOOD_LIGHT)
        window(m,side*.747,.27,.42,rot=side*math.pi/2)
    m.transform(.30)
    return m

def road():
    m=Mesh('road')
    # Underside is -0.045: existing wrapper mounts the origin 0.06 above TILE_TOP.
    m.box((0,0,-.012),(.62,.14,.066),STONE_DARK,top=STONE,bottom=True)
    # Broad paver faces, slight offsets and a continuous player stripe.
    for i in range(7):
        x=-.265+i*.088
        m.face([(x-.041,-.061,.022),(x+.041,-.061,.022),(x+.041,-.024,.022),(x-.041,-.024,.022)],STONE_LIGHT if i%2 else STONE)
        m.face([(x-.041,.024,.022),(x+.041,.024,.022),(x+.041,.061,.022),(x-.041,.061,.022)],STONE if i%2 else STONE_LIGHT)
        m.face([(x-.041,-.021,.025),(x+.041,-.021,.025),(x+.041,.021,.025),(x-.041,.021,.025)],MAIN)
    for x in [-.269,.269]:
        for y in [-.061,.061]:
            m.box((x,y,.020),(.052,.048,.10),STONE,top=STONE_LIGHT)
            m.rings((x,y,.070),[(.041,0),(.041,.011),(0,.041)],4,MAIN,angle=math.pi/4)
    for x in [-.173,.173]:
        for y in [-.066,.066]:m.box((x,y,.045),(.143,.019,.029),MAIN)
    for x in [-.19,-.063,.063,.19]:
        for side in [-1,1]:
            m.face([(x-.0018,side*.0701,-.035),(x+.0018,side*.0701,-.035),(x+.0018,side*.0701,.021),(x-.0018,side*.0701,.021)],STONE_DARK,reverse=side==1)
    m.transform((1,.7223,.70),offset=(0,0,-.0135))
    return m

# Public generator API; the original implementation remains in the v1 archive.
from architecture_v2 import settlement, city, metropolis, road
