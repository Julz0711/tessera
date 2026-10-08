"""Reference-led architecture: thick roofs, recessed openings and joined wings."""
from meshkit import *

def arch_outline(w,h):
    return [(-w/2,0),(w/2,0),(w/2,h*.69),(w*.30,h*.86),(0,h),(-w*.30,h*.86),(-w/2,h*.69)]

def arch_frame(m,x,y,z,w,h,th=.035,c=STONE_LIGHT,depth=.035):
    inner=arch_outline(w,h);outer=arch_outline(w+2*th,h+th*1.35)
    for j in range(1,len(inner)):
        k=(j+1)%len(inner)
        a=(x+inner[j][0],y,z+inner[j][1]);b=(x+inner[k][0],y,z+inner[k][1])
        u=(x+outer[j][0],y,z+outer[j][1]);v=(x+outer[k][0],y,z+outer[k][1])
        m.face([a,u,v,b],c)
        m.face([a,b,(b[0],y+depth,b[2]),(a[0],y+depth,a[2])],STONE_DARK)
        m.face([u,(u[0],y+depth,u[2]),(v[0],y+depth,v[2]),v],c)

def door(m,x,y,z,w,h):
    pts=arch_outline(w,h)
    m.face([(x+a,y-.003,z+b) for a,b in pts],WOOD_DARK)
    m.face([(x+a*.87,y-.006,z+.007+b*.94) for a,b in pts],WOOD)
    arch_frame(m,x,y-.028,z,w,h,.042,STONE_LIGHT,.043)
    for dx in [-.3,-.1,.1,.3]:m.box((x+w*dx,y-.008,z+h*.36),(.004,.003,h*.65),WOOD_DARK)
    for t in [.25,.58]:m.box((x,y-.01,z+h*t),(w*.86,.012,.014),WOOD_DARK)
    for dx in [-.065,.065]:m.box((x+w*dx,y-.009,z+h*.45),(.011,.017,.027),GOLD)

def window(m,x,y,z,w=.065,h=.16,rot=0):
    start=len(m.v)
    m.face([(a,-.004,b) for a,b in arch_outline(w,h)],DARK)
    arch_frame(m,0,-.017,0,w,h,.013,STONE,.016)
    m.box((0,-.008,.002),(w+.035,.038,.020),STONE_LIGHT)
    m.transform(offset=(x,y,z),rot=rot,start=start)

def shutter(m,x,y,z,w=.17,h=.19):
    m.block((x,y,z+h/2),(w,.022,h),MAIN,.008)
    m.box((x,y-.014,z+h/2),(.007,.006,h*.92),SHADE)
    for q in [-.32,.32]:
        for t in [.2,.8]:m.box((x+w*q,y-.015,z+h*t),(.024,.008,.017),GOLD)

def roof(m,x,y,z,r,h,n=8):
    a=math.pi/8 if n==8 else math.pi/4
    m.rings((x,y,z),[(r*.98,0),(r,.038),(r*.97,.060),(r*.10,h),(0,h+.013)],n,MAIN,angle=a,bottom=True)
    for j in range(n):
        ang=a+j*TAU/n
        m.beam((x+math.cos(ang)*r*.972,y+math.sin(ang)*r*.972,z+.058),(x+math.cos(ang)*r*.10,y+math.sin(ang)*r*.10,z+h),.0035,MAIN,4)

def hip(m,x,y,z,w,d,h):
    low=[(-w/2,-d/2),(w/2,-d/2),(w/2,d/2),(-w/2,d/2)]
    rw=max(0,(w-d)*.5);rd=max(0,(d-w)*.5)
    top=[(-rw,-rd),(rw,-rd),(rw,rd),(-rw,rd)]
    m.face([(x+a,y+b,z) for a,b in reversed(low)],SHADE)
    for j in range(4):
        k=(j+1)%4;a=(x+low[j][0],y+low[j][1],z);b=(x+low[k][0],y+low[k][1],z)
        m.face([a,b,(b[0],b[1],z+.045),(a[0],a[1],z+.045)],MAIN)
        pts=[(a[0],a[1],z+.045),(b[0],b[1],z+.045),(x+top[k][0],y+top[k][1],z+h),(x+top[j][0],y+top[j][1],z+h)]
        clean=[]
        for v in pts:
            if v not in clean:clean.append(v)
        m.face(clean,MAIN);m.beam(pts[0],pts[-1],.004,MAIN,4)
        t=.36
        u=tuple(pts[0][a]*(1-t)+pts[-1][a]*t for a in range(3));v=tuple(pts[1][a]*(1-t)+pts[2][a]*t for a in range(3))
        m.beam((u[0],u[1],u[2]+.002),(v[0],v[1],v[2]+.002),.0025,MAIN,4)

