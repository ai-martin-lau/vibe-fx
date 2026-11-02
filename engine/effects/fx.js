// fx.js — vibe-video effect library (self-written, same terms as this repo). 3D parts use three.js (MIT, © 2010-2024 three.js authors) via three3d.js.
// Load after vibe.js + anim.js (+ vendor/three.bundle.js + three3d.js for 3D effects).
// Each effect: FX(id,{zh,en,cat,beat,cost,img:[files],draw(lt,D,t)}) — lt = seconds into the clip, D = clip length.
// In a film:  FXI('img/') once at top level (preloads the images the effects need), then in a scene  draw(t,lt){ FXR.k_slam.draw(lt,2.5,t) }.
// Params: every effect reads optional FXP[id] = {...} (text, numbers, colours) so a film can restyle without editing this file.
const FXR={},FXL=[],FXIMG={},FXP={};
function FX(id,o){o.id=id;FXR[id]=o;FXL.push(o)}
function FXI(dir){const need=new Set();FXL.forEach(f=>(f.img||[]).forEach(n=>need.add(n)));need.forEach(n=>FXIMG[n]=STICKER(dir+n))}
const IM=n=>{const i=FXIMG[n];return i&&i.naturalWidth?i:null};
const P=(id,k,d)=>(FXP[id]&&FXP[id][k]!=null)?FXP[id][k]:d;
const K=(lt,a,b)=>A_clamp((lt-a)/(b-a));
function lazy3D(cfg){let s=null;return{draw(t,lt){if(!s)s=VIBE3D(cfg);s.draw(t,lt)}}}
function cover(im,x,y,w,h,s=1){if(!im)return;const r=Math.max(w/im.naturalWidth,h/im.naturalHeight)*s;const iw=im.naturalWidth*r,ih=im.naturalHeight*r;g.drawImage(im,x+(w-iw)/2,y+(h-ih)/2,iw,ih)}
function panel(col,txtS,o={}){g.fillStyle=col;g.fillRect(0,0,W,H);if(txtS)onDark(()=>txt(txtS,CX,o.y||1000,{size:o.size||130,color:o.color||'#fff',gold:o.gold,glow:o.glow}))}
function texOf(T,im){const tx=new T.Texture(im);tx.colorSpace=T.SRGBColorSpace;return tx}
function texUp(tx,im){if(!tx._ok&&im&&im.complete&&im.naturalWidth){tx.image=im;tx.needsUpdate=true;tx._ok=1}}
let _KEY={};function keyed(n){if(_KEY[n])return _KEY[n];const im=IM(n);if(!im)return null;const o=document.createElement('canvas');o.width=im.naturalWidth;o.height=im.naturalHeight;const og=o.getContext('2d');og.drawImage(im,0,0);
 const d=og.getImageData(0,0,o.width,o.height);for(let i=0;i<d.data.length;i+=4){const r=d.data[i],gg=d.data[i+1],b=d.data[i+2];if(gg>100&&gg>r*1.4&&gg>b*1.4)d.data[i+3]=0}og.putImageData(d,0,0);return _KEY[n]=o}
const GOLD='#f2c46d',INK='#16110c',CREAM='#f3ead8';
// Fixed dark panels/plates keep the gold look on light palettes (gold text on a hard-coded dark panel would go dark-on-dark).
function onDark(fn){if(!THEME.light)return fn();const T0=THEME;THEME=THEMES.gold;try{return fn()}finally{THEME=T0}}
// Foreground ink for strokes/shapes drawn straight on the palette background.
const FG=(a=1)=>THEME.light?`rgba(42,31,20,${a})`:`rgba(236,234,240,${a})`;
// Draw without logging text to the layout checker (half-hidden text inside a transition, off-screen whip frames).
function quiet(fn){const L=TXLOG;TXLOG=null;try{fn()}finally{TXLOG=L}}

// ───────────── T 转场 Transitions ─────────────
FX('t_iris',{zh:'圆孔揭示',en:'Iris reveal',cat:'T',beat:'揭示答案 / reveal',cost:1,draw(lt){const r=eio(K(lt,.6,1.4))*1300;(r>200?quiet:f=>f())(()=>panel('#1d2a44',P('t_iris','a','以前')));
 g.save();g.beginPath();g.arc(CX,960,r,0,7);g.clip();(r<400?quiet:f=>f())(()=>panel('#c9962e',P('t_iris','b','现在'),{color:INK}));g.restore();g.strokeStyle=GOLD;g.lineWidth=10;g.beginPath();g.arc(CX,960,r,0,7);g.stroke()}});
FX('t_coinWipe',{zh:'硬币擦除',en:'Object-shape wipe',cat:'T',beat:'钱相关话题切镜',cost:1,draw(lt){const k=eio(K(lt,.5,1.6)),x=lerp(-300,CX,k),r=lerp(140,1500,K(lt,1,1.9)**2);(r>300?quiet:f=>f())(()=>panel('#202020','一枚硬币'));
 g.save();g.beginPath();g.arc(x,960,r,0,7);g.clip();(r<500?quiet:f=>f())(()=>panel('#6b4a12','一座金库',{gold:true,glow:18}));g.restore();g.strokeStyle=GOLD;g.lineWidth=14;g.beginPath();g.arc(x,960,r,0,7);g.stroke()}});
FX('t_zoomThrough',{zh:'穿字推进',en:'Zoom through a letter',cat:'T',beat:'从标题进正文 / hook→body',cost:1,draw(lt){const k=K(lt,.4,1.6),s=1+Math.pow(k,3)*40;panel('#0e0e12');
 if(k>.55)panel('#efe4cc','里面是什么',{color:INK});g.save();g.translate(CX,980);g.scale(s,s);(s>2?quiet:f=>f())(()=>onDark(()=>txt('O',0,110,{size:340,gold:true,glow:30})));g.restore();if(k>.55){g.save();g.globalAlpha=1-K(lt,1.1,1.6);g.fillStyle='#000';g.fillRect(0,0,W,H);g.restore()}}});
FX('t_whip',{zh:'甩镜',en:'Whip pan',cat:'T',beat:'对比 A/B、转折',cost:1,draw(lt){const k=eio(K(lt,.8,1.2));g.save();g.translate(-k*W,0);(k>.02?quiet:f=>f())(()=>panel('#33201a','穷爸爸'));g.translate(W,0);(k<.98?quiet:f=>f())(()=>panel('#14304a','富爸爸'));g.restore();
 const v=Math.sin(Math.PI*k);if(v>.05){g.save();g.globalAlpha=v*.8;for(let i=0;i<40;i++){g.fillStyle=i%2?'#fff3':'#0004';g.fillRect(0,i*48,W,8+v*30)}g.restore()}}});
FX('t_pageTurn',{zh:'翻页',en:'Page turn',cat:'T',beat:'讲故事换年代 / chapter',cost:2,img:['paper.jpg'],draw(lt){cover(IM('paper.jpg'),0,0,W,H);const k=eio(K(lt,.4,1.6));(k<.5?quiet:f=>f())(()=>txt('第二章',CX,1000,{size:120,color:INK}));
if(k<1){const w=W*(1-k);g.save();g.beginPath();g.rect(0,0,w,H);g.clip();cover(IM('paper.jpg'),0,0,W,H);(k>=.5?quiet:f=>f())(()=>txt('第一章',CX,1000,{size:120,color:INK}));g.restore();
 const gr=g.createLinearGradient(w-80,0,w+60,0);gr.addColorStop(0,'#0000');gr.addColorStop(.6,'#0006');gr.addColorStop(1,'#0000');g.fillStyle=gr;g.fillRect(w-80,0,140,H)}}});
FX('t_ink',{zh:'墨迹晕开',en:'Ink bleed reveal',cat:'T',beat:'情绪转折、开悟',cost:2,img:['ink.jpg','paper.jpg'],draw(lt){cover(IM('paper.jpg'),0,0,W,H);const im=IM('ink.jpg');if(!im)return;const s=lerp(.2,3.2,eo(K(lt,.2,1.8)));
 g.save();g.globalCompositeOperation='multiply';g.translate(CX,960);g.rotate(lt*.2);g.drawImage(im,-540*s,-540*s,1080*s,1080*s);g.restore();if(lt>1.2)rise('慢慢渗进去',CX,1650,lt,1.2,{size:80,color:'#fff'})}});
FX('t_shatter',{zh:'玻璃碎裂',en:'Shatter cut',cat:'T',beat:'打破认知 / myth busted',cost:2,draw(lt){const R=mulberry32(3),k=K(lt,.8,2);if(lt<.8)return panel('#d9d0bf','你以为',{color:INK});g.fillStyle='#0b0b0f';g.fillRect(0,0,W,H);
 for(let i=0;i<60;i++){const x=R()*W,y=R()*H,s=60+R()*120,vx=(x-CX)*(1+R()),vy=(y-960)*(1+R())+k*900;g.save();g.translate(x+vx*k,y+vy*k);g.rotate(k*(R()-.5)*8);g.globalAlpha=1-k;
 g.beginPath();g.moveTo(-s/2,-s/2);g.lineTo(s/2,-s/3);g.lineTo(0,s/2);g.closePath();g.clip();g.translate(-x,-y);const L=TXLOG;TXLOG=null;panel('#d9d0bf','你以为',{color:INK});TXLOG=L;g.restore()}
 onDark(()=>txt('其实',CX,1000,{size:130,gold:true,glow:18}))}});
