#!/usr/bin/env python3
# verify_visual.py - visual gate: compare /tmp/verify captures to golden/, ASCII on any diff.
# Usage: python3 verify_visual.py [--bless]
import sys, os, json
from PIL import Image
import numpy as np
BLESS='--bless' in sys.argv
OUT='/tmp/verify'; GOLD='golden'
ramp=' .:-=+*#%@'
def gray(p, size=(48,30)):
    return np.array(Image.open(p).convert('L').resize(size)).astype(int)
def ascii_of(a):
    return [''.join(ramp[min(9,(255-v)*10//256)] for v in row) for row in a]
rep=json.load(open(OUT+'/report.json'))
fails=list(rep.get('fails',[]))
vis_fails=[]
for f in sorted(os.listdir(OUT)):
    if not f.endswith('.png'): continue
    cur=gray(OUT+'/'+f)
    gp=GOLD+'/'+f
    if not os.path.exists(gp):
        if BLESS:
            Image.open(OUT+'/'+f).save(gp); print('BLESSED (new golden):', f)
        else:
            print('NO GOLDEN:', f, '- run --bless after review')
            for line in ascii_of(cur): print('   ',line)
        continue
    g=gray(gp)
    mad=float(np.abs(cur-g).mean())
    if mad>9.0:
        vis_fails.append(f+f' mad={mad:.1f}')
        print(f'VISUAL DIFF {f}  mad={mad:.1f}  (current | golden)')
        ca, ga = ascii_of(cur), ascii_of(g)
        for l1,l2 in zip(ca,ga): print('  '+l1+'  |  '+l2)
        if BLESS:
            Image.open(OUT+'/'+f).save(gp); print('  -> BLESSED as new golden')
    elif mad>0.05:
        # sub-threshold drift: PASSES the gate, but --bless must still adopt it after the
        # operator's side-by-side review - otherwise goldens rot quietly below the 9.0 bar
        # and stop representing reviewed truth (caught build 55: quadrant_rear34 rode 8.9).
        if BLESS:
            Image.open(OUT+'/'+f).save(gp); print(f'ok {f}  mad={mad:.1f}  -> BLESSED (drift adopted)')
        else:
            print(f'ok {f}  mad={mad:.1f}  (sub-threshold drift - bless after review)')
    else:
        print(f'ok {f}  mad={mad:.1f}')
if BLESS: vis_fails=[]
allf=fails+vis_fails
print('='*60)
print('VERIFY: '+('PASS' if not allf else 'FAIL\n  '+'\n  '.join(allf)))
sys.exit(0 if not allf else 1)
