# Build docs/previews/remotion-overview.jpg in the same layout as all-effects.jpg (1800x2400, gold title, tile grid).
import subprocess, os
from PIL import Image, ImageDraw, ImageFont
os.makedirs('out/big', exist_ok=True)
marks=[l.split() for l in open('out/marks.txt') if l.strip()]
W,H,COLS,PAD,G,TOP=1800,2400,7,24,12,250
tw=(W-2*PAD-(COLS-1)*G)//COLS; th=int(tw*16/9)
im=Image.new('RGB',(W,H),(10,9,14)); d=ImageDraw.Draw(im)
fp=[p for p in ['/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc','/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'] if os.path.exists(p)][0]
title=f'{len(marks)}个Remotion动效 一张看完'; f=ImageFont.truetype(fp,96)
d.text((W/2,TOP/2),title,font=f,fill=(242,196,109),anchor='mm')
fs=ImageFont.truetype(fp.replace('Serif','Sans'),26)
rows=(len(marks)+COLS-1)//COLS
for i,(cid,ts) in enumerate(marks):
    p=f'out/big/{i:02d}.jpg'; subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',ts,'-i','out/gallery.mp4','-frames:v','1',p],check=True)
    t=Image.open(p); w,h=t.size; t=t.resize((tw,th))
    r,c=divmod(i,COLS); n=min(COLS,len(marks)-r*COLS); x0=(W-(n*tw+(n-1)*G))//2
    x=x0+c*(tw+G); y=TOP+r*(th+G+40); im.paste(t,(x,y))
    d.text((x+tw/2,y+th+20),f'{i+1:02d} {cid}',font=fs,fill=(200,186,160),anchor='mm')
im=im.crop((0,0,W,min(H,TOP+rows*(th+G+40)+30)));im.save('../docs/previews/remotion-overview.jpg',quality=88); print(tw,th,TOP+rows*(th+G+40))