FX('t_blinds',{zh:'百叶窗',en:'Venetian blinds',cat:'T',beat:'列清单换项',cost:1,draw(lt){const m=K(lt,.5,1.55)>.5;(m?quiet:f=>f())(()=>panel('#3b1f1f','花掉'));for(let i=0;i<12;i++){const k=eio(K(lt,.5+i*.05,1+i*.05));g.save();g.beginPath();g.rect(0,i*160,W,160*k);g.clip();(m?f=>f():quiet)(()=>panel('#123826','存下',{gold:true,glow:18}));g.restore()}}});
FX('t_carry',{zh:'物体带走',en:'Object-carried cut',cat:'T',beat:'镜头间连续感',cost:1,img:['watch.jpg'],draw(lt){const k=eio(K(lt,.4,1.8)),x=lerp(-300,W+300,k);(x>CX?quiet:f=>f())(()=>panel('#151a22','早上'));
 g.save();g.beginPath();g.rect(0,0,x,H);g.clip();(x>CX?f=>f():quiet)(()=>panel('#2a1a10','晚上',{gold:true,glow:18}));g.restore();const im=IM('watch.jpg');if(im){g.save();g.translate(x,960);g.rotate(k*6);g.drawImage(im,-260,-260,520,520);g.restore()}}});
FX('t_glitch',{zh:'故障切',en:'Glitch cut',cat:'T',beat:'反转、打脸',cost:1,params:'s, s2 (after glitch)',draw(lt,D,t){const on=lt>1&&lt<1.35;panel(lt<1.2?'#111':'#300',lt<1.2?P('t_glitch','s','真相'):P('t_glitch','s2',P('t_glitch','s','真相')),{size:160,gold:lt>=1.2,glow:lt>=1.2?24:0});if(on){const R=mulberry32(Math.floor(lt*30));
 for(let i=0;i<14;i++){const y=R()*H,h=20+R()*80;g.drawImage(c,0,y,W,h,(R()-.5)*160,y,W,h)}g.save();g.globalCompositeOperation='lighter';g.fillStyle='#f003';g.fillRect(8,0,W,H);g.fillStyle='#0ff3';g.fillRect(-8,0,W,H);g.restore()}}});

// ───────────── K 动态字 Kinetic text ─────────────
FX('k_slam',{zh:'砸字',en:'Slam text',cat:'K',beat:'第1秒钩子 / hook',cost:1,draw(lt){const k=K(lt,0,.14),s=lerp(4,1,eo(k));const sh=lt<.42?(1-K(lt,.14,.42))*24:0;
 g.save();g.translate(CX+Math.sin(lt*90)*sh,960+Math.cos(lt*70)*sh);g.scale(s,s);txt(P('k_slam','s','别存钱'),0,60,{size:220,gold:true,glow:40});g.restore();if(lt>.14&&lt<.29){g.fillStyle=`rgba(${THEME.flash},${.5*(1-K(lt,.14,.29))})`;g.fillRect(0,0,W,H)}}});
FX('k_scramble',{zh:'乱码解码',en:'Scramble decode',cat:'K',beat:'揭示秘密 / reveal',cost:1,draw(lt){const s=P('k_scramble','s','复利是第八大奇迹'),pool='¥$%#@&01789ABXYZ';let o='';const R=mulberry32(Math.floor(lt*20));
 [...s].forEach((ch,i)=>{o+=lt>.4+i*.12?ch:pool[Math.floor(R()*pool.length)]});txt(o,CX,980,{size:96,color:THEME.light?'#1d6b3a':'#9fe8b0',glow:20})}});
FX('k_splitFlap',{zh:'机场翻牌',en:'Split-flap board',cat:'K',beat:'年份/地点/数字揭示',cost:2,draw(lt){const s=P('k_splitFlap','s','1929年'),n=[...s].length,w=150;[...s].forEach((ch,i)=>{const x=CX+(i-(n-1)/2)*(w+14),done=lt>.5+i*.25;
 const flip=(lt*12)%1;g.fillStyle=THEME.flapBg;g.fillRect(x-w/2,840,w,220);g.fillStyle=THEME.flapLine;g.fillRect(x-w/2,948,w,4);
 const shown=done?ch:'0123456789'[Math.floor(lt*12+i)%10];g.save();if(!done){g.translate(x,950);g.scale(1,Math.abs(Math.cos(flip*Math.PI)));g.translate(-x,-950)}txt(shown,x,1000,{size:150,color:THEME.flapText});g.restore()})}});
FX('k_stamp',{zh:'盖章',en:'Rubber stamp',cat:'K',beat:'下结论、定性',cost:1,params:'s, sub, bg, y, at',img:['paper.jpg'],draw(lt){if(P('k_stamp','bg',true))cover(IM('paper.jpg'),0,0,W,H);const sub=P('k_stamp','sub',''),y=P('k_stamp','y',1050),at=P('k_stamp','at',.6);if(sub)txt(sub,CX,y-350,{size:60,color:'#5a4a38'});if(lt<at)return;const k=K(lt,at,at+.15),s=lerp(2.4,1,eo(k));
 g.save();g.translate(CX,y);g.rotate(-.18);g.scale(s,s);g.globalAlpha=lerp(.2,.85,k);g.strokeStyle='#b3261e';g.lineWidth=14;g.strokeRect(-300,-110,600,220);txt(P('k_stamp','s','陷阱'),0,60,{size:150,color:'#b3261e'});g.restore()}});
FX('k_highlight',{zh:'荧光笔划重点',en:'Highlighter sweep',cat:'K',beat:'金句关键词',cost:1,draw(lt){const a='真正的风险是',b='你不知道自己在做什么';txt(a,CX,900,{size:80});const w=measure(b,80)+40,k=eo(K(lt,.5,1));
 g.fillStyle='rgba(255,214,90,.85)';g.fillRect(CX-w/2,990,w*k,90);txt(b,CX,1065,{size:80,color:k>.5?INK:'#fff'})}});
FX('k_textPath',{zh:'文字绕圈',en:'Text on a path',cat:'K',beat:'循环、周期话题',cost:1,draw(lt){const s='越赚越想花越花越想赚',ch=[...s];g.save();g.translate(CX,960);g.rotate(lt*.9);
 ch.forEach((c2,i)=>{const a=i/ch.length*6.283;g.save();g.rotate(a);g.translate(0,-360);txt(c2,0,30,{size:80,gold:true});g.restore()});g.restore();rise('循环',CX,1000,lt,.3,{size:120})}});
FX('k_charDrop',{zh:'字掉落弹跳',en:'Physics letters',cat:'K',beat:'轻松吐槽',cost:1,draw(lt){const s='钱包空了',ch=[...s];ch.forEach((c2,i)=>{const t0=i*.14,u=Math.max(0,lt-t0);let y=520+2600*u*u;let b=1060;
 if(y>b){const tt=u-Math.sqrt(540/2600);y=b-Math.abs(Math.sin(tt*9))*260*Math.exp(-tt*4)}txt(c2,CX+(i-1.5)*190,y,{size:170,gold:i===3})})}});
FX('k_type',{zh:'打字机',en:'Typewriter',cat:'K',beat:'引用一句原话（有出处）',cost:1,params:'s, size, w, y, src',img:['paper.jpg'],draw(lt){cover(IM('paper.jpg'),0,0,W,H);const s=P('k_type','s','Stay hungry, stay foolish.'),n=Math.max(1,Math.floor(K(lt,.05,1.6)*s.length));
 const fs=P('k_type','size',66),mw=P('k_type','w',840),lines=[];let cur='';for(const ch of s.slice(0,n)){if(ch==='\n'||measure(cur+ch,fs)>mw){lines.push(cur);cur=ch==='\n'?'':ch}else cur+=ch}lines.push(cur);const y0=P('k_type','y',980)-(lines.length-1)*fs*.75;const typing=n<s.length;lines.forEach((l,i)=>{const f=()=>txt(l+(typing&&i===lines.length-1&&Math.floor(lt*4)%2?'|':''),120,y0+i*fs*1.5,{size:fs,color:INK,align:'left'});typing?quiet(f):f()});const src=P('k_type','src','');if(src)rise(src,120+mw/2,y0+lines.length*fs*1.5+30,lt,1.7,{size:38,color:'rgba(22,17,12,.6)'})}});
FX('k_stretch',{zh:'弹性拉伸字',en:'Elastic stretch',cat:'K',beat:'强调"越来越"',cost:1,draw(lt){const k=lt<.8?eo(K(lt,0,.8))*2.6:1+1.6*Math.exp(-(lt-.8)*5)*Math.cos((lt-.8)*18);g.save();g.translate(CX,960);g.scale(1/Math.sqrt(Math.max(.4,k)),k);txt('长',0,80,{size:260,gold:true});g.restore();rise('期',CX,1500,lt,1,{size:120})}});
FX('k_stack',{zh:'词语堆叠',en:'Word stack',cat:'K',beat:'列举三件事',cost:1,draw(lt){['房贷','车贷','花呗','信用卡'].forEach((w,i)=>{const t0=i*.4;if(lt<t0)return;const k=eo(K(lt,t0,t0+.15));
 g.save();g.translate(CX,1300-i*190);g.rotate((i%2?.05:-.05)*k);g.scale(lerp(1.6,1,k),lerp(1.6,1,k));g.fillStyle=['#b3261e','#b8601a','#3a6ea5','#444'][i];g.fillRect(-260,-80,520,160);txt(w,0,35,{size:100,color:'#fff'});g.restore()})}});
FX('k_counterWords',{zh:'逐词点亮',en:'Karaoke word light',cat:'K',beat:'朗读金句跟读',cost:1,draw(lt){const ws=['先','活下来','再','谈','赚钱'];let x=CX-380;ws.forEach((w,i)=>{const on=lt>.3+i*.3;const ww=measure(w,90);txt(w,x+ww/2,980,{size:90,gold:on,a:on?1:.3});x+=ww+30})}});

