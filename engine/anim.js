// anim.js — 富动效组件（2D，画在 vibe.js 的画布 g 上）。必须在 vibe.js 之后加载。全部只依赖 t，确定性。
// 粒子聚形、图表生长变形的做法参考 motion-graphics-skills prompts/effects.md #05 #16：
//   MIT License, Copyright (c) 2026 Charlie Hills — https://github.com/charlie947/motion-graphics-skills
// ── 缓动与插值（自写）
const A_clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
// 过冲缓动：三次多项式 f(u)=1+(c+1)(u-1)^3+c(u-1)^2，结尾冲过 1 再回落
function backE(t,c=1.8){const u=A_clamp(t)-1,u2=u*u;return 1+(c+1)*u2*u+c*u2}
// 回弹缓动：欠阻尼振子 1-e^(-ζωt)·cos(ω_d t)，ω_d=ω√(1-ζ²)·1.6
function springE(t,w=7,zeta=.35){if(t<0)t=0;const decay=Math.exp(-zeta*w*t),wd=w*Math.sqrt(1-zeta*zeta)*1.6;return 1-decay*Math.cos(wd*t)}
// 保单调的分段三次 Hermite 插值（Fritsch–Carlson 切线限制），keys=[[x,y],...] x 递增
function monotone(keys){
  const X=keys.map(k=>k[0]),Y=keys.map(k=>k[1]),N=X.length;
  if(N<2)return()=>Y[0];
  const slope=[];for(let i=0;i+1<N;i++)slope[i]=(Y[i+1]-Y[i])/(X[i+1]-X[i]);
  const tan=new Array(N);tan[0]=slope[0];tan[N-1]=slope[N-2];
  for(let i=1;i<N-1;i++)tan[i]=(slope[i-1]>0)===(slope[i]>0)&&slope[i-1]!==0&&slope[i]!==0?(slope[i-1]+slope[i])*.5:0;
  for(let i=0;i+1<N;i++){
    if(slope[i]===0){tan[i]=0;tan[i+1]=0;continue}
    const al=tan[i]/slope[i],be=tan[i+1]/slope[i],r=Math.hypot(al,be);
    if(r>3){tan[i]=3*al/r*slope[i];tan[i+1]=3*be/r*slope[i]}
  }
  return x=>{
    if(x<=X[0])return Y[0];if(x>=X[N-1])return Y[N-1];
    let lo=0,hi=N-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(X[mid]<=x)lo=mid;else hi=mid}
    const h=X[hi]-X[lo],s=(x-X[lo])/h,s2=s*s,s3=s2*s;
    const h00=2*s3-3*s2+1,h10=s3-2*s2+s,h01=3*s2-2*s3,h11=s3-s2;
    return h00*Y[lo]+h10*h*tan[lo]+h01*Y[hi]+h11*h*tan[hi]}}
// 多维关键帧轨迹：keys=[[t,[a,b,c]],...] → t=>[a,b,c]
function track(keys){const comps=keys[0][1].map((_,j)=>monotone(keys.map(k=>[k[0],k[1][j]])));return t=>comps.map(f=>f(t))}

// ── 曲线运镜：splineCam([[lt,[x,y,z]],...]) → 给场景的 cam:(t,lt)=>…  用法 cam:SPLINECAM([[0,[540,960,1]],[2,[600,900,1.3]]])
function SPLINECAM(keys){const f=track(keys);return(t,lt)=>{const[x,y,z]=f(lt);return{x,y,z}}}

// ── 取样：把文字或 Path2D 变成点阵（离屏画布，结果缓存）
const _PTS={};
function shapePoints(key,drawFn,step=7,w=W,h=H){if(_PTS[key])return _PTS[key];const o=document.createElement('canvas');o.width=w;o.height=h;const og=o.getContext('2d');
  og.fillStyle='#fff';drawFn(og);const d=og.getImageData(0,0,w,h).data,p=[];for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step)if(d[(y*w+x)*4+3]>128)p.push([x,y]);
  return _PTS[key]=p}