def chimney(m,x,y,z,h=.30):
    # Continuous hollow shaft and one joined rim, with a recessed soot well.
    outer=[(-.0625,-.07),(.0625,-.07),(.0625,.07),(-.0625,.07)]
    rim=[(-.082,-.091),(.082,-.091),(.082,.091),(-.082,.091)]
    inner=[(-.041,-.049),(.041,-.049),(.041,.049),(-.041,.049)]
    def p(v,zz):return (x+v[0],y+v[1],zz)
    for i in range(4):
        j=(i+1)%4
        m.face([p(outer[i],z),p(outer[j],z),p(outer[j],z+h-.034),p(outer[i],z+h-.034)],STONE)
        m.face([p(outer[i],z+h-.034),p(outer[j],z+h-.034),p(rim[j],z+h-.025),p(rim[i],z+h-.025)],STONE_LIGHT)
        m.face([p(rim[i],z+h-.025),p(rim[j],z+h-.025),p(rim[j],z+h+.032),p(rim[i],z+h+.032)],STONE_LIGHT)
        m.face([p(rim[i],z+h+.032),p(rim[j],z+h+.032),p(inner[j],z+h+.032),p(inner[i],z+h+.032)],STONE_LIGHT)
        m.face([p(inner[i],z+h+.032),p(inner[j],z+h+.032),p(inner[j],z+h-.12),p(inner[i],z+h-.12)],STONE_DARK)
    m.face([p(v,z+h-.12) for v in inner],DARK)

def house(m,x,y,w,d,h,roofh=.28,timber=False):
    m.box((x,y,(h+.05)/2),(w,d,h+.05),STONE,bottom=True)
    m.box((x,y,h+.053),(w+.015,d+.015,.07),WOOD if timber else STONE_LIGHT)
    for xx in [-1,1]:
        for yy in [-1,1]:
            if timber:m.block((x+xx*(w/2-.018),y+yy*(d/2-.014),h*.5+.025),(.075,.082,h+.05),WOOD,.006)
            m.block((x+xx*(w/2-.022),y+yy*(d/2-.01),.08),(.125,.12,.16),STONE_LIGHT,.007)
    for yy in [-1,1]:
        m.box((x,y+yy*(d/2-.01),h+.017),(w+.025,.075,.08),WOOD if timber else STONE_LIGHT)
        for dx in [-w*.35,0,w*.35]:
            if timber:m.beam((x+dx,y+yy*(d/2-.014),h-.06),(x+dx,y+yy*(d/2+.075),h+.08),.027,WOOD,4)
    hip(m,x,y,h+.08,w+.17,d+.16,roofh)
    if not timber or x<0:
        window(m,x,y-d/2-.01,.27);window(m,x,y+d/2+.01,.28,rot=math.pi)
    for side in [-1,1]:window(m,x+side*(w/2+.002),y,.24,rot=side*math.pi/2)

def banner(m,x,y,z,w,h,trim=False,track=False):
    c=ACCENT if track else MAIN
    pts=[(-w/2,0),(0,h*.15),(w/2,0),(w/2,h),(-w/2,h)]
    def sheet(pts,y,c):m.extrude([(x+a,y,z+b) for a,b in pts],.005,c)
    sheet([(a*1.18,b*1.06-.018) for a,b in pts],y+.002,GOLD if trim else STONE_LIGHT)
    sheet(pts,y-.005,c)
    m.beam((x-w*.63,y,z+h+.01),(x+w*.63,y,z+h+.01),.015,GOLD if trim else WOOD_LIGHT,6)
    if trim:
        for dx in [-.65,.65]:m.rings((x+w*dx,y,z+h),[(.019,0),(.025,.019),(0,.037)],6,GOLD)
        yy=y-.012;zz=z+h*.52
        m.face([(x-w*.18,yy,zz),(x+w*.18,yy,zz),(x+w*.22,yy,zz+h*.14),(x+w*.07,yy,zz+h*.08),(x,yy,zz+h*.19),(x-w*.07,yy,zz+h*.08),(x-w*.22,yy,zz+h*.14)],MAIN if track else GOLD)