// ───────────── N 数字 Numbers ─────────────
FX('n_counter',{zh:'数字飞涨',en:'Counter roll-up',cat:'N',beat:'数字钩子 / number hook',cost:1,params:'v, pre, suf, label, y, size',draw(lt){const v=P('n_counter','v',1000000)*eo(K(lt,.2,1.6)),y=P('n_counter','y',960),sz=P('n_counter','size',150),lab=P('n_counter','label','');const s=lt>1.6?1+.15*Math.exp(-(lt-1.6)*8):1;g.save();g.translate(CX,y);g.scale(s,s);txt(P('n_counter','pre','')+fmt(v)+P('n_counter','suf',''),0,sz*.4,{size:sz,gold:true,glow:30});g.restore();if(lab)rise(lab,CX,y+220,lt,1.6,{size:50,a:.75})}});
FX('n_odometer',{zh:'里程表滚轮',en:'Odometer',cat:'N',beat:'年份/次数增长',cost:2,draw(lt){const v=lerp(1965,2025,eio(K(lt,.2,2)));const d=String(Math.floor(v)).padStart(4,'0');for(let i=0;i<4;i++){const x=CX+(i-1.5)*170;
 const place=Math.pow(10,3-i),f=(v/place)%10,frac=i===3?v%1:0;g.save();g.beginPath();g.rect(x-75,860,150,200);g.clip();g.fillStyle='#111';g.fillRect(x-75,860,150,200);
 const base=Math.floor(f);for(let j=-1;j<=1;j++){const y=1010-(j-frac)*200;(Math.abs(y-1010)<100?f=>f():quiet)(()=>txt(String((base+j+10)%10),x,y,{size:150,color:'#f4f0e6'}))}g.restore()}}});
FX('n_bars',{zh:'柱子生长',en:'Bar grow',cat:'N',beat:'比较几组数据',cost:1,draw(lt){chartGrow([2,3.5,5,8,13],lt,.04,{x:150,y:1450,w:780,h:700,labels:['1','2','3','4','5'],fmt:v=>v.toFixed(0)})}});
FX('n_coinStack',{zh:'硬币越堆越高',en:'Coin stack',cat:'N',beat:'积累、复利',cost:1,draw(lt){for(let c2=0;c2<5;c2++){const n=Math.floor(K(lt,.1+c2*.15,1.8)*(4+c2*5));for(let i=0;i<n;i++){const x=200+c2*170,y=1500-i*26;
 g.fillStyle='#8a6420';g.beginPath();g.ellipse(x,y+8,70,20,0,0,7);g.fill();g.fillStyle=GOLD;g.beginPath();g.ellipse(x,y,70,20,0,0,7);g.fill()}}}});
FX('n_compound',{zh:'复利曲线骑行',en:'Compound curve ride',cat:'N',beat:'"后面越来越快"',cost:1,draw(lt){const k=K(lt,.1,2),f=x=>Math.pow(1.1,x*40)/45;g.strokeStyle=THEME.light?THEME.lo:GOLD;g.lineWidth=10;g.beginPath();for(let i=0;i<=100*k;i++){const x=i/100;g.lineTo(140+x*800,1500-f(x)*900)}g.stroke();
 const x=k;g.fillStyle=THEME.light?THEME.hi:'#fff';g.beginPath();g.arc(140+x*800,1500-f(x)*900,22,0,7);g.fill();g.strokeStyle=FG(.3);g.lineWidth=3;g.beginPath();g.moveTo(140,1500);g.lineTo(940,1500);g.stroke()}});
FX('n_timeline',{zh:'时间轴拖动',en:'Timeline scrub',cat:'N',beat:'人物生平节点',cost:1,draw(lt){const off=lerp(0,-1600,eio(K(lt,.2,2)));g.strokeStyle=FG(.4);g.lineWidth=4;g.beginPath();g.moveTo(0,1000);g.lineTo(W,1000);g.stroke();
 [1930,1940,1950,1960,1970,1980,1990].forEach((y,i)=>{const x=CX+i*300+off*1.2;const d=Math.abs(x-CX);txt(String(y),x,960,{size:d<150?110:60,gold:d<150,a:Math.max(.2,1-d/600)})});g.fillStyle=GOLD;g.fillRect(CX-3,1010,6,80)}});
FX('n_pie',{zh:'扇形吃掉',en:'Pie eats',cat:'N',beat:'占比、被拿走多少',cost:1,draw(lt){const k=eio(K(lt,.3,1.6))*.7;g.fillStyle='#2e3a4f';g.beginPath();g.arc(CX,960,380,0,7);g.fill();g.fillStyle='#c4661c';g.beginPath();g.moveTo(CX,960);g.arc(CX,960,380+Math.sin(lt*10)*4,-1.57,-1.57+k*6.283);g.fill();txt(Math.round(k*100)+'%',CX,1000,{size:130,color:'#fff',glow:24})}});
FX('n_dots',{zh:'百人点阵',en:'100-dot grid',cat:'N',beat:'"100个人里只有N个"',cost:1,draw(lt){const N=P('n_dots','n',3),hi=i=>i>=100-N,sel=lt>1.1;
 for(let i=0;i<100;i++){const c=i%10,r=Math.floor(i/10),x=190+c*78,y=660+r*78,d=Math.hypot(c-4.5,r-4.5),a=K(lt,.02+d*.06,.17+d*.06),on=hi(i)&&sel,pop=SPR(a);
  g.globalAlpha=a*(sel&&!hi(i)?lerp(1,.22,K(lt,1.1,1.4)):1);g.fillStyle=on?GOLD:(THEME.light?'#7c8796':'#cfd6e0');g.beginPath();g.arc(x,y,(on?30+3*Math.sin(lt*8):24)*pop,0,7);g.fill();
  if(on){const q=((lt-1.1)*1.2)%1;g.globalAlpha=(1-q)*.8;g.strokeStyle=GOLD;g.lineWidth=4;g.beginPath();g.arc(x,y,30+q*60,0,7);g.stroke()}}
 g.globalAlpha=1;const v=Math.round(N*eo(K(lt,1.2,1.6)));if(lt>1.2)txt(v+' / 100',CX,560,{size:110,gold:true,glow:24,a:K(lt,1.2,1.35)});rise(P('n_dots','s','示例比例'),CX,1560,lt,1.3,{size:60})}});
FX('n_scale',{zh:'天平倾斜',en:'Balance scale',cat:'N',beat:'取舍、两边对比',cost:1,draw(lt){const nc=5,drops=[...Array(nc)].map((_,i)=>.35+i*.22),landed=drops.filter(t0=>lt>t0+.25).length;
 const a=.06*landed+Math.sin((lt-.3)*7)*Math.exp(-Math.max(0,lt-.6)*2.2)*.05*Math.min(1,lt*3),ink=FG(.85);g.strokeStyle=ink;g.fillStyle=ink;g.lineCap='round';
 g.lineWidth=14;g.beginPath();g.moveTo(CX,720);g.lineTo(CX,1380);g.stroke();g.beginPath();g.moveTo(CX-180,1400);g.lineTo(CX+180,1400);g.stroke();g.beginPath();g.arc(CX,712,18,0,7);g.fill();
 const ends=[];g.save();g.translate(CX,720);g.rotate(a);g.lineWidth=12;g.beginPath();g.moveTo(-380,0);g.lineTo(380,0);g.stroke();
 [[-380,P('n_scale','a','时间')],[380,P('n_scale','b','钱')]].forEach(([x,s],side)=>{g.save();g.translate(x,0);g.rotate(-a);g.lineWidth=4;g.strokeStyle=FG(.6);g.beginPath();g.moveTo(0,0);g.lineTo(-120,240);g.moveTo(0,0);g.lineTo(120,240);g.stroke();
  g.fillStyle=side?GOLD:FG(.85);g.beginPath();g.ellipse(0,244,140,20,0,0,7);g.fill();txt(s,0,-30,{size:72,gold:!!side});const m=g.getTransform();ends.push([m.e,m.f+244]);g.restore()});g.restore();
 // coins fall onto the right pan and stack there
 const [px,py]=ends[1];drops.forEach((t0,i)=>{if(lt<t0)return;const u=A_clamp((lt-t0)/.25),y=lerp(300,py-16-i*22,u*u);g.fillStyle='#8a6420';g.beginPath();g.ellipse(px,y+8,64,16,0,0,7);g.fill();g.fillStyle=GOLD;g.beginPath();g.ellipse(px,y,64,16,0,0,7);g.fill()})}});

// ───────────── C 镜头 Camera ─────────────
const _COINS=lazy3D({fov:38,dof:{focus:9,aperture:.004},bloom:{strength:.8,threshold:.6},grade:{sat:1.15,warm:.05,vig:.45},
 setup(T,scene){const gold=new T.MeshStandardMaterial({color:0xd9a441,metalness:1,roughness:.25});const geo=new T.CylinderGeometry(1,1,.16,64);
  for(let s=0;s<5;s++)for(let i=0;i<4+s*3;i++){const m=new T.Mesh(geo,gold);m.position.set((s-2)*2.3,i*.18-2,(s%2)*-1.5);m.rotation.y=i*.3;scene.add(m)}
  const L=new T.PointLight(0xffd9a0,60,30);L.position.set(3,5,6);scene.add(L);scene.add(new T.AmbientLight(0x334455,.6));return{}},
 update(lt,o,cam,api){api.orbit(lt,{r:lerp(14,9,eio(lt/2.5)),h:lerp(4,1.2,eio(lt/2.5)),a0:-.7,a1:.8,t0:0,t1:2.5,target:[0,-.5,0]});api.focusOn(cam.position.length())}});
