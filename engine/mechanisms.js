// vibe-video · 机制组件：把「道理」演成会动的结构，而不是一行字。
// 在 vibe.js 之后加载：<script src="../../engine/mechanisms.js"></script>
// 每个组件都是纯函数：MECH.xxx(k, opts)，k = 0→1 的进度（自己用 ramp(lt,a,b) 算），同一个 k 永远画出同一帧（确定性）。
// 返回值给镜头用：比如 compound 返回曲线尖端 {x,y}，可以直接喂给 CAM.follow。
const MECH=(()=>{
  const line=(pts,w=5,col=THEME.mid,a=1)=>{if(pts.length<2)return;g.save();g.globalAlpha*=a;g.strokeStyle=col;g.lineWidth=w;g.lineJoin='round';g.lineCap='round';
    g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(const p of pts)g.lineTo(p[0],p[1]);g.stroke();g.restore()};
  const dot=(x,y,r,a=1)=>{g.save();g.globalAlpha*=a;g.fillStyle=THEME.hi;g.shadowColor=`rgba(${THEME.glow},.9)`;g.shadowBlur=r*1.6;g.beginPath();g.arc(x,y,r,0,6.283);g.fill();g.restore()};
  const arrow=(x,y,ang,s=18,a=1)=>{g.save();g.globalAlpha*=a;g.translate(x,y);g.rotate(ang);g.fillStyle=THEME.mid;g.beginPath();g.moveTo(s,0);g.lineTo(-s*.7,s*.6);g.lineTo(-s*.7,-s*.6);g.closePath();g.fill();g.restore()};
  const hash=i=>{let x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)};
  const dim='rgba(243,236,224,.35)';

  // 复利：指数曲线 vs 直线。k 控制画到第几年。返回尖端位置。
  // opts: x,y = 坐标原点（左下）, w,h, rate=0.2, years=30, linear=true, labels=true
  function compound(k,o={}){const x0=o.x??170,y0=o.y??1400,w=o.w??700,h=o.h??760,r=o.rate??.2,Y=o.years??30;
    const maxV=Math.pow(1+r,Y),n=Math.max(2,Math.round(120*clamp(k)));
    line([[x0,y0],[x0+w+20,y0]],3,dim);line([[x0,y0],[x0,y0-h-20]],3,dim);
    const P=(yr,v)=>[x0+w*yr/Y,y0-h*(v-1)/(maxV-1)];
    if(o.linear!==false){const L=[];for(let i=0;i<=n;i++){const yr=Y*clamp(k)*i/n;L.push(P(yr,1+r*yr*1))}line(L,4,dim)}
    const C=[];for(let i=0;i<=n;i++){const yr=Y*clamp(k)*i/n;C.push(P(yr,Math.pow(1+r,yr)))}
    line(C,7);const tip=C[C.length-1];dot(tip[0],tip[1],14);
    if(o.labels!==false){const yr=Y*clamp(k);txt(`第 ${Math.round(yr)} 年`,x0+w/2,y0+80,{size:40,w:400,color:dim});
      txt('×'+fmt(Math.pow(1+r,yr)),clamp(tip[0],x0+90,x0+w-60),tip[1]-50,{size:56,gold:true})}
    return {x:tip[0],y:tip[1]}}

  // 杠杆：跷跷板。长臂一端一个小重物，短臂一端一个大方块。k=0 水平，k=1 大方块被抬起。
  // opts: x,y = 支点, len=760, ratio=3（长臂:短臂）, small='1', big='10'
  function leverage(k,o={}){const x=o.x??CX,y=o.y??1150,L=o.len??760,ra=o.ratio??3;
    const short=L/(1+ra),long=L-short,ang=-0.32*eio(k);   // 负角 = 长臂下沉
    g.save();g.fillStyle=THEME.lo;g.beginPath();g.moveTo(x,y);g.lineTo(x-50,y+90);g.lineTo(x+50,y+90);g.closePath();g.fill();g.restore();
    // A 端（左，短臂，大方块）向上，B 端（右，长臂，小重物）向下
    const Aa=[x-Math.cos(ang)*short,y+Math.sin(ang)*short],Bb=[x+Math.cos(ang)*long,y-Math.sin(ang)*long];
    line([Aa,Bb],10);
    g.save();g.translate(Aa[0],Aa[1]);g.rotate(-ang);g.fillStyle=`rgba(${THEME.rgb},.25)`;g.strokeStyle=THEME.mid;g.lineWidth=4;g.fillRect(-80,-165,160,160);g.strokeRect(-80,-165,160,160);g.restore();
    txt(o.big??'10',Aa[0],Aa[1]-60,{size:64,gold:true});
    dot(Bb[0],Bb[1]-34,30);txt(o.small??'1',Bb[0],Bb[1]-90,{size:48});
    return {x,y,a:{x:Aa[0],y:Aa[1]},b:{x:Bb[0],y:Bb[1]}}}

  // 漏斗 / 筛选：N 个粒子从上方落下，只有 keep 比例穿过瓶颈，其余被弹到两边。k 控制落下多少。返回通过数。
  // opts: x,y = 漏斗口中心, w=640, h=520, n=60, keep=0.1
  function funnel(k,o={}){const x=o.x??CX,y=o.y??760,w=o.w??640,h=o.h??520,N=o.n??60,keep=o.keep??.1,neck=34;
    line([[x-w/2,y],[x-neck,y+h],[x-neck,y+h+90]],6);line([[x+w/2,y],[x+neck,y+h],[x+neck,y+h+90]],6);
    let passed=0;const span=.75;   // 每个粒子的飞行占 k 的 0.25
    for(let i=0;i<N;i++){const s=i/N*span,p=clamp((k-s)/(1-span));if(p<=0)continue;
      const pass=hash(i)<keep,sx=x+(hash(i+99)-.5)*w*.85;let px,py,a=1;
      if(pass){if(p>=1)passed++;px=lerp(sx,x,eio(clamp(p*1.4)));py=lerp(y-260,y+h+260,p);}
      else{const hit=.55;if(p<hit){px=sx;py=lerp(y-260,y+h*.35,p/hit)}else{const q=(p-hit)/(1-hit),side=sx<x?-1:1;px=sx+side*q*260;py=y+h*.35-Math.sin(q*3.14)*120+q*q*400;a=1-q}}
      g.save();g.globalAlpha*=a;g.fillStyle=pass?THEME.hi:dim;if(pass){g.shadowColor=`rgba(${THEME.glow},.9)`;g.shadowBlur=18}
      g.beginPath();g.arc(px,py,pass?13:10,0,6.283);g.fill();g.restore()}
    txt(`${passed} / ${N}`,x,y+h+200,{size:72,gold:true});
    return passed}

  // 消耗：一格能量（容器）被持续抽走，漏下的水滴。k=0 满，k=1 见底。返回剩余比例。
  // opts: x,y = 容器中心, w=360, h=620, drain=1（1 = 正好抽空）, label
  function depletion(k,o={}){const x=o.x??CX,y=o.y??1000,w=o.w??360,h=o.h??620,lv=clamp(1-(o.drain??1)*k);
    g.save();g.strokeStyle=THEME.mid;g.lineWidth=6;g.strokeRect(x-w/2,y-h/2,w,h);
    const top=y+h/2-h*lv;const gr=g.createLinearGradient(0,top,0,y+h/2);gr.addColorStop(0,`rgba(${THEME.glow},.85)`);gr.addColorStop(1,`rgba(${THEME.rgb},.35)`);
    g.fillStyle=gr;g.fillRect(x-w/2+8,top,w-16,y+h/2-top-8);g.restore();
    if(lv>0)for(let i=0;i<6;i++){const ph=(k*9+i/6)%1;dot(x,y+h/2+20+ph*260,8,1-ph)}
    txt(Math.round(lv*100)+'%',x,y-h/2-50,{size:72,gold:lv>.2,color:lv>.2?undefined:'rgba(243,236,224,.6)'});
    if(o.label)txt(o.label,x,y+h/2+340,{size:44,w:400});
    return lv}

  // 反馈回路：几个节点围成一圈，箭头首尾相接，一个光点沿圈跑；每跑一圈强度 ×gain（>1 越滚越大，<1 越来越弱）。
  // opts: x,y,r=300, nodes=['A','B','C'], laps=3, gain=1.5。k=0→1 跑完 laps 圈。返回光点位置。
  function loop(k,o={}){const x=o.x??CX,y=o.y??1000,r=o.r??300,N=o.nodes||['投入','结果','信心'],laps=o.laps??3,gn=o.gain??1.5;
    const ph=clamp(k)*laps,lap=Math.floor(Math.min(ph,laps-1e-6)),s=Math.pow(gn,ph);
    const ang=i=>-Math.PI/2+i*2*Math.PI/N.length;
    for(let i=0;i<N.length;i++){const a0=ang(i)+.32,a1=ang(i+1)-.32,P=[];for(let j=0;j<=24;j++){const a=lerp(a0,a1,j/24);P.push([x+Math.cos(a)*r,y+Math.sin(a)*r])}
      line(P,5,THEME.mid,.75);arrow(x+Math.cos(a1)*r,y+Math.sin(a1)*r,a1+Math.PI/2,18)}
    for(let i=0;i<N.length;i++){const a=ang(i);txt(N[i],x+Math.cos(a)*r,y+Math.sin(a)*r+18,{size:52,gold:true})}
    const pa=-Math.PI/2+ph*2*Math.PI,px=x+Math.cos(pa)*r,py=y+Math.sin(pa)*r;
    dot(px,py,clamp(10*Math.sqrt(s),8,40));
    txt(`第 ${lap+1} 圈 ×${s.toFixed(1)}`,x,y+18,{size:48,w:400,color:dim});
    return {x:px,y:py,scale:s}}

  return {compound,leverage,funnel,depletion,loop};
})();