def turret(m,x,y,r,h,roofh,grand=False):
    m.rings((x,y,0),[(r*1.16,0),(r*1.16,.16),(r,.25),(r,h)],8,STONE,angle=math.pi/8)
    m.rings((x,y,h-.045),[(r*1.01,0),(r*1.17,.055),(r*1.17,.145)],8,STONE_LIGHT,angle=math.pi/8)
    # Solid inner drum carries the roof; the crenels no longer expose daylight.
    m.rings((x,y,h+.09),[(r*.965,0),(r*.965,.12)],8,STONE,angle=math.pi/8)
    if grand:
        for a in range(8):
            ang=a*TAU/8
            m.block((x+math.sin(ang)*r*.891,y-math.cos(ang)*r*.891,h+.132),(r*.48,r*.38,.15),STONE_LIGHT,.002,rot=ang)
    roof(m,x,y,h+.19,r*1.29,roofh)
    for a in [-math.pi/2,0,math.pi/2,math.pi]:window(m,x+math.cos(a)*r*.925,y+math.sin(a)*r*.925,h*.50,.055,.17,rot=a+math.pi/2)
    m.rings((x,y,h+.181+roofh),[(.026,0),(.045,.030),(.031,.068),(0,.138)],8,GOLD,bottom=True)

def stairs(m,x,y,w,n=3):
    for i in range(n):
        h=.12-i*.031;m.block((x,y-i*.065,h/2),(w,.17,h),STONE_LIGHT,.006)

def settlement():
    m=Mesh('settlement')
    house(m,-.46,.08,.61,.78,.60,.29,True);house(m,.43,.14,.57,.70,.55,.27,True)
    house(m,.04,.36,.49,.44,.61,.27,True)
    m.rings((0,-.125,0),[(.278,0),(.268,.13),(.268,1.06)],8,STONE,angle=math.pi/8)
    for a in range(8):
        ang=math.pi/8+a*TAU/8
        m.block((math.cos(ang)*.258,-.125+math.sin(ang)*.258,.99),(.075,.085,.15),WOOD,.005,rot=ang)
    m.rings((0,-.125,1.055),[(.283,0),(.294,.055)],8,WOOD_LIGHT,angle=math.pi/8)
    roof(m,0,-.125,1.10,.367,.44)
    door(m,0,-.376,.075,.205,.40);stairs(m,0,-.455,.32)
    m.beam((-.17,-.435,.435),(0,-.435,.58),.043,WOOD_LIGHT,4)
    m.beam((0,-.435,.58),(.17,-.435,.435),.043,WOOD_LIGHT,4)
    m.block((0,-.436,.552),(.053,.063,.06),WOOD_LIGHT,.004)
    for xx in [-.142,.142]:m.box((xx,-.411,.272),(.055,.075,.34),WOOD)
    banner(m,0,-.382,.645,.165,.31)
    window(m,-.25,-.20,.69,.065,.16,rot=-math.pi/2);window(m,.25,-.15,.68,.065,.16,rot=math.pi/2)
    chimney(m,-.52,.23,.78,.40);chimney(m,.56,.29,.71,.27);chimney(m,-.64,-.12,.74,.24)
    for x in [-.66,-.31]:m.block((x,-.56,.214),(.057,.060,.428),WOOD,.004)
    porch=[(-.70,-.63,.457),(-.24,-.63,.457),(-.24,-.32,.566),(-.70,-.32,.566)]
    m.face(porch,MAIN)
    m.face([(x,y,z-.031) for x,y,z in reversed(porch)],SHADE)
    for j in range(4):
        a=porch[j];b=porch[(j+1)%4]
        m.face([(a[0],a[1],a[2]-.031),(b[0],b[1],b[2]-.031),b,a],MAIN)
    for x in [-.546,-.393]:m.beam((x,-.627,.459),(x,-.323,.566),.0018,SHADE,4)
    m.box((-.47,-.56,.420),(.445,.050,.066),WOOD_LIGHT,bottom=True)
    shutter(m,.45,-.222,.22,.16,.20);shutter(m,.45,.499,.23,.16,.20)
    for xx in [-.69,-.43,.31,.56]:m.block((xx,-.282,.062),(.125,.072,.125),STONE,.004)
    crate(m,-.45,-.56,0,.14);barrel(m,.36,-.395,0,.075,.19)
    flag(m,0,-.125,1.54,.30,.275)
    m.rings((0,-.125,1.825),[(.021,0),(.024,.027),(0,.038)],6,WOOD_LIGHT)
    m.transform(.235)
    return m

