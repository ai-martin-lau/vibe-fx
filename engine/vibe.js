// Vibe 片引擎 · 共享画布库（确定性：每一帧都是 t 的纯函数）
// 用法：scene.html 先 <script src="../../engine/vibe.js">，再写自己的 S[] 场景表，最后调用 VIBE_FILM({...})。
// 时间表来自同目录 rhythm.json（render.py 注入为 window.RHYTHM，audio.py 也读它），场景用 id 对上镜头。
// 默认转场 = 硬切。淡化只在 rhythm.json 里写 "in":"fade" 时才有（交叉淡化，两边不会同时归零）。
// 禁用 requestAnimationFrame / Date / 不带种子的 Math.random，否则同一个 t 重渲会不一致。
const W=1080,H=1920,CX=520;           // CX 比 540 左移，避开抖音右侧按钮栏
const SERIF='"Noto Serif CJK SC","Noto Serif",serif';
const c=document.getElementById('c'),g=c.getContext('2d');
// ---------- 带种子的随机与缓动 ----------
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,k)=>a+(b-a)*k;
const eo=k=>1-Math.pow(1-clamp(k),3);           // easeOutCubic
const eio=k=>{k=clamp(k);return k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2};
const ramp=(t,a,b)=>clamp((t-a)/(b-a));
function vis(t,a,b,fi=0,fo=0){ if(t<a||t>b)return 0; return Math.min(fi>0?ramp(t,a,a+fi):1, fo>0?1-ramp(t,b-fo,b):1);}
// ---------- 预生成素材（种子固定，VIBE_FILM 里按 seed 初始化） ----------
let R,dust=[],fgDust=[],grain=[];
function initAssets(seed){R=mulberry32(seed);dust=[];fgDust=[];grain=[];
  for(let i=0;i<140;i++)dust.push({x:R()*W,y:R()*H,z:.2+R()*.8,s:R()*6.28,v:.3+R()*.7});
  for(let i=0;i<14;i++)fgDust.push({x:R()*W,y:R()*H,r:18+R()*40,s:R()*6.28});
  for(let k=0;k<6;k++){const o=document.createElement('canvas');o.width=o.height=256;const og=o.getContext('2d');const id=og.createImageData(256,256);
    for(let i=0;i<id.data.length;i+=4){const v=R()*255;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=255}og.putImageData(id,0,0);grain.push(o)}}
// ---------- 文字 ----------
// 配色：每片自己定（VIBE_FILM({theme:...})），默认暗金。gold:true 的字、组件、光斑都跟着主题走。
const THEMES={
  gold:{hi:'#fff3c9',mid:'#e9c46a',lo:'#a8781f',rgb:'233,196,106',glow:'255,200,90',text:'#f3ece0',bg:'#07060a',bloom:'120,82,30',cool:'40,46,70',dust:'255,214,140',ptR:1.35,ptCol:'255,222,150'},
  ice:{hi:'#f6fbff',mid:'#a0ccee',lo:'#4e7ca8',rgb:'160,204,238',glow:'150,200,255',text:'#eef4fa',bg:'#05070b',bloom:'40,70,110',cool:'20,30,60',dust:'190,220,255'},
  jade:{hi:'#eafff4',mid:'#7fd6a8',lo:'#2f8a63',rgb:'127,214,168',glow:'110,230,170',text:'#eef7f1',bg:'#050907',bloom:'30,80,60',cool:'20,40,50',dust:'170,240,200'},
  ember:{hi:'#fff0e0',mid:'#ff9a5a',lo:'#b0441e',rgb:'255,154,90',glow:'255,130,70',text:'#fbefe6',bg:'#0a0605',bloom:'120,50,24',cool:'50,30,50',dust:'255,180,130'},
  violet:{hi:'#f4ecff',mid:'#b89cff',lo:'#6a4bc0',rgb:'184,156,255',glow:'170,140,255',text:'#f2eefa',bg:'#07050c',bloom:'70,44,120',cool:'30,30,70',dust:'210,190,255'},
};
let THEME=THEMES.gold;
// ---------- 调色板（背景色变化）：docs/effect-library.md「调色板」 ----------
// VIBE_FILM({palette:'paper'}) 整片换底色；VIBE_FILM({palettes:[{at:'shot:xx'|秒,p:'sea',tr:'fade'|'iris'|'wipe',d:.5}]}) 或 rhythm.json sections[].palette 按段换。
// 字、粒子、连线、节点、框都读 THEME；浅底(light:true) 时发光叠加从 lighter 换成正常叠加，字自动变深色。默认 gold 跟以前逐像素一样。
const PAL_BASE={acc:'#f2c46d',line:'#e8b75a',line2:'#ffb86b',node2:'#ff9f5a',plate:'#07080c',box:'#1c2333',boxOn:'#3a2a0f',boxStroke:'#5a6a88',boxOff:'#222a',dim:'#888',dimText:'#8e8e8e',dimLine:'#3a3a3a',
  flapBg:'#1b1b1b',flapLine:'#000',flapText:'#f4f0e6',label:'#fff',ink:'#16110c',amb:'#fff3d6',vig:'rgba(0,0,0,.82)',flash:'255,240,200',shadow:'rgba(255,240,220,.35)',pt:'255,200,110',light:false};