function textPoints(s,x,y,size,step=6,w=900){return shapePoints('T'+s+x+y+size+step,og=>{og.font=`${w} ${size}px ${SERIF}`;og.textAlign='center';og.textBaseline='middle';og.fillText(s,x,y)},step)}

// ── 两组点一一配对：matchPts(A,B) → [[a,b],…]，数量取两者较大值，索引按比例铺开（不是 i%len），保证两组点都用全。
// 以前 q=B[i%B.length] 在 A 比 B 少时只用到 B 的前半（文字点按行从上往下存）→ 字只剩上半截。
window.PTWARN=window.PTWARN||[];
function ptsBBox(P){let y0=1e9,y1=-1e9,x0=1e9,x1=-1e9;for(const p of P){if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1];if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0]}return[x0,y0,x1,y1]}
function matchPts(A,B,key=''){const n=Math.max(A.length,B.length),out=[];for(let i=0;i<n;i++)out.push([A[Math.floor(i*A.length/n)],B[Math.floor(i*B.length/n)]]);
  const bb=ptsBBox(B),ub=ptsBBox(out.map(q=>q[1]));if(B.length&&(ub[3]-ub[1])<.8*(bb[3]-bb[1])&&!PTWARN.includes(key))PTWARN.push(key);return out}
// ── 粒子聚形：particleForm(pts, t, t0, {dur, scatter, r, color, out}) 从散开状态沿弧线飞入组成图形；out=散开时刻（可选）
function particleForm(pts,t,t0,o={}){const dur=o.dur||1.2,R=mulberry32(o.seed||9),r=(o.r||2.6)*(THEME.ptR||1);g.save();g.globalCompositeOperation=pBlend();
  g.fillStyle=o.color||`rgba(${THEME.ptCol||THEME.glow},.9)`;
  for(let i=0;i<pts.length;i++){const[px,py]=pts[i];const sx=R()*W,sy=R()*H,del=R()*.35*dur,cv=(R()-.5)*600;
    let k=springE(A_clamp((t-t0-del)/(dur*.8))*1.4,6,.5);if(t<t0+del)k=0;
    if(o.out!=null&&t>o.out){const q=A_clamp((t-o.out-del*.5)/(dur*.7));k=1-q*q}
    const x=lerp(sx,px,k)+Math.sin(k*Math.PI)*cv,y=lerp(sy,py,k);g.globalAlpha=.25+.75*A_clamp(k);
    g.fillRect(x-r/2,y-r/2,r,r)}
  g.restore()}

// ── 图表：chartGrow(vals, t, t0, {x,y,w,h,morph,labels,fmt}) 柱子 spring 长出；morph 时刻起柱子变细并连成穿过顶端的折线。数值不改。
function chartGrow(vals,t,t0,o={}){const x0=o.x||140,y0=o.y||1400,w=o.w||800,h=o.h||600,n=vals.length,mx=o.max||Math.max(...vals),bw=w/n*.62;
  const m=o.morph!=null?eio(A_clamp((t-o.morph)/.8)):0;g.save();
  g.strokeStyle=THEME.light?'rgba(42,31,20,.3)':'rgba(243,236,224,.25)';g.lineWidth=2;g.beginPath();g.moveTo(x0,y0);g.lineTo(x0+w,y0);g.stroke();
  const tops=[];
  for(let i=0;i<n;i++){const k=springE(A_clamp((t-t0-i*.12)/.9)*1.3,7,.4);if(t<t0+i*.12)continue;const cx=x0+(i+.5)*w/n,bh=vals[i]/mx*h*k,bwi=lerp(bw,6,m);
    g.globalAlpha=1-m*.6;g.fillStyle=goldGrad(y0-bh,bh||1);g.fillRect(cx-bwi/2,y0-bh,bwi,bh);tops.push([cx,y0-bh]);
    g.globalAlpha=1;if(o.labels)txt(o.labels[i],cx,y0+44,{size:30,w:400,color:THEME.light?'rgba(42,31,20,.75)':'rgba(243,236,224,.7)'});
    if(k>.6)txt((o.fmt||(v=>v))(vals[i]),cx,y0-bh-24,{size:34,a:A_clamp((k-.6)/.4)})}
  if(m>0&&tops.length>1){g.globalAlpha=1;g.strokeStyle=`rgba(${THEME.glow},1)`;g.lineWidth=8;g.shadowColor=`rgba(${THEME.glow},.8)`;g.shadowBlur=20;
    const L=tops.length-1,upto=m*L;g.beginPath();g.moveTo(...tops[0]);for(let i=1;i<=L;i++){if(i<=upto)g.lineTo(...tops[i]);else{const f=upto-(i-1);if(f>0)g.lineTo(lerp(tops[i-1][0],tops[i][0],f),lerp(tops[i-1][1],tops[i][1],f));break}}g.stroke()}
  g.restore()}

