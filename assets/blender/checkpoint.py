"""Repeatable adversarial review views, with actual geometry and independently tintable materials."""
import math,json,shutil
from pathlib import Path
import bpy
import review_assets as r

def views():
    r.buildings();r.navy();r.tiles();r.board()

def overhead():
    s=r.setup()
    for i,name in enumerate(['settlement','city','metropolis','road','ship','pirate_ship','barbarian_ship']):
        r.asset(s,name,((i%4)*1.35-2,(i//4)*1.4,0),1.8)
    r.camera(s,(0,.55,0),(0,.55,10),5.7,1600,1000);r.render(s,'pieces-overhead')
    s=r.setup()
    for i,name in enumerate(['forest','pasture','fields','hills','mountains','desert','gold']):r.asset(s,'hex_'+name,((i%4)*2.1-3.15,(i//4)*2.15,0))
    r.camera(s,(0,1.05,0),(0,1.05,10),8.7,1800,1050);r.render(s,'terrain-overhead')

def commodities():
    s=r.setup()
    for x,commodity in [(-1.55,'#28753d'),(0,'#a5afb9'),(1.55,'#a3d467')]:r.asset(s,'metropolis',(x,0,0),2.1,color=('#d9483b','#8f2a22'),commodity=commodity)
    r.camera(s,(0,0,.70),(2,-9,5),5.3,1800,1000);r.render(s,'metropolis-commodities')
    r.camera(s,(0,0,0),(0,0,10),5.3,1800,800);r.render(s,'metropolis-commodities-top')

def save_checkpoint(number):
    path=r.HERE/'reviews'/('checkpoint-%02d'%number);path.mkdir(parents=True,exist_ok=True)
    models=path/'models';models.mkdir(exist_ok=True)
    for p in (r.ROOT/'public/models/tessera').glob('*.glb'):shutil.copy2(p,models/p.name)
    names=['settlement','city','metropolis','road','ship','pirate_ship','barbarian_ship','hex_forest','hex_pasture','hex_fields','hex_hills','hex_mountains','hex_desert','hex_gold','buildings','ships','terrain','board-context','pieces-overhead','terrain-overhead','metropolis-commodities','metropolis-commodities-top']
    for name in names:
        p=r.OUT/(name+'.png')
        if p.exists():shutil.copy2(p,path/p.name)
    for name in ['settlement','city','metropolis','ship','pirate_ship','barbarian_ship','hex_gold','hex_mountains']:
        for angle in ['back','top']:
            p=r.OUT/(name+'-'+angle+'.png')
            if p.exists():shutil.copy2(p,path/p.name)
    for p in [r.HERE/'validation.json',r.HERE/'roundtrip-validation.json',r.ROOT/'public/models/tessera/manifest.json']:
        if p.exists():shutil.copy2(p,path/p.name)
    print('CHECKPOINT',str(path))