Object.keys(THEMES).forEach(k=>THEMES[k]=Object.assign({},PAL_BASE,THEMES[k]));
const PALETTES={
  gold:THEMES.gold,
  paper:Object.assign({},PAL_BASE,{zh:'米纸',light:true,bgStops:['#f3ead6','#eadfc5','#ddcda9'],bg:'#eadfc5',hi:'#7a4a14',mid:'#6a3d0c',lo:'#4a2a06',rgb:'122,74,20',glow:'122,74,20',text:'#2a1f14',
    bloom:'255,250,235',cool:'190,160,110',dust:'110,80,40',acc:'#764610',line:'#86561e',line2:'#a8662a',node2:'#b0542a',plate:'#f4ecda',box:'#f6efdf',boxOn:'#f1d9a8',boxStroke:'#a08a66',boxOff:'#e6dcc6',dim:'#8a7d68',dimText:'#6e6250',dimLine:'#c2b393',
    flapBg:'#2a2118',flapLine:'#efe6d2',flapText:'#f6efe0',label:'#2a1f14',ink:'#2a1f14',amb:'#8a6a3a',vig:'rgba(110,80,40,.30)',flash:'255,255,250',shadow:'rgba(255,255,255,.6)'}),
  sea:Object.assign({},PAL_BASE,{dimText:'#9db4cc',boxOff:'#0a1d30',dimLine:'#2c4a68',ptCol:'205,236,255',ptR:1.45,zh:'深海蓝',bgStops:['#03101c','#062038','#0b2f4d'],bg:'#062038',hi:'#eaf7ff',mid:'#7cc8ff',lo:'#5aa2dc',rgb:'124,200,255',glow:'120,200,255',text:'#eaf4ff',
    bloom:'40,110,170',cool:'10,60,90',dust:'160,220,255',acc:'#7cc8ff',line:'#5fb4ff',line2:'#8fd4ff',node2:'#4fd2c8',boxOn:'#0e3552',box:'#0c1f33',amb:'#cfeaff'}),
  forest:Object.assign({},PAL_BASE,{dimText:'#a2bb9f',boxOff:'#0e2219',dimLine:'#2f4c3a',ptCol:'220,255,195',ptR:1.6,zh:'墨绿',bgStops:['#04100b','#0a2219','#123326'],bg:'#0a2219',hi:'#f2ffe9',mid:'#a6dc84',lo:'#74b45a',rgb:'166,220,132',glow:'150,220,120',text:'#eef6ee',
    bloom:'50,110,60',cool:'20,50,40',dust:'190,240,170',acc:'#a6dc84',line:'#8fd06f',line2:'#c4e88a',node2:'#e6c86a',boxOn:'#1d3a1a',box:'#10261c',amb:'#e2ffd8'}),
  wine:Object.assign({},PAL_BASE,{dimText:'#c9a5ab',boxOff:'#2a0a12',dimLine:'#552a36',ptCol:'255,218,195',ptR:1.45,zh:'酒红',bgStops:['#160407','#2c0811','#3f0d18'],bg:'#2c0811',hi:'#fff1e4',mid:'#f2b07e',lo:'#d6785a',rgb:'242,176,126',glow:'255,170,120',text:'#fbeeee',
    bloom:'130,30,50',cool:'60,10,30',dust:'255,196,170',acc:'#f2b07e',line:'#e89a72',line2:'#f6c08e',node2:'#ff8a7a',boxOn:'#4a1a12',box:'#2a0c14',amb:'#ffe2d6'}),
  mist:Object.assign({},PAL_BASE,{zh:'雾白',light:true,bgStops:['#f5f6f7','#e9ecef','#d9dee4'],bg:'#e9ecef',hi:'#2d4d70',mid:'#24425f',lo:'#142a40',rgb:'45,77,112',glow:'45,77,112',text:'#1b222b',
    bloom:'255,255,255',cool:'170,185,205',dust:'70,95,125',acc:'#2f5a86',line:'#4a6d93',line2:'#5a7ea6',node2:'#c0603a',plate:'#f3f5f7',box:'#f7f8fa',boxOn:'#d7e4f2',boxStroke:'#8a9bb0',boxOff:'#e3e7ec',dim:'#7d8794',dimText:'#5e6874',dimLine:'#b8c2ce',
    flapBg:'#1f2731',flapLine:'#e9ecef',flapText:'#f5f7fa',label:'#1b222b',ink:'#1b222b',amb:'#5a6f88',vig:'rgba(90,105,125,.28)',flash:'255,255,255',shadow:'rgba(255,255,255,.7)'}),
  sunset:Object.assign({},PAL_BASE,{dimText:'#cdb0cd',boxOff:'#2a1636',dimLine:'#563260',ptCol:'255,224,180',ptR:1.45,zh:'日落',bgStops:['#160d2e','#3a1846','#62203e','#742c26'],bg:'#3a1846',hi:'#fff4dc',mid:'#ffc27a',lo:'#ffb070',rgb:'255,194,122',glow:'255,170,100',text:'#fff6ea',
    bloom:'255,120,80',cool:'80,40,120',dust:'255,200,150',acc:'#ffc27a',line:'#ffb070',line2:'#ffd08a',node2:'#ff8a6a',boxOn:'#5a2a1a',box:'#2a1636',amb:'#ffe0c4'}),
};
Object.keys(PALETTES).forEach(k=>{if(k!=='gold')PALETTES[k].pt=PALETTES[k].rgb});Object.assign(THEMES,PALETTES);
const pBlend=()=>THEME.light?'source-over':'lighter',pAcc=()=>THEME.acc,pLine=()=>THEME.line,pText=()=>THEME.text;
function _mixC(a,b,k){if(a===b||k<=0)return a;if(k>=1)return b;
  const hx=c=>/^#[0-9a-f]{6}$/i.test(c)?[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)):null,tr=c=>/^\d+,\d+,\d+$/.test(c)?c.split(',').map(Number):null;
  let A=hx(a),B=hx(b);if(A&&B)return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*k).toString(16).padStart(2,'0')).join('');
  A=tr(a);B=tr(b);if(A&&B)return A.map((v,i)=>Math.round(v+(B[i]-v)*k)).join(',');return k<.5?a:b}