// ── 文字动效 1：逐字散开/聚合 charAssemble(s,x,y,t,t0,{size,gold,dur,out,spread,scatter})
// 防撞（2026-10-31）：字不再从各自的随机方向飞回来（随机方向会在半路交叉，layoutcheck 每支片都报 TEXT×TEXT「智 / 家」）。
// 改成整行以中心「放大 → 收回」：水平位置用整行同一个进度 kx，字与字的间距只会比成品大、不会比成品小，飞行中不会互相压；
// 每个字只错开透明度、小幅上下浮动和小角度旋转（浮动 ≤ 0.6 字高，不会撞到上下行）。旧的随机散开要用就传 {scatter:'random'}。
function charAssemble(s,x,y,t,t0,o={}){if(t<t0)return;
  // 读字检查按整句登记（不按单字），透明度取最后一个字；单字本身不登记
  if(typeof TXLOG!=='undefined'&&TXLOG){const L=TXLOG;TXLOG=null;try{_charAssemble(s,x,y,t,t0,o)}finally{TXLOG=L}
    const n=[...s].length,del=(n-1)*.035,dur=o.dur||.5;let k=t<t0+del?0:springE(A_clamp((t-t0-del)/dur)*1.2,8,.45);if(o.out!=null&&t>o.out)k=1-eo(A_clamp((t-o.out-del)/.35));
    const size=o.size||80;g.save();g.globalAlpha*=A_clamp(k*1.5)*(o.a==null?1:o.a);g.font=`${o.w||900} ${size}px ${SERIF}`;logText(s,x,y,size,'center',o.gold?THEME.mid:(o.color||THEME.text));g.restore();return}
  _charAssemble(s,x,y,t,t0,o)}
function _charAssemble(s,x,y,t,t0,o={}){const size=o.size||80,ch=[...s],R=mulberry32(o.seed||s.length*31),dur=o.dur||.5,sp=o.spread||260;
  g.save();g.font=`${o.w||900} ${size}px ${SERIF}`;const ws=ch.map(c=>g.measureText(c).width),tot=ws.reduce((a,b)=>a+b,0);g.restore();
  const outQ=del=>o.out!=null&&t>o.out?eo(A_clamp((t-o.out-del)/.35)):0;
  if(o.scatter==='random'){let cx=x-tot/2;for(let i=0;i<ch.length;i++){const dx=(R()-.5)*sp*2,dy=(R()-.5)*sp,rot=(R()-.5)*1.4,del=i*.035;
    let k=springE(A_clamp((t-t0-del)/dur)*1.2,8,.45);if(t<t0+del)k=0;if(o.out!=null&&t>o.out)k=1-outQ(del);
    g.save();g.translate(cx+ws[i]/2+dx*(1-k),y+dy*(1-k));g.rotate(rot*(1-k));txt(ch[i],0,0,Object.assign({},o,{size,a:A_clamp(k*1.5)}));g.restore();cx+=ws[i]}return}
  // 放大倍数：最外侧的字起飞时离槽位约 spread px；至少 0.8 倍字距，保证小角度旋转时包围框也碰不到
  // 但整行放大后最外侧不出画面安全区（中心 ±500px）；行越宽放得越少，旋转角跟着放大倍数缩，保证包围框不碰
  const fan=Math.max(.2,Math.min(2.5,Math.max(.8,sp/Math.max(1,tot/2)),1000/Math.max(1,tot)-1)),rotA=Math.min(.5,.9*fan*Math.min(1,Math.min(...ws)/size));
  let kx=Math.min(1,springE(A_clamp((t-t0)/dur)*1.2,8,.45));if(o.out!=null&&t>o.out)kx=1-outQ(0);
  const amp=Math.min(sp,size*1.2);let cx=x-tot/2;
  for(let i=0;i<ch.length;i++){const dy=(R()-.5)*amp,rot=(R()-.5)*rotA,del=i*.035,mid=cx+ws[i]/2;
    let k=springE(A_clamp((t-t0-del)/dur)*1.2,8,.45);if(t<t0+del)k=0;if(o.out!=null&&t>o.out)k=1-outQ(del);
    const kc=Math.min(1,k),px=mid+(mid-x)*fan*(1-kx),py=y+dy*(1-kc);
    g.save();g.translate(px,py);g.rotate(rot*(1-Math.max(kc,kx)));txt(ch[i],0,0,Object.assign({},o,{size,a:A_clamp(k*1.5)}));g.restore();cx+=ws[i]}}

