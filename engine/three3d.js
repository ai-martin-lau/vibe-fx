// three3d.js — 3D 镜头：Three.js 场景 + 后期（景深 BokehPass、泛光 UnrealBloom、调色暗角），画进 vibe.js 的 2D 画布。
// 先加载 vendor/three.bundle.js（three.js MIT, © 2010-2024 three.js authors），再加载本文件。
// 每支片的开场和招牌镜头都让模型单独写一个 setup/update（不同几何、灯光、相机路径），不要套 demo。
// 用法：const S3=VIBE3D({setup(T,scene,cam){…返回对象表}, update(lt,obj,cam,api){…}, dof:{focus,aperture}, bloom:{strength,radius,threshold}, grade:{sat,warm,vig}});
//       场景 draw 里：S3.draw(t,lt)  // 铺满画布，之后再画 2D 字
// 相机：api.orbit(lt,{r,h,a0,a1,t0,t1,target}) / api.dolly(lt,keys) keys=[[lt,[x,y,z]],…] 用 anim.js 的 track 平滑
const GRADE_SHADER={uniforms:{tDiffuse:{value:null},sat:{value:1.1},warm:{value:.05},vig:{value:.35}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform sampler2D tDiffuse;uniform float sat,warm,vig;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);float l=dot(c.rgb,vec3(.299,.587,.114));c.rgb=mix(vec3(l),c.rgb,sat);c.rgb+=vec3(warm,warm*.4,-warm*.6);float d=distance(vUv,vec2(.5));c.rgb*=1.-vig*smoothstep(.3,.85,d);gl_FragColor=c;}'};
function VIBE3D(cfg){const T=window.THREE,X=window.THREEX;if(!T)throw new Error('先加载 engine/vendor/three.bundle.js');
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const R=new T.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true,alpha:false});R.setPixelRatio(1);R.setSize(W,H,false);
  R.toneMapping=T.ACESFilmicToneMapping;R.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene();scene.background=new T.Color(cfg.bg||0x07090c);
  const pm=new T.PMREMGenerator(R);scene.environment=pm.fromScene(new X.RoomEnvironment(),.04).texture;
  const cam=new T.PerspectiveCamera(cfg.fov||40,W/H,.1,200);cam.position.set(0,0,10);
  const obj=cfg.setup(T,scene,cam)||{};
  const C=new X.EffectComposer(R);C.setSize(W,H);C.addPass(new X.RenderPass(scene,cam));
  const d=cfg.dof||{};const bok=new X.BokehPass(scene,cam,{focus:d.focus||10,aperture:d.aperture==null?.002:d.aperture,maxblur:d.maxblur||.008});C.addPass(bok);
  const b=cfg.bloom||{};C.addPass(new X.UnrealBloomPass(new T.Vector2(W,H),b.strength==null?.8:b.strength,b.radius||.5,b.threshold==null?.6:b.threshold));
  const gp=new X.ShaderPass(GRADE_SHADER);const gr=cfg.grade||{};for(const k of['sat','warm','vig'])if(gr[k]!=null)gp.uniforms[k].value=gr[k];C.addPass(gp);C.addPass(new X.OutputPass());
  const api={T,scene,cam,bokeh:bok,
    orbit(lt,o){const k=eio(A_clamp((lt-(o.t0||0))/((o.t1||4)-(o.t0||0))));const a=lerp(o.a0||0,o.a1||1,k),tg=o.target||[0,0,0];
      cam.position.set(tg[0]+Math.sin(a)*o.r,tg[1]+(o.h||0),tg[2]+Math.cos(a)*o.r);cam.lookAt(...tg)},
    dolly(lt,keys,target=[0,0,0]){const f=api._tr&&api._tk===keys?api._tr:(api._tk=keys,api._tr=track(keys));cam.position.set(...f(lt));cam.lookAt(...target)},
    focusOn(dist){bok.uniforms.focus.value=dist}};
  return{api,obj,draw(t,lt){cfg.update(lt,obj,cam,api,t);C.render();g.drawImage(cv,0,0,W,H)}}}