function mixTheme(a,b,k){const o={};for(const key of new Set([...Object.keys(a),...Object.keys(b)])){const x=a[key],y=b[key];
  if(key==='bgStops'){const sa=x||[a.bg,a.bg],sb=y||[b.bg,b.bg],n=Math.max(sa.length,sb.length),at=(s,i)=>s[Math.round(i*(s.length-1)/(n-1))];o[key]=[...Array(n)].map((_,i)=>_mixC(at(sa,i),at(sb,i),k))}
  else o[key]=(typeof x==='string'&&typeof y==='string')?_mixC(x,y,k):(k<.5?x:y)}return o}
let PAL_TL=null;   // [{t, th, tr, d}] 按时间排好
function palAt(t){if(!PAL_TL)return{th:THEME};let i=-1;PAL_TL.forEach((p,j)=>{if(t>=p.t)i=j});if(i<0)return{th:PAL_TL[0].th};
  const p=PAL_TL[i],prev=i>0?PAL_TL[i-1].th:p.th,k=i>0?eio(Math.min(1,(t-p.t)/p.d)):1;
  return k>=1?{th:p.th}:{th:mixTheme(prev,p.th,p.tr==='fade'?k:(k<.5?0:1)),prev,next:p.th,k,tr:p.tr}}
function background(t,warm=0){const s=palAt(t);
  if(s.tr&&s.tr!=='fade'){THEME=s.prev;bgPaint(t,warm);g.save();g.beginPath();
    if(s.tr==='iris')g.arc(CX,960,s.k*1300,0,7);else g.rect(0,0,W*s.k,H);g.clip();THEME=s.next;bgPaint(t,warm);g.restore()}
  else{THEME=s.th;bgPaint(t,warm)}
  THEME=s.th}
function goldGrad(y,size){const gr=g.createLinearGradient(0,y-size*.9,0,y+size*.2);gr.addColorStop(0,THEME.hi);gr.addColorStop(.45,THEME.mid);gr.addColorStop(1,THEME.lo);return gr}
const acc=(a=1)=>`rgba(${THEME.rgb},${a})`;
function txt(s,x,y,o={}){const size=o.size||64;g.save();g.globalAlpha*=o.a==null?1:o.a;
  g.font=`${o.w||700} ${size}px ${SERIF}`;g.textAlign=o.align||'center';g.textBaseline='alphabetic';
  if(o.ls)g.letterSpacing=o.ls+'px';
  const fill=o.gold?goldGrad(y,size):(o.color||THEME.text);
  if(o.glow){g.shadowColor=o.gold?`rgba(${THEME.glow},${THEME.light?.3:.55})`:(THEME.shadow||'rgba(255,240,220,.35)');g.shadowBlur=o.glow}
  g.fillStyle=fill;g.fillText(s,x,y);
  if(o.glow){g.shadowBlur=0;g.fillText(s,x,y)}
  if(TXLOG)logText(s,x,y,size,o.align||'center',o.gold?THEME.mid:(o.color||THEME.text));
  g.restore();}
// 读字时间检查（engine/readcheck.py）用：TEXTS(t) 重画第 t 秒，返回这一帧每段字的文字、透明度和屏幕框。
// 只记录 txt()/rise()/slam() 等走 txt() 画出来的字；不影响成片画面。
let TXLOG=null;
function logText(s,x,y,size,align,col){const w=g.measureText(s).width,x0=align==='center'?x-w/2:(align==='right'||align==='end'?x-w:x);
  const m=g.getTransform(),pts=[[x0,y-size*.85],[x0+w,y-size*.85],[x0,y+size*.2],[x0+w,y+size*.2]].map(([px,py])=>[m.a*px+m.c*py+m.e,m.b*px+m.d*py+m.f]);
  const xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]);
  TXLOG.push({text:String(s),col:typeof col==='string'?col:null,a:+g.globalAlpha.toFixed(3),x0:Math.min(...xs),y0:Math.min(...ys),x1:Math.max(...xs),y1:Math.max(...ys)})}
