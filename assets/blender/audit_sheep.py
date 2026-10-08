from pathlib import Path
import sys,json
sys.path.insert(0,str(Path(__file__).resolve().parent))
from hf_imports import load
faces,lo,hi=load('hf_sheep')
v=set(p for pts,cols in faces for p in pts)
for sx in [-1,1]:
    for sy in [-1,1]:
        pts=[p for p in v if p[0]*sx>0 and p[1]*sy>0 and p[2]<-.45]
        print('FOOT',sx,sy,len(pts),'minZ',min(p[2] for p in pts),'bounds',[[min(p[k] for p in pts),max(p[k] for p in pts)] for k in range(3)])
