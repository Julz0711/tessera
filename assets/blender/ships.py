from meshkit import *

def hull(m,kind):
    outline=[(-.48,-.10),(-.32,-.19),(.22,-.19),(.43,-.11),(.56,0),(.43,.11),(.22,.19),(-.32,.19),(-.48,.10)]
    wood=['#5c3c25','#79502e','#926036'] if kind!='pirate' else ['#493326','#604532','#77533a']
    levels=[(.50,0),(.77,.07),(1,.18),(1,.22)]
    rings=[]
    for s,z in levels:rings.append([(x*s,y*s,z+(.035 if x<-.4 or x>.4 else 0)) for x,y in outline])
    for k in range(3):
        for j in range(len(outline)):
            c=wood[k%3]
            if k==2:c=MAIN if kind=='ship' else '#99463e' if kind=='pirate' else '#4b4740'
            m.face([rings[k][j],rings[k][(j+1)%9],rings[k+1][(j+1)%9],rings[k+1][j]],c)
    m.face(rings[0],wood[0],True)
    m.face(rings[2],WOOD)
    # Cap rail follows the hull rather than a rectangular box.
    for j in range(9):
        a,b=rings[-1][j],rings[-1][(j+1)%9]
        ai=(a[0]*.93,a[1]*.82,a[2]);bi=(b[0]*.93,b[1]*.82,b[2])
        m.face([a,b,bi,ai],WOOD_LIGHT)
        m.face([ai,bi,(bi[0],bi[1],bi[2]-.033),(ai[0],ai[1],ai[2]-.033)],WOOD_DARK)
    # Deliberately broad deck planks; no microtexture needed.
    for y in [-.11,-.055,0,.055,.11]:
        m.face([(-.33,y-.022,.183),(.30,y-.022,.183),(.30,y+.022,.183),(-.33,y+.022,.183)],WOOD_LIGHT if y==0 else '#986c3e')

def sail(m,kind):
    top=.85;bottom=.32;width=.38;cols=5;rows=3
    def point(col,row):
        v=row/rows;u=col/cols
        zz=bottom+(top-bottom)*v
        yy=(u-.5)*2*width*(1.05-.10*v)
        xx=.025+math.sin(v*math.pi)*.125
        if row==0:zz+=.022*math.sin(u*math.pi)
        return (xx,yy,zz)
    for i in range(cols):
        for j in range(rows):
            a,b,c,d=point(i,j),point(i+1,j),point(i+1,j+1),point(i,j+1)
            color=MAIN if kind=='ship' and i==2 else (['#9f382d','#f0dfc1'][i%2] if kind=='barbarian' else '#292b2c' if kind=='pirate' else WHITE)
            m.face([a,b,c],color);m.face([a,c,d],color)
            m.face([(p[0]-.003,p[1],p[2]) for p in [c,b,a]],color)
            m.face([(p[0]-.003,p[1],p[2]) for p in [d,c,a]],color)
    if kind=='pirate':
        # Low-poly skull emblem on both sides, conforming to the sail's three panels.
        shape=[(-.10,.06),(-.065,.11),(.065,.11),(.10,.06),(.09,-.03),(.055,-.05),(.04,-.115),(.02,-.06),(0,-.12),(-.025,-.06),(-.045,-.115),(-.06,-.05),(-.09,-.03)]
        # Place on the central planar panel (its X is constant at this resolution).
        for side in [1,-1]:
            xx=.025+math.sin(math.pi/3)*.125+( .0015 if side==1 else -.0045 )
            m.face([(xx,y,.59+z) for y,z in shape], '#d0c0a2',reverse=side==-1)
            for sign in [-1,1]:
                m.face([(xx+side*.0005,sign*.02,.60),(xx+side*.0005,sign*.067,.626),(xx+side*.0005,sign*.071,.582),(xx+side*.0005,sign*.040,.570)],'#252728',reverse=side==-1)