function logShape(kind,pts){if(!TXLOG||!pts.length)return;const m=g.getTransform();TXLOG.push({kind,a:+g.globalAlpha.toFixed(3),pts:pts.map(([px,py])=>[m.a*px+m.c*py+m.e,m.b*px+m.d*py+m.f])})}
window.TEXTS=function(t){TXLOG=[];try{window.draw(t);return TXLOG}finally{TXLOG=null}};
// 对比度检查（layoutcheck.py CONTRAST）：画第 t 秒，对每段字取字色（txt 记录的 color / 金字取 mid）和字框里像素亮度的中位数（字框里多数像素是底），算 WCAG 对比度。
function _rgbOf(c){c=String(c).trim();let m;if(c[0]==='#'){const h=c.length<=5?c.slice(1,4).split('').map(x=>x+x).join(''):c.slice(1,7);return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16))}
  if((m=c.match(/rgba?\(([^)]+)\)/)))return m[1].split(',').slice(0,3).map(Number);return null}
const _lum=([r,g2,b])=>{const f=v=>(v/=255)<=.03928?v/12.92:((v+.055)/1.055)**2.4;return .2126*f(r)+.7152*f(g2)+.0722*f(b)};
window.CONTRAST=function(t){const L=window.TEXTS(t),out=[],cv=document.getElementById('c'),cx=cv.getContext('2d');
  for(const it of L){if(it.kind||!it.col||it.a<.5||!String(it.text).trim())continue;const rgb=_rgbOf(it.col);if(!rgb)continue;
    const x0=Math.max(0,Math.floor(it.x0)),y0=Math.max(0,Math.floor(it.y0)),w=Math.min(W,Math.ceil(it.x1))-x0,h=Math.min(H,Math.ceil(it.y1))-y0;if(w<4||h<4)continue;
    const d=cx.getImageData(x0,y0,w,h).data,ls=[];for(let i=0;i<d.length;i+=16)ls.push(_lum([d[i],d[i+1],d[i+2]]));ls.sort((a,b)=>a-b);
    const lt=_lum(rgb),lb=ls[Math.floor(ls.length/2)],c=(Math.max(lt,lb)+.05)/(Math.min(lt,lb)+.05);out.push({text:it.text,c:+c.toFixed(2)})}
  return out};
