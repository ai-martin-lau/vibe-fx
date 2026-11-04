# Xiaohongshu image post: 3:4 pages (1242x1656), each effect as a 3-frame strip + Chinese name.
import subprocess, os
from PIL import Image, ImageDraw, ImageFont
ZH={'Iris':'圆孔揭示','Whip':'甩镜','Slam':'砸字','Scramble':'乱码解码','SplitFlap':'机场翻牌','Highlight':'荧光笔重点','Typewriter':'打字机引用','WordLight':'逐词点亮','Odometer':'里程表滚轮','CompoundCurve':'复利曲线','Timeline':'时间轴','ShareRing':'占比圆环','Balance':'天平取舍','RackFocus':'焦点转移','DollyZoom':'推拉变焦','KenBurns':'照片推镜','EraMorph':'跨时代扫描','Lens':'放大镜细看','Spotlight':'探照灯寻物','ParticleWord':'粒子聚字','TreeGrow':'知识树生长','DecisionPath':'决策路径','ContrastPair':'数字对比','ChapterCard':'章节卡','Annotate':'圈注','LightSweep':'扫光字','SourceCard':'出处卡'}
NEW={'ContrastPair','ChapterCard','Annotate','LightSweep','SourceCard'}
src=open('src/Root.tsx').read(); import re
demos=[(m[0],int(m[1])) for m in re.findall(r"\['(\w+)', '[^']*', \(\) => .*?, (\d+)\],",src)]
W,H=1242,1656; HEAD=200; COLS=2; ROWS=4; FW=152; FH=int(FW*16/9); G=6; LAB=62
CW=3*FW+2*G; MX=(W-COLS*CW)//(COLS+1); RH=(H-HEAD-40)//ROWS
bold='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'; serif='/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc'
if not os.path.exists(serif): serif=bold
os.makedirs('out/strip',exist_ok=True); t0=0; cells=[]
for i,(cid,d) in enumerate(demos):
    fr=[]
    for j,q in enumerate((.15,.5,.88)):
        p=f'out/strip/{i:02d}-{j}.jpg'; subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',f'{(t0+d*q)/30:.2f}','-i','out/gallery.mp4','-frames:v','1',p],check=True); fr.append(p)
    cells.append((cid,fr)); t0+=d
per=7; pages=[cells[k:k+per] for k in range(0,len(cells),per)]
os.makedirs('../docs/previews/xhs',exist_ok=True)
for pi,pg in enumerate(pages):
    im=Image.new('RGB',(W,H),(10,9,14)); dr=ImageDraw.Draw(im)
    dr.text((W/2,92),f'{len(cells)}个电影感动效' if pi==0 else '电影感动效',font=ImageFont.truetype(serif,84),fill=(242,196,109),anchor='mm')
    dr.text((W/2,168),f'Remotion重做 · 第{pi+1}/{len(pages)}页 · 每条3帧看动作',font=ImageFont.truetype(bold,32),fill=(200,186,160),anchor='mm')
    for k,(cid,fr) in enumerate(pg):
        n=pi*per+k; r,c=divmod(k,COLS); x=MX+c*(CW+MX); y=HEAD+20+r*RH
        for j,p in enumerate(fr):
            t=Image.open(p).resize((FW,FH)); im.paste(t,(x+j*(FW+G),y))
            if j<2: dr.polygon([(x+(j+1)*(FW+G)-G+0,y+FH//2-8),(x+(j+1)*(FW+G)-G+0,y+FH//2+8),(x+(j+1)*(FW+G)-G+6,y+FH//2)],fill=(242,166,64))
        lab=f'{n+1:02d} {ZH[cid]}'; dr.text((x,y+FH+12),lab,font=ImageFont.truetype(bold,36),fill=(246,234,214))
        if cid in NEW: dr.text((x+CW,y+FH+16),'新',font=ImageFont.truetype(bold,30),fill=(242,166,64),anchor='ra')
        dr.text((x+CW-(48 if cid in NEW else 0),y+FH+20),cid,font=ImageFont.truetype(bold,24),fill=(150,138,120),anchor='ra')
    if len(pg)%2: dr.text((MX+CW+MX+CW/2,HEAD+20+(len(pg)//2)*RH+FH/2),'github.com/ai-martin-lau/vibe-fx',font=ImageFont.truetype(bold,28),fill=(150,138,120),anchor='mm')
    im.save(f'../docs/previews/xhs/{pi+1}.jpg',quality=90)
print(len(pages),FH,RH)