FX('c_orbit',{zh:'3D 环绕',en:'3D orbit',cat:'C',beat:'开场大场面 / hook',cost:2,draw(lt,D,t){_COINS.draw(t,lt)}});
const _DZ=lazy3D({fov:30,bloom:{strength:.7,threshold:.55},grade:{sat:1.1,warm:.04,vig:.6},bg:0x07090f,setup(T,scene){const R=mulberry32(6);
  const m=new T.Mesh(new T.BoxGeometry(.7,1.5,.7),new T.MeshStandardMaterial({color:0xd9a441,metalness:.9,roughness:.25,emissive:0x2a1a04}));m.position.y=-.05;scene.add(m);
  const floor=new T.Mesh(new T.PlaneGeometry(14,140),new T.MeshStandardMaterial({color:0x10141d,roughness:.85}));floor.rotation.x=-1.571;floor.position.set(0,-.8,-50);scene.add(floor);
  const lineM=new T.MeshBasicMaterial({color:0xffc96b});for(let z=4;z>-120;z-=3){const d=new T.Mesh(new T.PlaneGeometry(.08,1.2),lineM);d.rotation.x=-1.571;d.position.set(0,-.79,z);scene.add(d)}
  const win=new T.MeshBasicMaterial({color:0xffd8a0}),wall=new T.MeshStandardMaterial({color:0x223049,roughness:.9});
  for(let side=-1;side<=1;side+=2)for(let z=6;z>-120;z-=4.5){const h=3+R()*9,b=new T.Mesh(new T.BoxGeometry(3,h,4),wall);b.position.set(side*(4.2+R()*.6),h/2-.8,z);scene.add(b);
   for(let k=0;k<5;k++){if(R()<.45)continue;const w=new T.Mesh(new T.PlaneGeometry(.35,.5),win);w.position.set(side*(2.68+R()*.5)+(side>0?0:0),.4+R()*(h-1.5),z+(R()-.5)*3);w.rotation.y=-side*1.571;scene.add(w)}}
  scene.add(new T.AmbientLight(0x8899cc,.35));const L=new T.PointLight(0xffd9a0,40,20);L.position.set(1.5,2.5,3);scene.add(L);scene.fog=new T.Fog(0x07090f,10,90);return{m}},
 update(lt,o,cam){const k=eio(A_clamp((lt-.15)/2.1)),d=lerp(4,30,k);cam.fov=2*Math.atan(2.4/d)*57.3;cam.updateProjectionMatrix();cam.position.set(0,.35,d);cam.lookAt(0,.1,0);o.m.rotation.y=lt*.5}});
FX('c_dollyZoom',{zh:'推拉变焦（眩晕）',en:'Dolly zoom',cat:'C',beat:'"突然意识到"的瞬间',cost:2,draw(lt,D,t){_DZ.draw(t,lt);onDark(()=>rise(P('c_dollyZoom','s','原来如此'),CX,1560,lt,.9,{size:84,gold:true,glow:24}))}});
FX('c_rackFocus',{zh:'焦点转移',en:'Rack focus',cat:'C',beat:'注意力从A转到B',cost:1,img:['watch.jpg','town.jpg'],draw(lt){const k=eio(K(lt,.6,1.6));g.save();g.filter=`blur(${k*18}px)`;cover(IM('town.jpg'),0,0,W,H,1.1);g.restore();
 g.save();g.filter=`blur(${(1-k)*22}px)`;const im=IM('watch.jpg');if(im){g.globalCompositeOperation='lighter';g.drawImage(im,CX-360,700,720,720)}g.restore()}});
const _RINGS=lazy3D({fov:55,bloom:{strength:.8,threshold:.4},grade:{sat:1.2,vig:.5},setup(T,scene){const rs=[];for(let i=0;i<24;i++){const m=new T.Mesh(new T.TorusGeometry(2.2,.035,12,128),new T.MeshBasicMaterial({color:new T.Color().setHSL(.11-i*.0025,.75,i%4?.42:.62)}));
  m.position.set(Math.sin(i*.6)*2,Math.cos(i*.4)*1.5,-i*4);m.rotation.z=i*.3;scene.add(m);rs.push(m)}
  const R=mulberry32(12),a=[];for(let i=0;i<900;i++){const z=-R()*100,r=1.2+R()*5,an=R()*6.283;a.push(Math.sin(-z/4*.6)*2+Math.cos(an)*r,Math.cos(-z/4*.4)*1.5+Math.sin(an)*r,z)}
  const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(a,3));scene.add(new T.Points(sg,new T.PointsMaterial({color:0xffd59a,size:.045,transparent:true,opacity:.8})));
  scene.fog=new T.FogExp2(0x07090c,.045);return{rs}},
 update(lt,o,cam,api){o.rs.forEach((m,i)=>m.rotation.z=i*.3+lt*(i%2?.6:-.6));const z=-lt*28;cam.position.set(Math.sin(-z/4*.6)*2,Math.cos(-z/4*.4)*1.5,z+6);cam.lookAt(Math.sin((-z+8)/4*.6)*2,Math.cos((-z+8)/4*.4)*1.5,z-4)}});
FX('c_spline',{zh:'曲线穿越',en:'Spline fly-through',cat:'C',beat:'招牌镜头一镜到底',cost:2,draw(lt,D,t){_RINGS.draw(t,lt)}});
FX('c_dutch',{zh:'冲击侧滚',en:'Impact roll',cat:'C',beat:'坏消息砸下来',cost:1,draw(lt){const a=lt>.8?.12*Math.exp(-(lt-.8)*3)*Math.cos((lt-.8)*14):0,s=lt>.8?1.1:1;g.save();g.translate(CX,960);g.rotate(a);g.scale(s,s);g.translate(-CX,-960);panel('#2a0e0e');onDark(()=>txt('暴跌',CX,1010,{size:220,color:'#ff6f5e',glow:30}));g.restore()}});
function _city(n,w0,gap,base,amp,seed,col,win){const R=mulberry32(seed);for(let i=-3;i<n;i++){const w=w0*(.7+R()*.6),h=amp*(.4+R()*.6),x=i*gap,y=base-h;g.fillStyle=col;g.fillRect(x,y,w,H);
 if(win)for(let yy=y+24;yy<base+200;yy+=38)for(let xx=x+14;xx<x+w-20;xx+=30)if(R()<.3){g.fillStyle=`rgba(255,${200+R()*40|0},130,${.5+R()*.5})`;g.fillRect(xx,yy,12,18)}}}
FX('c_parallax',{zh:'多层视差',en:'Multi-layer parallax',cat:'C',beat:'交代环境',cost:1,draw(lt){const x=Math.sin(lt*1.2)*140,y=-lt*18;parallax([
 {depth:.05,draw(){const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#0a0f24');gr.addColorStop(.55,'#24305a');gr.addColorStop(1,'#d9875a');g.fillStyle=gr;g.fillRect(-300,-300,W+600,H+600);
  const R=mulberry32(2);for(let i=0;i<120;i++){g.fillStyle=`rgba(255,255,255,${.3+R()*.6})`;g.fillRect(R()*W,R()*900,2,2)}g.fillStyle='#fff1d0';g.shadowColor='#ffe6b0';g.shadowBlur=60;g.beginPath();g.arc(780,520,70,0,7);g.fill();g.shadowBlur=0}},
 {depth:.3,draw(){_city(10,150,140,1050,420,3,'#2a3560',false);g.fillStyle='rgba(217,135,90,.18)';g.fillRect(-300,950,W+600,400)}},
 {depth:.65,draw(){_city(8,200,190,1250,520,4,'#1a2140',true)}},
 {depth:1.2,draw(){_city(6,300,270,1480,560,5,'#0b0f1e',true);g.fillStyle='#06080f';g.fillRect(-300,1550,W+600,500);onDark(()=>txt('城市',CX,1630,{size:100,gold:true,glow:20}))}}],0,{x,y,z:1+.05*lt})}});