function measure(s,size,w=700){g.save();g.font=`${w} ${size}px ${SERIF}`;const m=g.measureText(s).width;g.restore();return m}
// 上浮入场：透明度 + 位移
// rise：默认 0.15 秒弹入（2026-10-30 起，原 0.6 秒太慢，观众在等字）
function rise(s,x,y,t,t0,o={},dur=.15){const k=eo(ramp(t,t0,t0+dur));if(k<=0)return;txt(s,x,y+(1-k)*14,Object.assign({},o,{a:(o.a==null?1:o.a)*k}))}
function strike(x1,x2,y,k,a=1){if(k<=0)return;g.save();g.globalAlpha*=a;g.strokeStyle=THEME.mid;g.lineWidth=6;g.beginPath();g.moveTo(x1,y);g.lineTo(lerp(x1,x2,eo(k)),y);g.stroke();g.restore()}
const fmt=n=>Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
// ---------- 背景层：暗金光斑、顶光、视差金尘 ----------
function bgPaint(t,warm=0){
  if(THEME.bgStops){const lg=g.createLinearGradient(0,0,0,H);THEME.bgStops.forEach((c,i,a)=>lg.addColorStop(i/(a.length-1),c));g.fillStyle=lg}else g.fillStyle=THEME.bg;g.fillRect(0,0,W,H);
  const px=CX+Math.sin(t*.13)*160, py=760+Math.cos(t*.09)*120;
  let gr=g.createRadialGradient(px,py,0,px,py,900);gr.addColorStop(0,`rgba(${THEME.bloom},${.32+warm*.25})`);gr.addColorStop(.5,`rgba(${THEME.bloom},.08)`);gr.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  gr=g.createRadialGradient(200,1500,0,200,1500,700);gr.addColorStop(0,`rgba(${THEME.cool},.25)`);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);
  g.save();g.globalCompositeOperation=pBlend();
  for(let i=0;i<5;i++){const a=-.35+i*.17+Math.sin(t*.2+i)*.03;g.save();g.translate(CX+(i-2)*90,-200);g.rotate(a);
    const rg=g.createLinearGradient(0,0,0,1700);rg.addColorStop(0,`rgba(${THEME.dust},${.05+.02*Math.sin(t*.7+i*2)})`);rg.addColorStop(1,`rgba(${THEME.dust},0)`);
    g.fillStyle=rg;g.fillRect(-40-i*6,0,80+i*12,1700);g.restore()}
  g.restore();
  g.save();g.globalCompositeOperation=pBlend();
  for(const d of dust){const y=((d.y- t*22*d.v*d.z)%H+H)%H, x=d.x+Math.sin(t*.5*d.v+d.s)*18*d.z;
    const tw=.5+.5*Math.sin(t*2*d.v+d.s);g.fillStyle=`rgba(${THEME.dust},${(.12+.5*tw)*d.z})`;g.beginPath();g.arc(x,y,1+2.2*d.z,0,6.283);g.fill()}
  g.restore();
}
// ---------- 前景 + 后期：大光斑、暗角、按帧号选的颗粒 ----------
function post(t){
  g.save();g.globalCompositeOperation=pBlend();
  for(const d of fgDust){const y=((d.y-t*40)%(H+200)+H+200)%(H+200)-100,x=d.x+Math.sin(t*.3+d.s)*40;
    const gr=g.createRadialGradient(x,y,0,x,y,d.r);gr.addColorStop(0,`rgba(${THEME.dust},.10)`);gr.addColorStop(1,`rgba(${THEME.dust},0)`);g.fillStyle=gr;g.fillRect(x-d.r,y-d.r,d.r*2,d.r*2)}
  g.restore();
  const vg=g.createRadialGradient(CX,900,350,CX,960,1250);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,THEME.vig||'rgba(0,0,0,.82)');g.fillStyle=vg;g.fillRect(0,0,W,H);
  const f=Math.floor(t*30),tile=grain[f%6];g.save();g.globalAlpha=.07;g.globalCompositeOperation='overlay';
  const ox=(f*97)%256,oy=(f*57)%256;g.translate(-ox,-oy);g.fillStyle=g.createPattern(tile,'repeat');g.fillRect(0,0,W+256,H+256);g.restore();
}
// 顶部常驻钩子标题（第 1 帧起就在，位于抖音顶部 tab 栏下方）。
function hookLine(text){
  // 钩子太长会出画：量一下，超过 960px 就缩字号（最小 42）
  g.save();g.font=`700 58px ${SERIF}`;const tw=g.measureText(text).width;g.restore();const hs=Math.max(42,Math.min(58,Math.floor(58*960/Math.max(1,tw))));
  // 钩子底板（2026-11-02）：3D 场景和亮底上钩子对比度掉到 1–2:1，垫一条柔边底板，保证 ≥4.5:1
  {const c=THEME.light?'250,247,240':'14,8,10',gr=g.createLinearGradient(0,262-hs*1.5,0,262+hs*.9);gr.addColorStop(0,`rgba(${c},0)`);gr.addColorStop(.3,`rgba(${c},.82)`);gr.addColorStop(.7,`rgba(${c},.82)`);gr.addColorStop(1,`rgba(${c},0)`);g.fillStyle=gr;g.fillRect(0,262-hs*1.5,W,hs*2.4)}
  txt(text,CX,262,{size:hs,w:700,color:THEME.text,glow:14});
  const gw=360;const gr=g.createLinearGradient(CX-gw,0,CX+gw,0);gr.addColorStop(0,acc(0));gr.addColorStop(.5,acc(.9));gr.addColorStop(1,acc(0));
  g.fillStyle=gr;g.fillRect(CX-gw,292,gw*2,2);
}
// ---------- 节奏表助手（来自 rhythm.json，render.py 注入 window.RHYTHM） ----------
// M('q1') 命名时间点；HIT('reveal1') 高潮时刻；SHOT('curve') 镜头 {a,b,in}；BEAT(n) 第 n 拍的秒数（含变速）。
const RH=()=>window.RHYTHM||null;
// 贴纸：preload 用 STICKER(src)（在 VIBE_FILM 之前、顶层调用），画用 sticker(img,x,y,t,t0,{w,rot,a})。
// 0.2 秒缩放弹入 + 轻微旋转；白描边和投影画在 PNG 里或由这里补投影。t0 必须是 HIT/M 取到的揭示点。
const IMGS=[];
function STICKER(src){const im=new Image();IMGS.push(new Promise(r=>{im.onload=r;im.onerror=()=>{console.error('贴纸加载失败 '+src);r()}}));im.src=src;return im}
function sticker(im,x,y,t,t0,o={}){if(t<t0||!im.complete||!im.naturalWidth)return;const k=t-t0,w=o.w||360,h=w*im.naturalHeight/im.naturalWidth;
  const sc=k<.2?eo(k/.2)*1.12:1+.12*Math.exp(-(k-.2)*14)*Math.cos((k-.2)*30);const rot=(o.rot==null?-6:o.rot)*Math.PI/180;
  g.save();g.globalAlpha*=(o.a==null?1:o.a);g.translate(x,y);g.rotate(rot);g.scale(sc,sc);
  g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=18;g.shadowOffsetY=8;g.drawImage(im,-w/2,-h/2,w,h);g.restore()}