def ship(kind):
    m=Mesh(kind if kind=='ship' else kind+'_ship')
    hull(m,kind)
    sail(m,kind)
    mast=WOOD if kind=='ship' else WOOD_DARK
    m.beam((-.01,0,.18),(-.01,0,.995),.022,mast,6)
    m.beam((.026,-.43,.85),(.026,.43,.85),.021,WOOD_LIGHT,6)
    m.box((-.01,0,.205),(.090,.085,.048),WOOD_LIGHT)
    flag(m,-.012,0,.97,.16,.19,MAIN if kind=='ship' else '#26282a' if kind=='pirate' else '#a33e30')
    if kind=='ship':
        m.rings((-.01,0,1.13),[(.020,0),(.03,.02),(0,.049)],6,GOLD)
        # A broad player-colored transom and short raised stern rail.
        m.box((-.37,0,.244),(.18,.28,.035),MAIN)
        for y in [-.115,.115]:
            m.box((-.42,y,.30),(.034,.034,.13),WOOD)
            m.box((-.28,y,.30),(.034,.034,.13),WOOD)
            m.box((-.35,y,.37),(.21,.048,.04),WOOD_LIGHT)
        m.box((-.43,0,.37),(.040,.27,.04),WOOD_LIGHT)
        m.beam((-.02,0,.85),(-.29,.09,.25),.006,'#cbb58b',4)
        m.box((.48,0,.265),(.061,.075,.085),MAIN)
    elif kind=='pirate':
        m.box((-.34,0,.29),(.23,.28,.16),'#79563b')
        m.box((-.34,0,.389),(.28,.32,.047),'#8f4338')
        for side in [-1,1]:
            for x in [-.37,-.28]:
                start=len(m.v);m.plaque(0,0,0,.036,.055,DARK)
                m.transform(offset=(x,side*.142,.285),rot=math.pi if side==1 else 0,start=start)
        m.rings((-.01,0,.92),[(.047,0),(.070,.080)],6,WOOD)
        m.beam((-.41,0,.40),(-.58,0,.45),.013,WOOD_LIGHT)
        m.box((-.58,0,.365),(.047,.045,.068),'#ffc85b')
        m.box((-.58,0,.407),(.062,.058,.018),DARK)
        m.box((-.58,0,.321),(.060,.058,.016),DARK)
        for side in [-1,1]:
            for x in [-.18,.02,.22]:
                start=len(m.v);m.plaque(0,0,0,.064,.065,'#96866e');m.plaque(0,-.001,.012,.04,.04,DARK)
                m.transform(offset=(x,side*.191,.092),rot=math.pi if side==1 else 0,start=start)
                # Conform painted gunports to the tapered hull instead of floating beside it.
                for vi in range(start,len(m.v)):
                    xx,yy,zz=m.v[vi]
                    hull_y=side*.19*(.77+(zz-.07)/.11*.23)
                    m.v[vi]=(xx,hull_y+(yy-side*.191)+side*.001,zz)
        # Angular iron bowsprit.
        m.poly([(.44,-.038,.22),(.44,.038,.22),(.47,0,.29),(.72,0,.26)],[(0,1,2),(0,3,1),(1,3,2),(2,3,0)],'#50535a')
    else:
        for x in [-.32,0,.29]:
            for sign in [-1,1]:
                m.box((x,sign*.182,.20),(.038,.020,.16),'#444546')
                # Raised diamond rivets, readable from the board camera.
                yy=sign*.195
                m.face([(x-.025,yy,.20),(x,yy,.23),(x+.025,yy,.20),(x,yy,.175)],'#8b8b88',reverse=sign==1)
        for x in [-.43,-.27]:
            for y in [-.14,.14]:m.box((x,y,.30),(.039,.039,.12),WOOD_DARK)
        m.box((-.35,-.15,.28),(.23,.035,.04),WOOD_LIGHT)
        m.box((-.35,.15,.28),(.23,.035,.04),WOOD_LIGHT)
        m.poly([(.44,-.060,.23),(.44,.060,.23),(.48,0,.34),(.72,0,.28)],[(0,1,2),(0,3,1),(1,3,2),(2,3,0)],'#484b4d')
    m.transform(.41 if kind=='ship' else .38,rot=-math.pi/2 if kind=='barbarian' else 0)
    return m

from navy_v2 import ship