// ───────────── M 变形/物理 Morph & physics ─────────────
FX('m_spring',{zh:'弹簧弹入',en:'Spring pop',cat:'M',beat:'物件登场',cost:1,draw(lt){['房','车','戒'].forEach((e,i)=>{const u=lt-.04-i*.25;if(u<0)return;const s=1+Math.exp(-u*6)*Math.cos(u*20)*-.9;g.save();g.translate(260+i*280,960);g.scale(s,s);g.fillStyle=GOLD;g.beginPath();g.arc(0,0,120,0,7);g.fill();txt(e,0,50,{size:140,color:INK});g.restore()})}});
FX('m_paperFold',{zh:'纸张折叠',en:'Paper fold',cat:'M',beat:'收起旧观念 / ending',cost:2,img:['paper.jpg'],draw(lt){panel(THEME.light?THEME.bg:'#111');const im=IM('paper.jpg');if(!im)return;
 const w=700,h=1000,x0=CX-w/2,y0=460,k1=eio(K(lt,.25,.95)),k2=eio(K(lt,.95,1.45)),k3=eio(K(lt,1.45,2.05)),iw=im.naturalWidth,ih=im.naturalHeight;
 g.save();g.translate(lerp(0,620,k3),lerp(0,-900,k3)*1+Math.sin(k3*3.14)*-120);g.translate(CX,y0+h/4);g.rotate(k3*.9);g.scale(1-k3*.6,1-k3*.6);g.translate(-CX,-(y0+h/4));
 g.shadowColor='#000a';g.shadowBlur=40;g.shadowOffsetY=20;g.fillStyle='#000';g.fillRect(x0+6,y0,w-12,h/2*(1-k2*.5));g.shadowColor='#0000';
 // top half folds down onto the middle line in stage 2 (seen from its back side once past 90°)
 const top=Math.cos(k2*Math.PI);if(top>0){g.drawImage(im,0,0,iw,ih/2,x0,y0+h/2-h/2*top,w,h/2*top);(k1>.5?f=>f():quiet)(()=>txt('旧观念',CX,y0+h/2-h/2*top+300*top,{size:90,color:INK,a:top}))}
 // bottom half folds up in stage 1
 const fh=Math.cos(k1*Math.PI)*h/2;g.save();g.translate(0,y0+h/2);g.scale(1,fh/(h/2)||.001);g.drawImage(im,0,ih/2,iw,ih/2,x0,0,w,h/2);g.fillStyle=`rgba(0,0,0,${k1*.45})`;g.fillRect(x0,0,w,h/2);g.restore();
 if(top<=0){g.save();g.translate(0,y0+h/2);g.scale(1,-top);g.drawImage(im,0,ih/2,iw,ih/2,x0,-h/2,w,h/2);g.fillStyle='rgba(0,0,0,.12)';g.fillRect(x0,-h/2,w,h/2);g.restore()}
 g.restore();glowLine(CX-260,1110,CX+260,1110,K(lt,1.6,2),GOLD,6);rise(P('m_paperFold','s','翻篇'),CX,1040,lt,1.6,{size:210,gold:true,glow:36})}});
FX('m_liquid',{zh:'液体注满',en:'Liquid fill',cat:'M',beat:'进度/储蓄满了',cost:1,draw(lt){const lv=lerp(.15,.85,eio(K(lt,0,2))),x0=CX-220,y0=560,w=440,h=900;g.strokeStyle=THEME.light?'#3c6f8f':'#cfe';g.lineWidth=8;g.strokeRect(x0,y0,w,h);g.save();g.beginPath();g.rect(x0,y0,w,h);g.clip();
 g.fillStyle='#3aa0d8';g.beginPath();g.moveTo(x0,y0+h);for(let x=0;x<=w;x+=10)g.lineTo(x0+x,y0+h-lv*h+Math.sin(x*.03+lt*8)*14);g.lineTo(x0+w,y0+h);g.fill();g.restore();txt(Math.round(lv/.85*100)+'%',CX,y0-40,{size:80})}});
FX('m_particleText',{zh:'粒子聚字',en:'Particle form',cat:'M',beat:'关键词出现',cost:1,draw(lt){particleForm(textPoints(P('m_particleText','s','杠杆'),CX,960,360,7),lt,.1,{dur:1,seed:3,out:2.2})}});
FX('m_morph',{zh:'形状变形',en:'Shape morph',cat:'M',beat:'A 变成 B',cost:1,draw(lt){morphShape(polyCircle(CX,900,200),polyRect(CX,900,640,300),eio(K(lt,.4,1.4)));maskReveal(lt<1?'硬币':'钞票',CX,1300,lt,lt<1?.1:1,{size:80})}});
FX('m_pendulum',{zh:'牛顿摆',en:'Newton cradle',cat:'M',beat:'因果传递',cost:1,draw(lt){const a=Math.sin(lt*5);for(let i=0;i<5;i++){let ang=0;if(i===0&&a<0)ang=a*.6;if(i===4&&a>0)ang=a*.6;const x=CX+(i-2)*130,px=x+Math.sin(ang)*500,py=600+Math.cos(ang)*500;
 g.strokeStyle=FG(.55);g.lineWidth=3;g.beginPath();g.moveTo(x,600);g.lineTo(px,py);g.stroke();g.fillStyle=i===0?GOLD:(THEME.light?'#8d96a3':'#ccc');g.beginPath();g.arc(px,py,62,0,7);g.fill()}rise('一个动作，连锁反应',CX,1400,lt,.3,{size:60})}});
FX('m_domino',{zh:'多米诺',en:'Dominoes',cat:'M',beat:'小习惯→大结果',cost:1,draw(lt){const n=9,ds=[];let x=0;for(let i=0;i<n;i++){const s=1.32**i,h=150*s,w=30*s;ds.push({x,w,h});x+=h*.62}const tot=x+ds[n-1].w;
 const step=.17,front=Math.min(n-1,Math.max(0,(lt-.15)/step)),fd=ds[Math.floor(front)],zb=K(lt,1.55,2.25),zf=Math.min(1,700/(fd.h*2.2)),z=lerp(zf,(W-160)/(tot+ds[n-1].h),eio(zb)),
  cx=lerp(fd.x+fd.h*.4,tot/2+ds[n-1].h*.3,eio(zb)),fy=1350;g.save();g.translate(CX,fy);g.scale(z,z);g.translate(-cx,0);
 g.fillStyle=FG(.18);g.fillRect(-2000,0,tot+6000,4/z);ds.forEach((d,i)=>{const t0=.15+i*step,a=Math.min(1.36,Math.max(0,(lt-t0)*7)*1.36*(1-Math.exp(-(lt-t0)*9)));
  g.save();g.translate(d.x+d.w,0);g.rotate(a);const gr=g.createLinearGradient(-d.w,0,0,0);const last=i===n-1;gr.addColorStop(0,last?'#b8862f':(THEME.light?'#7d6a55':'#cfc6b4'));gr.addColorStop(1,last?GOLD:(THEME.light?'#5b4a38':'#f1ebdf'));
  g.fillStyle=gr;g.shadowColor=last?`rgba(${THEME.glow},.6)`:'#0000';g.shadowBlur=last?40:0;g.fillRect(-d.w,-d.h,d.w,d.h);g.shadowBlur=0;g.fillStyle=THEME.light?'#fff3':'#0003';for(let p=1;p<3;p++)g.fillRect(-d.w*.8,-d.h*p/3,d.w*.6,d.h*.012+1);g.restore()});g.restore();
 rise(P('m_domino','a','小习惯'),220,520,lt,.1,{size:64,gold:true});rise(P('m_domino','b','大结果'),W-240,520,lt,1.75,{size:90,gold:true,glow:24})}});
FX('m_explode',{zh:'爆裂散开',en:'Burst disperse',cat:'M',beat:'泡沫破裂',cost:1,params:'s, s2, col (r,g,b), at',draw(lt){const R=mulberry32(5),at=P('m_explode','at',.9),cc=P('m_explode','col','232,168,200');if(lt<at){const s=1+lt*.4+Math.sin(lt*30)*.02*lt;g.fillStyle=`rgb(${cc})`;g.beginPath();g.arc(CX,960,250*s,0,7);g.fill();txt(P('m_explode','s','泡沫'),CX,1000,{size:110,color:'#fff'});return}
 const k=lt-at;for(let i=0;i<120;i++){const a=R()*6.28,v=300+R()*900;g.fillStyle=`rgba(${cc},${Math.max(0,1-k)})`;g.fillRect(CX+Math.cos(a)*v*k,960+Math.sin(a)*v*k+400*k*k,10,10)}rise(P('m_explode','s2','破了'),CX,1000,lt,at+.1,{size:120,gold:true})}});

// ───────────── G 生图×代码 Image-gen × code ─────────────
const _PLATE=lazy3D({fov:50,bloom:{strength:.5,threshold:.7},grade:{sat:1.1,warm:.04,vig:.5},dof:{focus:8,aperture:.0006},
 setup(T,scene){const geo=new T.PlaneGeometry(9,16,90,160);const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++){const u=uv.getX(i),v=uv.getY(i);let d=Math.min(1,Math.hypot((u-.42)*1.6,(v-.47)*1.1));if(v>.5)d*=.35;p.setZ(i,d*d*5)}
  const tx=new T.Texture();tx.colorSpace=T.SRGBColorSpace;scene.add(new T.Mesh(geo,new T.MeshBasicMaterial({map:tx})));return{tx}},
 update(lt,o,cam,api){texUp(o.tx,IM('town.jpg'));api.dolly(lt*1.6,[[0,[0,-.6,16]],[2.2,[.5,-1.4,11.5]],[4.5,[-.3,-2,8.5]]],[-.6,-.6,0])}});
FX('g_depthPlate',{zh:'场景板伪深度推镜',en:'Depth-plate dolly',cat:'G',beat:'开场交代年代 / hook',cost:2,img:['town.jpg'],draw(lt,D,t){_PLATE.draw(t,lt)}});
const _BILL=lazy3D({fov:38,bloom:{strength:.35,threshold:.92},grade:{sat:1.1,warm:.06,vig:.55},setup(T,scene){const geo=new T.PlaneGeometry(6.4,3.6,64,8);const p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*.6)*.35);geo.computeVertexNormals();
  const tx=new T.Texture();tx.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(geo,new T.MeshStandardMaterial({map:tx,roughness:.7,side:T.DoubleSide}));scene.add(m);const L=new T.PointLight(0xffe2b0,14,40);L.position.set(3,4,6);scene.add(L);scene.add(new T.AmbientLight(0xffffff,.55));return{m,tx}},
 update(lt,o,cam,api){texUp(o.tx,IM('bill.jpg'));o.m.rotation.z=lerp(-.5,.15,eio(A_clamp(lt/2)));o.m.rotation.y=Math.sin(lt*1.6)*.3;api.orbit(lt,{r:lerp(17,13.5,eio(lt/2.5)),h:lerp(-3,1,eio(lt/2.5)),a0:-.9,a1:.6,t0:0,t1:2.5,target:[0,0,0]})}});