function M(id){const r=RH();if(!r)throw new Error('没有 rhythm.json');if(id in r.marks)return r.marks[id];return HIT(id)}
function HIT(id){const r=RH();const h=id==='main'?r.hits.find(h=>h.main):r.hits.find(h=>h.id===id);if(!h)throw new Error('rhythm.json 里没有 hit '+id);return h.t}
function SHOT(id){const s=RH().shots.find(s=>s.id===id);if(!s)throw new Error('rhythm.json 里没有镜头 '+id);return s}
function BEAT(n){const b=RH().beats;if(n<=0)return 0;const i=Math.floor(n),f=n-i;if(i+1>=b.length)return b[b.length-1];return lerp(b[i],b[i+1],f)}
// ---------- 高潮：每个 hit 一种手法 ----------
// slam：提前 pre 秒收暗 → 最后 freeze 帧静止 → 下拍砸字 + 闪光 + 冲击环 + 抖动（主高潮专用最合适）
// snap：不收暗，直接硬切到答案 + 短闪 + 轻抖（快节奏揭晓）
// drop：提前 pre 秒压到几乎全黑，下拍亮起 + 长辉光，无冲击环（安静的顿悟）
// 一支片不要全用 slam；rhythm.json 的 hits[].type 决定。
let CLX=[];
function freezeT(t){for(const h of CLX){const f=(h.freeze||0)/30;if(f>0&&t>=h.t-f&&t<h.t)return h.t-f}return t}
function slam(s,x,y,t,D,o={}){if(t<D)return;const k=t-D;const sc=1+0.45*Math.exp(-k*7)*Math.cos(k*16);
  g.save();g.translate(x,y);g.scale(sc,sc);txt(s,0,0,Object.assign({gold:true,glow:40+60*Math.exp(-k*4)},o));g.restore()}