def city():
    m=Mesh('city')
    house(m,-.43,.21,.60,.78,.85,.31);house(m,.43,.23,.59,.79,.76,.30);house(m,0,.53,.56,.33,.65,.28)
    chimney(m,-.49,.42,1.04,.27);chimney(m,.51,.42,.94,.26)
    turret(m,0,.16,.255,1.36,.49,True);window(m,0,-.078,1.06,.06,.18)
    for x in [-.50,.50]:turret(m,x,-.35,.207,.68,.32)
    m.block((0,-.33,.34),(.69,.28,.68),STONE,.008);m.block((0,-.33,.66),(.71,.34,.09),MAIN,.007)
    for x in [-.30,-.10,.10,.30]:m.block((x,-.33,.755),(.10,.33,.13),MAIN,.006)
    door(m,0,-.481,.016,.265,.50)
    for x in [-.285,.285]:banner(m,x,-.487,.22,.13,.40,True)
    for x in [-.50,.50]:m.rings((x,-.35,.46),[(.21,0),(.21,.085)],8,MAIN,angle=math.pi/8,cap=False)
    window(m,-.735,.20,.37,rot=-math.pi/2);window(m,.733,.24,.33,rot=math.pi/2)
    stairs(m,0,-.53,.32,2)
    for side in [-1,1]:
        for y in [-.04,.47]:m.block((side*.70,y,.08),(.095,.115,.16),STONE_LIGHT,.006)
    m.transform(.30)
    return m

def metropolis():
    m=Mesh('metropolis')
    m.rings((0,0,0),[(.96,0),(.96,.035),(.92,.06)],8,STONE_DARK,angle=math.pi/8,aspect=(1,.90))
    house(m,-.43,.24,.58,.82,.96,.32);house(m,.43,.24,.57,.82,.89,.32);house(m,0,.51,.66,.49,1.15,.34)
    start_faces=len(m.f)
    turret(m,0,.14,.295,1.68,.47,True)
    for i in range(start_faces,len(m.f)):
        if m.slots[i]==1:m.slots[i]=3
    m.rings((0,.14,.94),[(.293,0),(.345,0),(.345,.085),(.293,.085)],8,MAIN,angle=math.pi/8,cap=False)
    for x in [-.585,.585]:
        turret(m,x,-.31,.205,.96,.33,True);turret(m,x,.46,.165,1.09,.29)
    m.block((0,-.35,.43),(.80,.40,.86),STONE,.008);m.block((0,-.35,.87),(.83,.44,.10),MAIN,.007)
    for x in [-.34,-.11,.11,.34]:m.block((x,-.35,.97),(.112,.44,.13),MAIN,.006)
    door(m,0,-.562,.09,.30,.55);stairs(m,0,-.61,.43,4)
    for side in [-1,1]:
        for i in range(3):
            h=.245-i*.057;m.block((side*.275,-.60-i*.08,h/2),(.13,.14,h),STONE_LIGHT,.008)
    banner(m,0,-.143,1.015,.205,.55,True,True)
    for side in [-1,1]:
        banner(m,side*.585,-.54,.32,.15,.52,True)
        x=side*.73;m.box((x,.13,.265),(.25,.52,.48),STONE);hip(m,x,.13,.50,.38,.63,.13)
        for y in [-.06,.26]:
            start=len(m.v);door(m,0,-.013,.06,.11,.24)
            m.transform(offset=(side*.862,y,0),rot=side*math.pi/2,start=start)
        for y in [-.17,.11,.43]:m.block((side*.868,y,.25),(.07,.07,.42),STONE_LIGHT,.004)
        for yy,hh in [(-.56,.43),(.64,.42)]:
            m.rings((side*.77,yy,0),[(.025,0),(.025,.08)],5,WOOD)
            m.rings((side*.77,yy,0),[(.078,.07),(.058,hh*.55),(0,hh)],6,['#3d6c37','#547b3d','#426e36'])
        crate(m,side*.64,-.69,0,.105);boulder(m,(side*.83,-.40,0),(.07,.055,.10),['#919382','#b5b4a3'],5)
        window(m,side*.72,.24,.69,rot=side*math.pi/2)
    m.transform(.30)
    return m

def road():
    m=Mesh('road');m.box((0,0,-.029),(.612,.117,.032),STONE_DARK,bottom=True)
    rng=random.Random(9)
    for row in [-1,0,1]:
        for i in range(8):m.block((-.269+i*.077,row*.036,-.001+rng.uniform(-.001,.001)),(.073,.050 if row==0 else .018,.032),MAIN if row==0 else [STONE,STONE_LIGHT,'#dfcba7'][i%3],.003)
    for x in [-.273,.273]:
        for y in [-.050,.050]:
            m.block((x,y,.006),(.060,.041,.082),STONE,.004);m.block((x,y,.052),(.066,.048,.018),MAIN,.003)
            m.rings((x,y,.061),[(.038,0),(0,.026)],4,MAIN,angle=math.pi/4,aspect=(1.20,.88))
    for y in [-.052,.052]:m.block((0,y,.032),(.505,.024,.040),MAIN,.003)
    for x in [-.087,0,.087]:
        for y in [-.052,.052]:m.block((x,y,-.003),(.081,.023,.047),STONE if x else STONE_LIGHT,.003)
    return m