FX('g_tex3D',{zh:'生图纹理 3D 道具',en:'Textured 3D prop',cat:'G',beat:'钱/文件/证据特写',cost:2,img:['bill.jpg'],draw(lt,D,t){_BILL.draw(t,lt)}});
let _WP=null,_WM=null;function imgPts(n){if(_WP)return _WP;const im=IM(n);if(!im)return null;const s=300,o=document.createElement('canvas');o.width=o.height=s;const og=o.getContext('2d');og.drawImage(im,0,0,s,s);const d=og.getImageData(0,0,s,s).data;_WP=[];
 for(let y=0;y<s;y+=4)for(let x=0;x<s;x+=4){const k=(y*s+x)*4;if(d[k]+d[k+1]+d[k+2]>110)_WP.push([CX+(x-s/2)*2.8,900+(y-s/2)*2.8,d[k],d[k+1],d[k+2]])}return _WP}
FX('g_img2particles',{zh:'图片碎成粒子聚字',en:'Image → particles → word',cat:'G',beat:'高潮：物变词',cost:2,img:['watch.jpg'],draw(lt){const Pp=imgPts('watch.jpg');if(!Pp)return;const T2=textPoints('时间',CX,900,330,6),R=mulberry32(4);
 if(lt<.7){g.drawImage(IM('watch.jpg'),CX-420,480,840,840);return}g.save();g.globalCompositeOperation=pBlend();const M=_WM||(_WM=matchPts(Pp,T2,'g_img2particles'));for(let i=0;i<M.length;i++){const[p,q]=M[i],a=R()*6.28,sp=200+R()*400,del=R()*.3;
 const k1=A_clamp((lt-.7-del*.5)/.5),k2=eio(A_clamp((lt-1.3-del)/.7));const x=lerp(p[0]+Math.cos(a)*sp*eo(k1),q[0],k2),y=lerp(p[1]+Math.sin(a)*sp*eo(k1),q[1],k2);g.fillStyle=k2>.5?`rgb(${THEME.pt})`:`rgb(${p[2]},${p[3]},${p[4]})`;g.fillRect(x-2.5,y-2.5,5,5)}g.restore()}});
function drawOn(pts,k,col='#ffd27a'){if(k<=0)return;g.save();g.strokeStyle=col;g.lineWidth=9;g.lineCap=g.lineJoin='round';g.shadowColor='rgba(255,190,90,.7)';g.shadowBlur=14;const n=Math.max(2,Math.floor(pts.length*A_clamp(k)));g.beginPath();for(let i=0;i<n;i++)i?g.lineTo(...pts[i]):g.moveTo(...pts[i]);g.stroke();g.restore()}
function ringPts(cx,cy,rx,ry){const p=[];for(let i=0;i<=60;i++){const a=i/60*6.6-1.4;p.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry])}return p}
FX('g_diorama',{zh:'微缩模型+手绘批注',en:'Diorama + draw-on notes',cat:'G',beat:'日常现象指出问题',cost:2,img:['diorama.jpg'],draw(lt){panel('#1b2546');const b=Math.sin(lt*2.2)*14,im=IM('diorama.jpg');if(im)g.drawImage(im,CX-480,380+b,960,960);
 drawOn(ringPts(CX+65,620+b,120,100),(lt-.6)/.5);drawOn([[CX-200,1010+b],[CX-90,1110+b],[CX+150,940+b]],(lt-1.3)/.4);onDark(()=>rise('办了卡，没去',CX,1500,lt,1.4,{size:70,color:'#f3ece0'}))}});
FX('g_eraMorph',{zh:'跨时代扫描变形',en:'Era scan morph',cat:'G',beat:'技术/时代变迁',cost:2,img:['phone-old.jpg','phone-new.jpg'],draw(lt){panel('#000');const k=eio(K(lt,.5,1.8)),y=lerp(380,1540,k),a=IM('phone-old.jpg'),b=IM('phone-new.jpg');if(!a||!b)return;
 g.save();g.beginPath();g.rect(0,y,W,H);g.clip();g.drawImage(a,CX-480,480,960,960);g.restore();g.save();g.beginPath();g.rect(0,0,W,y);g.clip();g.drawImage(b,CX-480,480,960,960);g.restore();g.fillStyle='#7ff';g.shadowColor='#7ff';g.shadowBlur=30;g.fillRect(0,y-3,W,6);g.shadowBlur=0;
 onDark(()=>txt(lt<1.2?'1920s':'今天',CX,400,{size:80,gold:true}))}});
FX('g_puppet',{zh:'剪纸木偶',en:'Cutout puppet',cat:'G',beat:'人物故事动作拍',cost:2,img:['cutout.jpg','paper.jpg'],draw(lt){cover(IM('paper.jpg'),0,0,W,H);const im=keyed('cutout.jpg');if(!im)return;const x=lerp(-150,CX+120,eio(K(lt,0,1.8))),hop=Math.abs(Math.sin(lt*9))*30*(lt<1.8?1:0);
 g.save();g.translate(x,1500-hop);g.rotate(Math.sin(lt*9)*.06);g.scale(-1,1);g.drawImage(im,-300,-790,600,800);g.restore();g.fillStyle='#0002';g.beginPath();g.ellipse(x,1510,160,24,0,0,7);g.fill()}});
const _SKY=lazy3D({fov:60,bloom:{strength:.6,threshold:.8},grade:{warm:.05},setup(T,scene){const tx=new T.Texture();tx.colorSpace=T.SRGBColorSpace;const sp=new T.Mesh(new T.SphereGeometry(50,64,32),new T.MeshBasicMaterial({map:tx,side:T.BackSide}));scene.add(sp);
  const coin=new T.Mesh(new T.CylinderGeometry(1,1,.15,64),new T.MeshStandardMaterial({color:0xd9a441,metalness:1,roughness:.2}));coin.rotation.x=1.57;scene.add(coin);scene.add(new T.AmbientLight(0xffffff,1));const L=new T.PointLight(0xffd9a0,80,30);L.position.set(2,3,4);scene.add(L);return{tx,coin}},
 update(lt,o,cam){texUp(o.tx,IM('sky.jpg'));o.coin.rotation.z=lt*3;o.coin.position.y=Math.sin(lt*2)*.2;const a=lerp(-.4,.6,eio(lt/2.5));cam.position.set(Math.sin(a)*5,.5,Math.cos(a)*5);cam.lookAt(0,0,0)}});
FX('g_skybox',{zh:'生图天空盒',en:'Generated skybox',cat:'G',beat:'结尾升华 / ending',cost:2,img:['sky.jpg'],draw(lt,D,t){_SKY.draw(t,lt)}});
FX('g_inkPaper',{zh:'生图纸墨',en:'Ink on generated paper',cat:'G',beat:'金句收尾',cost:1,img:['paper.jpg','ink.jpg'],draw(lt){cover(IM('paper.jpg'),0,0,W,H,1+.03*lt);const im=IM('ink.jpg');const k=eo(K(lt,.2,1.2));if(im){g.save();g.globalAlpha=.85;g.globalCompositeOperation='multiply';g.drawImage(im,CX-420*k,960-420*k,840*k,840*k);g.restore()}
 if(lt>1)rise('知行合一',CX,1600,lt,1,{size:110,color:INK})}});
FX('g_spotlight',{zh:'探照灯寻物',en:'Spotlight search',cat:'G',beat:'"答案藏在这里"',cost:1,img:['town.jpg'],draw(lt){const im=IM('town.jpg');cover(im,0,0,W,H,1.05);g.fillStyle='rgba(0,0,0,.82)';g.fillRect(0,0,W,H);
 const x=CX+Math.sin(lt*2.3)*300*(1-K(lt,1.4,2)),y=1000+Math.cos(lt*1.7)*400*(1-K(lt,1.4,2)),r=lerp(200,280,K(lt,1.4,2));g.save();g.beginPath();g.arc(x,y,r,0,7);g.clip();cover(im,0,0,W,H,1.05);g.restore()}});
FX('g_tiles',{zh:'图块拼合',en:'Tile assemble',cat:'G',beat:'拼出全貌',cost:1,img:['diorama.jpg'],draw(lt){panel('#1b2546');const im=IM('diorama.jpg');if(!im)return;const n=6,s=960/n,R=mulberry32(8);for(let i=0;i<n;i++)for(let j=0;j<n;j++){const d=R()*.6,k=eio(K(lt,d,d+.9));
 const sx=im.naturalWidth/n;g.save();g.translate(lerp(R()*W,CX-480+i*s+s/2,k),lerp(R()*H,480+j*s+s/2,k));g.rotate((1-k)*(R()-.5)*4);g.drawImage(im,i*sx,j*sx,sx,sx,-s/2,-s/2,s,s);g.restore()}}});
FX('g_kenBurns',{zh:'生图推拉摇移',en:'Ken Burns plate',cat:'G',beat:'铺垫背景',cost:1,img:['sky.jpg'],draw(lt){const s=1.25+.15*lt;g.save();g.translate(-lt*60,0);cover(IM('sky.jpg'),0,0,W,H,s);g.restore();g.fillStyle='rgba(10,8,6,.35)';g.fillRect(0,1395,W,150);rise('那年夏天',CX,1500,lt,.1,{size:90,color:'#fff',glow:24})}});
FX('g_lens',{zh:'放大镜细看',en:'Magnifier inspect',cat:'G',beat:'看细节/小字',cost:1,img:['bill.jpg'],draw(lt){const im=IM('bill.jpg');panel('#222');if(!im)return;g.drawImage(im,40,700,1000,560);const x=lerp(250,830,eio(K(lt,.2,2))),y=980+Math.sin(lt*3)*80;
 g.save();g.beginPath();g.arc(x,y,170,0,7);g.clip();g.translate(x,y);g.scale(2.4,2.4);g.translate(-x,-y);g.drawImage(im,40,700,1000,560);g.restore();g.strokeStyle='#c9a24a';g.lineWidth=16;g.beginPath();g.arc(x,y,170,0,7);g.stroke();g.lineWidth=30;g.beginPath();g.moveTo(x+120,y+120);g.lineTo(x+260,y+260);g.stroke()}});