function shake(t){let dx=0,dy=0;for(const h of CLX){const k=t-h.t;const amp=h.type==='slam'?18:h.type==='snap'?8:0;if(amp&&k>=0&&k<.35){const e=Math.exp(-k*12)*amp;dx+=Math.sin(k*91)*e;dy+=Math.cos(k*77)*e}}return[dx,dy]}
function climaxFX(t){for(const h of CLX){const D=h.t,f=(h.freeze||0)/30;
  if(h.type!=='snap'&&t>=D-h.pre&&t<D){const peak=h.type==='drop'?.86:.62;g.fillStyle=`rgba(0,0,0,${peak*eio(ramp(t,D-h.pre,D-Math.max(f,1/30)))})`;g.fillRect(0,0,W,H)}
  const k=t-D;
  if(h.type==='slam'&&k>=0&&k<.9){g.save();g.globalCompositeOperation=pBlend();
    g.fillStyle=`rgba(${THEME.glow},${.42*Math.exp(-k*9)})`;g.fillRect(0,0,W,H);
    const r=80+k*1500;g.strokeStyle=`rgba(${THEME.dust},${.7*(1-k/.9)})`;g.lineWidth=10*(1-k/.9)+1;g.beginPath();g.arc(CX,960,r,0,6.283);g.stroke();
    for(let i=0;i<24;i++){const an=i*0.2618+D,L=r*.9;g.strokeStyle=`rgba(${THEME.dust},${.35*(1-k/.9)})`;g.lineWidth=2;g.beginPath();g.moveTo(CX+Math.cos(an)*L*.6,960+Math.sin(an)*L*.6);g.lineTo(CX+Math.cos(an)*L,960+Math.sin(an)*L);g.stroke()}
    g.restore()}
  if(h.type==='snap'&&k>=0&&k<.3){g.save();g.globalCompositeOperation=pBlend();g.fillStyle=`rgba(${THEME.glow},${.3*Math.exp(-k*14)})`;g.fillRect(0,0,W,H);g.restore()}
  if(h.type==='drop'&&k>=0&&k<1.6){g.save();g.globalCompositeOperation=pBlend();const rg=g.createRadialGradient(CX,960,0,CX,960,900);rg.addColorStop(0,`rgba(${THEME.glow},${.28*Math.exp(-k*2.2)})`);rg.addColorStop(1,`rgba(${THEME.glow},0)`);g.fillStyle=rg;g.fillRect(0,0,W,H);g.restore()}
}}
// ---------- 镜头运动（scene.cam(t,lt) 返回 {x,y,z}：镜头对准的点和放大倍数） ----------
const CAM={
  still:(x=CX,y=960,z=1)=>({x,y,z}),
  // 局部放大：t0→t1 从全景推到 (x,y) 放大 z 倍
  zoomIn:(t,t0,t1,x,y,z=2,from={x:CX,y:960,z:1})=>{const k=eio(ramp(t,t0,t1));return{x:lerp(from.x,x,k),y:lerp(from.y,y,k),z:lerp(from.z,z,k)}},
  // 拉远揭示：从 (x,y) 放大 z 倍拉回全景
  pullBack:(t,t0,t1,x,y,z=2.5,to={x:CX,y:960,z:1})=>{const k=eio(ramp(t,t0,t1));return{x:lerp(x,to.x,k),y:lerp(y,to.y,k),z:lerp(z,to.z,k)}},
  // 跟随对象：path(t)→{x,y}，镜头带一点滞后（lag 秒）
  follow:(t,path,z=1.6,lag=.25)=>{const p=path(t-lag);return{x:p.x,y:p.y,z}},
};
function applyCam(c){if(!c)return;g.translate(CX,960);g.scale(c.z||1,c.z||1);g.translate(-(c.x==null?CX:c.x),-(c.y==null?960:c.y))}
// ---------- 转场 ----------
// rhythm.json 里每个镜头的 "in"：
//  cut   硬切（默认）。重要揭晓一律硬切。
//  match 动作衔接：出镜头最后半拍沿 dir 方向推走，入镜头沿同方向接住（运动矢量连续，不黑不淡）。
//  carry 对象延续：入镜头的 carry:{draw(t,x,y,s,k),from:[x,y,s],to:[x,y,s]} 在交界后 carry 秒内从 from 飞到 to，
//        出镜头最后一帧把同一个对象画在 from，入镜头在 lt<carry 时别画它（用 carrying(lt) 判断）。
//  fade  交叉淡化（opt-in，写 fade 时长）。两边同时画、透明度相加 = 1，不会出现两边都归零的空白。
const DIRV={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0],in:[0,0]};
let CUR_SHOT=null;
function carrying(lt){return !!(CUR_SHOT&&CUR_SHOT.in==='carry'&&lt<CUR_SHOT.carry)}
function bindScenes(scenes){
  const r=RH();
  return scenes.map((s,i)=>{const o=Object.assign({},s);
    if(s.id&&r){const sh=r.shots.find(x=>x.id===s.id);if(!sh)throw new Error('scene id '+s.id+' 不在 rhythm.json 的 shots 里');Object.assign(o,{a:sh.a,b:sh.b,shot:sh})}
    else o.shot={id:s.id||('s'+i),a:s.a,b:s.b,in:(s.fi>0?'fade':'cut'),fade:s.fi||0};
    if(o.a==null||o.b==null)throw new Error('scene '+i+' 没有时间：写 id（对上 rhythm.json）或 a/b');
    return o});
}
function drawScene(s,t,alpha,camExtra){
  if(alpha<=0)return;const lt=t-s.a;CUR_SHOT=s.shot;
  g.save();g.globalAlpha*=alpha;
  if(camExtra){g.translate(CX,960);g.scale(camExtra.z,camExtra.z);g.translate(-CX+camExtra.dx,-960+camExtra.dy)}
  if(s.cam)applyCam(s.cam(t,lt));
  else if(AMBIENT&&s.ambient!==false&&s.shot.ambient!==false){const L=Math.max(1,s.b-s.a),k=Math.min(1,Math.max(0,lt/L)),z=1+.045*k;g.translate(CX,960);g.scale(z,z);g.translate(-CX+10*Math.sin(t*.37),-960+8*Math.cos(t*.29))}
  // 旧写法兼容：显式 fi/fo>0 才淡
  const legacy=vis(t,s.a,s.b+1e-6,s.fi||0,s.fo||0);g.globalAlpha*=legacy>0?legacy:1;
  s.draw(t,lt);g.restore();
  if(s.shot.in==='carry'&&s.carry&&lt>=0&&lt<s.shot.carry){const k=eio(lt/s.shot.carry),A=s.carry.from,B=s.carry.to;
    g.save();s.carry.draw(t,lerp(A[0],B[0],k),lerp(A[1],B[1],k),lerp(A[2]||1,B[2]||1,k),k);g.restore()}
  CUR_SHOT=null;
}
function drawShots(S,t,dur){
  // 找当前镜头：a<=t<b；最后一个镜头挂到片尾
  let i=S.findIndex((s,j)=>t>=s.a&&(t<s.b||j===S.length-1));
  if(i<0){i=S.length-1;if(t<S[0].a)return}
  const s=S[i],nx=S[i+1];
  // 交叉淡化：本镜头开头或下一镜头开头的 fade 窗口（以交界为中心）
  if(s.shot.in==='fade'&&i>0&&t<s.a+s.shot.fade/2){const d=s.shot.fade,k=eio(ramp(t,s.a-d/2,s.a+d/2));drawScene(S[i-1],t,1-k);drawScene(s,t,k);return}
  if(nx&&nx.shot.in==='fade'&&t>=nx.a-nx.shot.fade/2){const d=nx.shot.fade,k=eio(ramp(t,nx.a-d/2,nx.a+d/2));drawScene(s,t,1-k);drawScene(nx,t,k);return}
  // 动作衔接：出镜头最后 m/2 沿 dir 推走 + 微放大；入镜头前 m 秒从反方向接住，速度连续
  let ce=null;
  if(nx&&nx.shot.in==='match'&&t>=nx.a-nx.shot.match/2){const m=nx.shot.match/2,k=ramp(t,nx.a-m,nx.a),v=DIRV[nx.shot.dir||'up']||[0,-1];const e=k*k;ce={z:1+.07*e,dx:-v[0]*160*e,dy:-v[1]*160*e}}
  if(s.shot.in==='match'&&t<s.a+s.shot.match){const m=s.shot.match,k=1-eo(ramp(t,s.a,s.a+m)),v=DIRV[s.shot.dir||'up']||[0,-1];ce={z:1+.07*k,dx:v[0]*160*k,dy:v[1]*160*k}}
  drawScene(s,t,1,ce);
}
// ---------- 装配一支片 ----------
// cfg = { scenes:[{id:'rhythm.json 里的镜头 id', draw(t,lt), cam?(t,lt), carry?}], hook:'顶部钩子',
//         theme?:'gold'|'ice'|'jade'|'ember'|'violet'|{...}, seed, warm?:t=>0..1, cover?:()=>{}, cover43?:()=>{}, fontText?,
//         duration?/climaxes?（只在没有 rhythm.json 的旧片里用） }
// ---------- 环境底层动效（默认开；cfg.ambient:false 全片关，镜头 ambient:false 单镜关） ----------
// 规则见 docs/playbook.md §3.5：每一帧都要有轻微底层运动；没写 cam 的镜头自动慢推 + 漂移，全片叠一层漂浮微粒。
let AMBIENT=true,AMB_P=null;
function ambientDust(t){if(!AMB_P){AMB_P=[];let r=7;const R=()=>(r=(r*16807)%2147483647)/2147483647;for(let i=0;i<46;i++)AMB_P.push([R()*W,R()*H,1+R()*2.2,.15+R()*.35,R()*6.28])}
  g.save();g.globalCompositeOperation=pBlend();for(const[x0,y0,sz,sp,ph]of AMB_P){const y=((y0-t*sp*40)%H+H)%H,x=x0+18*Math.sin(t*sp+ph);g.globalAlpha=.10+.08*Math.sin(t*1.3+ph);g.fillStyle=THEME.amb||'#fff3d6';g.beginPath();g.arc(x,y,sz,0,6.283);g.fill()}g.restore()}