// ── 文字动效 2：遮罩揭示 maskReveal(s,x,y,t,t0,{size,dir:'up'|'left',dur}) 字从一条线后面滑出
function maskReveal(s,x,y,t,t0,o={}){if(t<t0)return;const size=o.size||80,k=eo(A_clamp((t-t0)/(o.dur||.35)));const wd=measure(s,size,o.w||700)+40;
  g.save();g.beginPath();g.rect(x-wd/2,y-size*1.05,wd,size*1.35);g.clip();
  if(o.dir==='left'){txt(s,x-(1-k)*wd,y,o)}else txt(s,x,y+(1-k)*size*1.3,o);g.restore();
  g.save();g.fillStyle=`rgba(${THEME.glow},${.9*(1-k)})`;g.fillRect(x-wd/2,y+size*.3,wd*Math.min(1,k*3),4);g.restore()}

// ── 物体变形转场：morphShape(A,B,k,{fill,glow}) A/B 为点阵多边形（同点数，用 resample 统一）。k 0→1
function resample(poly,n=96){const L=[0];for(let i=1;i<=poly.length;i++){const a=poly[i-1],b=poly[i%poly.length];L.push(L[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]))}
  const tot=L[L.length-1],out=[];let j=0;for(let i=0;i<n;i++){const d=i/n*tot;while(L[j+1]<d)j++;const a=poly[j],b=poly[(j+1)%poly.length],f=(d-L[j])/(L[j+1]-L[j]||1);out.push([lerp(a[0],b[0],f),lerp(a[1],b[1],f)])}return out}
function polyCircle(cx,cy,r,n=96){const p=[];for(let i=0;i<n;i++){const a=i/n*6.2832-Math.PI/2;p.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r])}return p}
function polyRect(cx,cy,w,h){return resample([[cx-w/2,cy-h/2],[cx+w/2,cy-h/2],[cx+w/2,cy+h/2],[cx-w/2,cy+h/2]])}
function morphShape(A,B,k,o={}){const e=eio(A_clamp(k));g.save();g.beginPath();for(let i=0;i<A.length;i++){const x=lerp(A[i][0],B[i][0],e),y=lerp(A[i][1],B[i][1],e);i?g.lineTo(x,y):g.moveTo(x,y)}g.closePath();
  g.fillStyle=o.fill||goldGrad(960,400);g.shadowColor=`rgba(${THEME.glow},.7)`;g.shadowBlur=o.glow||30;g.fill();g.restore()}

// ── 视差层：parallax(layers, t, cam) layers=[{depth:0..1, draw(dx,dy)}]，depth 越大越近、位移越多。cam={x,y} 相对中心的偏移
function parallax(layers,t,cam){for(const L of layers){const dx=-(cam.x||0)*L.depth,dy=-(cam.y||0)*L.depth;g.save();g.translate(dx,dy);const s=1+(cam.z?(cam.z-1)*L.depth:0);
  g.translate(CX,960);g.scale(s,s);g.translate(-CX,-960);L.draw(dx,dy);g.restore()}}