FX('g_polaroid',{zh:'照片拍立得掉落',en:'Polaroid drop',cat:'G',beat:'回忆、证据',cost:1,img:['town.jpg','diorama.jpg','sky.jpg'],draw(lt){['town.jpg','diorama.jpg','sky.jpg'].forEach((n,i)=>{const u=lt-.04-i*.4;if(u<0)return;const k=eo(A_clamp(u/.3)),im=IM(n);
 g.save();g.translate(CX+(i-1)*120,lerp(-400,900+i*60,k));g.rotate((i-1)*.15+(1-k)*.5);g.fillStyle='#fafafa';g.shadowColor='#0008';g.shadowBlur=30;g.fillRect(-300,-330,600,700);g.shadowBlur=0;if(im)cover(im,-270,-300,540,540);g.restore()})}});

// ───────────── R 树状节点 Tree & node graphs ─────────────
// Structure param: FXP[id].tree = {l:'根',c:[{l:'子',c:[...]},...]}  (labels may be Chinese)
const SPR=u=>u<=0?0:1-Math.exp(-7*u)*Math.cos(13*u);
function trLayout(tr,x0,x1,y,dy,out=[],par=null,d=0){const n={l:tr.l,x:(x0+x1)/2,y,d,par,img:tr.img};out.push(n);const c=tr.c||[];c.forEach((k,i)=>trLayout(k,x0+(x1-x0)*i/c.length,x0+(x1-x0)*(i+1)/c.length,y+dy,dy,out,n,d+1));return out}
function glowLine(x1,y1,x2,y2,k,col='#ffd27a',w=5,curve=true){if(k<=0)return;g.save();g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.shadowColor=col;g.shadowBlur=18;g.beginPath();
 const N=24,my=(y1+y2)/2,lp=[];g.moveTo(x1,y1);for(let i=1;i<=N*A_clamp(k);i++){const u=i/N;const x=curve?(1-u)**3*x1+3*(1-u)**2*u*x1+3*(1-u)*u*u*x2+u**3*x2:lerp(x1,x2,u),y=curve?(1-u)**3*y1+3*(1-u)**2*u*my+3*(1-u)*u*u*my+u**3*y2:lerp(y1,y2,u);g.lineTo(x,y);lp.push([x,y])}g.stroke();if(typeof logShape==='function')logShape('line',lp);g.restore()}
function node(x,y,r,k,label,o={}){if(k<=0)return;const s=SPR(k);g.save();g.translate(x,y);g.scale(s,s);g.shadowColor=o.col||pAcc();g.shadowBlur=o.dim?0:35;
 const gr=g.createRadialGradient(-r*.3,-r*.3,1,0,0,r);gr.addColorStop(0,o.dim?'#555':'#fff6d8');gr.addColorStop(1,o.dim?'#2a2a2a':(o.col||pAcc()));g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,7);g.fill();g.restore();
 if(label&&k>.05){const sz=o.size||46,lx=x+(o.lx||0),ly=y+(o.ly??r+50),a=A_clamp(k/.15);if(o.plate){const w=measure(label,sz)+sz*.6;g.save();g.globalAlpha*=a*.8;g.fillStyle=THEME.plate;g.beginPath();g.roundRect(lx-w/2,ly-sz*.95,w,sz*1.25,sz*.3);g.fill();g.restore()}
  txt(label,lx,ly,{size:sz,color:o.dim?THEME.dim:THEME.label,a})}}
const NT_DEF={l:'复利',c:[{l:'时间',c:[{l:'早开始'},{l:'不中断'}]},{l:'收益率',c:[{l:'低成本'},{l:'分散'}]},{l:'本金',c:[{l:'储蓄率'},{l:'加薪'}]}]};
FX('r_treeGrow',{zh:'知识树生长',en:'Knowledge tree grows',cat:'R',beat:'拆解一个概念 / 讲结构',cost:1,params:'tree',draw(lt){const ns=trLayout(P('r_treeGrow','tree',NT_DEF),110,W-110,1500,-420);
 g.save();g.translate(0,Math.sin(lt*1.3)*6);const T0=n=>.15+n.d*.55;ns.forEach(n=>{if(n.par)glowLine(n.par.x,n.par.y,n.x,n.y,K(lt,T0(n)-.4,T0(n)),pLine(),n.d===1?9:5)});
 ns.forEach(n=>{const sz=n.d?(n.d===1?52:36):70,r=n.d?(n.d===1?34:22):52;node(n.x,n.y,r,(lt-T0(n))/.5,n.l,{size:sz,plate:true,lx:n.d===1?Math.min(r+18+measure(n.l,sz)/2,W-84-n.x-measure(n.l,sz)/2):0,ly:n.d===1?sz*.36:(n.d?-r-22:110)})});g.restore()}});
let _FG={};function forceLay(key,N,E){if(_FG[key])return _FG[key];const R=mulberry32(11),p=[];for(let i=0;i<N;i++)p.push({x:CX+(R()-.5)*600,y:960+(R()-.5)*900,vx:0,vy:0});
 for(let it=0;it<400;it++){for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){const a=p[i],b=p[j];let dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy+1,f=9e4/d2;a.vx+=dx*f/Math.sqrt(d2);a.vy+=dy*f/Math.sqrt(d2);b.vx-=dx*f/Math.sqrt(d2);b.vy-=dy*f/Math.sqrt(d2)}
  E.forEach(([i,j])=>{const a=p[i],b=p[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)+.1,f=(d-230)*.04;a.vx+=dx/d*f;a.vy+=dy/d*f;b.vx-=dx/d*f;b.vy-=dy/d*f});
  p.forEach(q=>{q.vx+=(CX-q.x)*.004;q.vy+=(960-q.y)*.003;q.x+=q.vx*.5;q.y+=q.vy*.5;q.vx*=.6;q.vy*=.6})}return _FG[key]=p}
// Node label placed on the side facing away from its edges (8 candidate spots, fewest edge crossings wins), on a plate.
function labelOff(p,E,i,l,sz,r,k){if(k<=0)return;const w=measure(l,sz)+sz*.6,h=sz*1.25,q=p[i];let best=null;
 for(let c=0;c<16;c++){const a=c/8*6.283+1.571,rr=c<8?r:r*1.9,cx=q.x+Math.cos(a)*(rr+w*.5*Math.abs(Math.cos(a))+h*.5*Math.abs(Math.sin(a))),cy=q.y+Math.sin(a)*(rr+h*.6)+sz*.34;
  if(cx-w/2<50||cx+w/2>W-50)continue;let hit=0;E.forEach(([u,v])=>{const A=p[u],B=p[v];for(let s2=0;s2<=20;s2++){const x=lerp(A.x,B.x,s2/20),y=lerp(A.y,B.y,s2/20);if(Math.abs(x-cx)<w/2+6&&Math.abs(y-(cy-sz*.34))<h/2+6)hit++}});
  p.forEach((o,j)=>{if(j!==i&&Math.hypot(o.x-cx,o.y-cy)<w/2+30)hit+=5});if(!best||hit<best.hit-.01)best={hit,cx,cy}}
 const a=A_clamp(k/.15);g.save();g.globalAlpha*=a*.85;g.fillStyle=THEME.plate;g.beginPath();g.roundRect(best.cx-w/2,best.cy-sz*.95,w,h,sz*.3);g.fill();g.restore();txt(l,best.cx,best.cy,{size:sz,color:THEME.label,a})}
FX('r_forceGraph',{zh:'关系网逐个点亮',en:'Force graph lights up',cat:'R',beat:'人物关系 / 因果网',cost:1,params:'labels, edges',draw(lt){const L=P('r_forceGraph','labels',['洛克菲勒','标准石油','铁路','炼油厂','银行','反垄断','慈善','芝加哥大学']),
 E=P('r_forceGraph','edges',[[0,1],[1,2],[1,3],[0,4],[1,5],[0,6],[6,7],[2,4],[3,5]]),p=forceLay(L.join(),L.length,E),dt=1.6/L.length,on=i=>lt>.08+i*dt;
 g.save();g.translate(CX,960);g.rotate(Math.sin(lt*.6)*.03);g.translate(-CX,-960);E.forEach(([i,j])=>{const t0=.08+Math.max(i,j)*dt;glowLine(p[i].x,p[i].y,p[j].x,p[j].y,K(lt,t0,t0+.25),THEME.light?'#2f7fae':'#7fd4ff',4,false)});
 L.forEach((l,i)=>{const t0=.08+i*dt,pulse=lt>t0?1+.08*Math.sin((lt-t0)*6):1;node(p[i].x,p[i].y,(i?26:44)*pulse,(lt-t0)/.45,null,{col:i?(THEME.light?'#2f7fae':'#7fd4ff'):GOLD})});L.forEach((l,i)=>{const t0=.08+i*dt;labelOff(p,E,i,l,i?40:56,(i?26:44)+14,(lt-t0)/.45)});g.restore()}});