function VIBE_FILM(cfg){
  AMBIENT=cfg.ambient!==false;
  const r=RH();
  THEME=typeof cfg.theme==='string'?THEMES[cfg.theme]:Object.assign({},THEMES.gold,cfg.theme||{});
  if(cfg.palette)THEME=typeof cfg.palette==='string'?PALETTES[cfg.palette]:Object.assign({},PAL_BASE,cfg.palette);
  {const sec=x=>typeof x==='number'?x:(String(x).startsWith('shot:')&&r?r.shots.find(q=>q.id===String(x).slice(5)).a:parseFloat(x));
   const L=cfg.palettes||(r&&r.sections&&r.sections.some(q=>q.palette)?r.sections.filter(q=>q.palette).map(q=>({at:q.t,p:q.palette,tr:q.tr,d:q.d})):null);
   PAL_TL=L?L.map(q=>({t:sec(q.at),th:typeof q.p==='string'?PALETTES[q.p]:Object.assign({},PAL_BASE,q.p),tr:q.tr||'fade',d:q.d||.45})).sort((a,b)=>a.t-b.t):null;
   if(PAL_TL)THEME=PAL_TL[0].th}
  initAssets(cfg.seed||1);
  CLX=r?r.hits.map(h=>Object.assign({},h)):(cfg.climaxes||[]).map(D=>({t:D,type:'slam',pre:.75,freeze:3}));
  window.DURATION=r?r.duration:cfg.duration;
  const S=bindScenes(cfg.scenes);
  window.SHOTS=S.map(s=>({id:s.shot.id,a:s.a,b:s.b,in:s.shot.in}));
  window.draw=function(t0){
    if(c.width!==W||c.height!==H){c.width=W;c.height=H}
    const t=freezeT(t0);
    g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';
    background(t,cfg.warm?cfg.warm(t):0);
    const [dx,dy]=shake(t);
    const zoom=1+.02*Math.sin(t*.25);g.save();g.translate(CX+dx,960+dy);g.scale(zoom,zoom);g.translate(-CX,-960);
    drawShots(S,t,window.DURATION);
    g.restore();
    if(AMBIENT&&!(CUR_SHOT&&CUR_SHOT.ambient===false))ambientDust(t);
    climaxFX(t);
    if(cfg.hook)hookLine(cfg.hook);
    post(t);
  };
  window.drawCover=function(){c.width=W;c.height=1440;g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';if(cfg.cover)cfg.cover();};
  // 4:3 横封面 1440×1080（抖音要竖横两张）。cover43 里自己排版：画布比竖版宽，W/H/CX 这些常量仍是竖版的。
  if(cfg.cover43)window.drawCover43=function(){c.width=1440;c.height=1080;g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';cfg.cover43();};
  const ft=cfg.fontText||'知识';
  window.ready=Promise.all(IMGS).then(()=>document.fonts.load(`700 80px ${SERIF}`,ft).then(()=>document.fonts.load(`400 80px ${SERIF}`,ft)).then(()=>{window.draw(0);return true}));
}