const _CONST=lazy3D({fov:55,bloom:{strength:.55,threshold:.55},grade:{sat:1.2,vig:.55},bg:0x05070d,
 setup(T,scene){const R=mulberry32(21),pts=[],path=[];const sg=new T.SphereGeometry(.07,16,12);const mat=c=>new T.MeshBasicMaterial({color:c});
  function grow(p,dir,d,main){pts.push(p);if(d>4)return;const n=d<2?3:2;for(let i=0;i<n;i++){const q=p.clone().add(new T.Vector3(dir.x+(R()-.5)*2.2,dir.y+(R()-.5)*2.2,-2.2-R()));scene.add(new T.Line(new T.BufferGeometry().setFromPoints([p,q]),new T.LineBasicMaterial({color:0x5fa8ff,transparent:true,opacity:.55})));
   if(main&&i===0)path.push(q);grow(q,dir,d+1,main&&i===0)}}
  path.push(new T.Vector3(0,0,0));grow(path[0],new T.Vector3(0,0,0),0,true);pts.forEach((p,i)=>{const m=new T.Mesh(sg,mat(path.includes(p)?0xffd27a:0x9fd0ff));m.position.copy(p);m.scale.setScalar(path.includes(p)?2:1);scene.add(m)});
  const sg2=new T.BufferGeometry(),a=[];for(let i=0;i<600;i++)a.push((R()-.5)*40,(R()-.5)*40,-R()*20+5);sg2.setAttribute('position',new T.Float32BufferAttribute(a,3));scene.add(new T.Points(sg2,new T.PointsMaterial({color:0x8899bb,size:.05})));
  return{curve:new T.CatmullRomCurve3(path.map(p=>p.clone().add(new T.Vector3(1.2,.9,3.2))))}},
 update(lt,o,cam){const u=eio(A_clamp(lt/2.5))*.92;const p=o.curve.getPoint(u),q=o.curve.getPoint(Math.min(1,u+.08));cam.position.copy(p);cam.lookAt(q.x-1.2,q.y-.9,q.z-3.2)}});
FX('r_constellation3D',{zh:'3D 节点星座穿越',en:'3D node constellation fly-through',cat:'R',beat:'招牌镜头：顺着一条线深挖',cost:2,draw(lt,D,t){_CONST.draw(t,lt);onDark(()=>rise(P('r_constellation3D','s','一路追到根源'),CX,1600,lt,1.2,{size:70,gold:true,glow:20}))}});
const DT_DEF={l:'已经投了10万',c:[{l:'继续投',c:[{l:'越陷越深'},{l:'侥幸回本'}]},{l:'及时止损',c:[{l:'损失封顶'},{l:'重新出发'}]}]};
FX('r_decision',{zh:'决策树选一条路',en:'Decision tree path',cat:'R',beat:'揭示正确选择（如沉没成本）',cost:1,params:'tree, pick (e.g. [1,1])',draw(lt){const tr=P('r_decision','tree',DT_DEF),pick=P('r_decision','pick',[1,1]);const ns=trLayout(tr,40,W-40,560,400);
 const onPath=n=>{const ch=[];let m=n;while(m.par){ch.unshift(m.par.c_i??0);m=m.par}return true};let cur=ns[0],path=[cur];pick.forEach(i=>{const kids=ns.filter(n=>n.par===cur);cur=kids[i];if(cur)path.push(cur)});
 const hl=lt>1.3,box=(n,k,on)=>{if(k<=0)return;const s=SPR(k),fs=n.d===2?40:(n.d?44:56),w=Math.min(measure(n.l,fs)+(n.d===2?36:60),(W-80)/Math.pow(2,n.d)-24),h=n.d?84:100;if(typeof logShape==='function')logShape('box',[[n.x-w*s/2,n.y-h*s/2],[n.x+w*s/2,n.y+h*s/2]]);g.save();g.translate(n.x,n.y);g.scale(s,s);g.shadowColor=on?pAcc():'#000';g.shadowBlur=on?40:0;g.fillStyle=hl&&!on?THEME.boxOff:(on?THEME.boxOn:THEME.box);g.strokeStyle=on&&hl?pAcc():THEME.boxStroke;g.lineWidth=4;
  g.beginPath();g.roundRect(-w/2,-h/2,w,h,20);g.fill();g.stroke();g.restore();txt(n.l,n.x,n.y+fs*.32,{size:fs,color:hl&&!on?THEME.dimText:THEME.label,gold:on&&hl,a:A_clamp(k/.15)})};
 ns.forEach(n=>{const t0=.1+n.d*.35;if(n.par){const on=path.includes(n);glowLine(n.par.x,n.par.y+40,n.x,n.y-40,K(lt,t0-.25,t0),hl?(on?pAcc():THEME.dimLine):'#6a7a99',on&&hl?8:4)}});
 ns.forEach(n=>box(n,(lt-.1-n.d*.35)/.4,path.includes(n)));if(hl){const e=path[path.length-1];const k=SPR((lt-1.5)/.5);g.save();g.globalAlpha=A_clamp(k);g.strokeStyle=pAcc();g.lineWidth=6;g.beginPath();g.arc(e.x,e.y,90+20*k,0,7);g.stroke();g.restore()}}});
const MM_DEF={l:'副业',c:[{l:'写作'},{l:'剪视频'},{l:'设计'},{l:'带货'},{l:'咨询'},{l:'编程'}]};
FX('r_mindmap',{zh:'放射脑图炸开',en:'Radial mind map burst',cat:'R',beat:'列举可能性 / 开场铺开',cost:1,params:'tree',draw(lt){const tr=P('r_mindmap','tree',MM_DEF),c=tr.c||[],n=c.length,rot=lt*.12;
 for(let r=1;r<4;r++){g.strokeStyle=`rgba(255,210,120,${.06*K(lt,.1,.5)})`;g.lineWidth=2;g.beginPath();g.arc(CX,960,r*160,0,7);g.stroke()}
 c.forEach((k,i)=>{const a=i/n*6.283-1.57+rot,t0=.25+i*.12,s=SPR((lt-t0)/.5),R=380*s,x=CX+Math.cos(a)*R*.8,y=960+Math.sin(a)*R*1.15;glowLine(CX+Math.cos(a)*80,960+Math.sin(a)*80,x-Math.cos(a)*34,y-Math.sin(a)*34,K(lt,t0,t0+.2),THEME.line2,5,false);
  (k.c||[]).forEach((kk,j)=>{const b=a+(j-((k.c.length-1)/2))*.35,x2=x+Math.cos(b)*190,y2=y+Math.sin(b)*190;glowLine(x,y,x2,y2,K(lt,t0+.4,t0+.6),THEME.line2+'88',3,false);node(x2,y2,14,(lt-t0-.5)/.4,kk.l,{size:32,plate:true,lx:Math.cos(b)*(24+measure(kk.l,32)/2),ly:Math.sin(b)*40+11})});
  node(x,y,30,(lt-t0)/.4,k.l,{col:THEME.node2,size:48,plate:true,lx:Math.cos(a)*(44+measure(k.l,48)/2),ly:Math.sin(a)*62+17})});node(CX,960,70+6*Math.sin(lt*4),lt/.3,null);txt(tr.l,CX,980,{size:64,color:THEME.ink})}});
const IT_DEF={l:'一个人的一生',c:[{l:'童年',img:'town.jpg'},{l:'奋斗',img:'diorama.jpg'},{l:'财富',img:'bill.jpg'},{l:'晚年',img:'sky.jpg'}]};
FX('r_imageTree',{zh:'生图叶子树',en:'Tree with image leaves',cat:'R',beat:'人物故事的章节 / 回顾结尾',cost:2,img:['town.jpg','diorama.jpg','bill.jpg','sky.jpg','paper.jpg'],params:'tree (nodes may set img)',draw(lt){
 cover(IM('paper.jpg'),0,0,W,H);g.fillStyle='rgba(20,14,8,.35)';g.fillRect(0,0,W,H);const tr=P('r_imageTree','tree',IT_DEF),c=tr.c||[],rx=CX,ry=1650;
 glowLine(rx,1690,rx,ry-200,K(lt,0,.3),'#6b4a2a',22,false);c.forEach((k,i)=>{const a=-2.55+i/(c.length-1)*1.96,t0=.3+i*.28,R=480,x=rx+Math.cos(a)*R*.9,y=ry-200+Math.sin(a)*R*1.25;
  glowLine(rx,ry-200,x,y+120,K(lt,t0-.2,t0+.1),'#8a5e32',12);const s=SPR((lt-t0)/.5),im=IM(k.img),sw=Math.sin(lt*1.8+i)*.04;if(s<=0)return;
  g.save();g.translate(x,y);g.rotate(sw);g.scale(s,s);g.shadowColor='#ffd27a';g.shadowBlur=30;g.beginPath();g.arc(0,0,130,0,7);g.fillStyle='#fff';g.fill();g.shadowBlur=0;g.beginPath();g.arc(0,0,120,0,7);g.clip();if(im)cover(im,-120,-120,240,240,1.1+.05*lt);g.restore();
  {const a=A_clamp((lt-t0)/.15),lw=measure(k.l,50)+36;g.save();g.globalAlpha*=a*.85;g.fillStyle='#1a120a';g.beginPath();g.roundRect(x-lw/2,y-212,lw,66,16);g.fill();g.restore();txt(k.l,x,y-163,{size:50,color:'#fff',a})}});g.fillStyle='rgba(20,12,4,.6)';g.fillRect(0,1700,W,120);txt(tr.l,CX,1785,{size:76,color:'#fff',a:A_clamp((lt-.1)/.15)})}});
