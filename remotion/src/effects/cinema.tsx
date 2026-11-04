// New in the Remotion edition: cinema-style effects for one-point knowledge shorts.
import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {CL, EIO, EO, T, ramp, txt, Center} from '../look';

// Contrast pair: the same thing, two numbers. Two 3D-lit bars rise; the gap gets a bracket and a ratio.
export const ContrastPair: React.FC<{a?: number; b?: number; la?: string; lb?: string; unit?: string}> = ({a = 9.6, b = 3.2, la = '每天走一万步', lb = '每天走三千步', unit = ''}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const max = Math.max(a, b), H = 760, base = 1360;
  const bar = (v: number, x: number, label: string, i: number, hi: boolean) => {const k = spring({frame: f - 6 - i * 8, fps, config: {damping: 18, stiffness: 90}}); const h = H * v / max * k;
    return <React.Fragment key={i}>
      <div style={{position: 'absolute', left: x, width: 260, top: base - h, height: h, borderRadius: '14px 14px 4px 4px', background: hi ? `linear-gradient(90deg,#b8742a,${T.accent} 45%,#ffd08a 60%,#c27e30)` : 'linear-gradient(90deg,#4a3c2e,#7a6a58 50%,#3e3226)',
        boxShadow: hi ? '0 0 60px rgba(242,166,64,.35)' : 'none'}} />
      <div style={{position: 'absolute', left: x - 40, width: 340, top: base - h - 150, textAlign: 'center', ...txt(110, 900, {color: hi ? T.accent : T.text, opacity: k})}}>{unit}{(v * k).toFixed(1)}</div>
      <div style={{position: 'absolute', left: x - 70, width: 400, top: base + 36, textAlign: 'center', ...txt(46, 600, {color: T.dim})}}>{label}</div>
    </React.Fragment>;};
  const g = ramp(f, 44, 58);
  return <>
    <div style={{position: 'absolute', left: 90, right: 90, top: base, height: 3, background: T.line}} />
    {bar(a, 170, la, 0, true)}{bar(b, 650, lb, 1, false)}
    <Center y={360}><div style={txt(70, 800, {opacity: g})}>差了<span style={{color: T.accent}}>{(a / b).toFixed(1)}倍</span></div></Center>
  </>;
};

// Chapter card: letterbox bars close in, a small amber index and a tracked title. Separates acts.
export const ChapterCard: React.FC<{index?: string; title?: string; sub?: string}> = ({index = '01', title = '一盏灯', sub = '1879年 新泽西'}) => {
  const f = useCurrentFrame(); const k = ramp(f, 0, 18, EIO);
  return <>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 360 * k, background: '#000'}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 360 * k, background: '#000'}} />
    <Center y={900}>
      <div style={txt(40, 600, {color: T.accent, letterSpacing: 12, opacity: ramp(f, 8, 20)})}>{index}</div>
      <div style={txt(124, 900, {letterSpacing: interpolate(ramp(f, 10, 50), [0, 1], [30, 4]), opacity: ramp(f, 10, 24), marginTop: 24})}>{title}</div>
      <div style={{width: 120 * ramp(f, 20, 40), height: 3, background: T.accent, margin: '36px auto'}} />
      <div style={txt(42, 400, {color: T.dim, opacity: ramp(f, 26, 40)})}>{sub}</div>
    </Center>
  </>;
};

// Annotate: a pen-drawn ellipse and an arrow mark one region of a photo, then a short note lands.
export const Annotate: React.FC<{src?: string; cx?: number; cy?: number; rx?: number; ry?: number; note?: string}> = ({src = 'img/bill.jpg', cx = 700, cy = 760, rx = 220, ry = 140, note = '看这里'}) => {
  const f = useCurrentFrame(); const ring = `M${cx - rx} ${cy} a${rx} ${ry} -8 1 0 ${rx * 2} 0 a${rx} ${ry} -8 1 0 ${-rx * 2 + 20} -14`;
  const arrow = `M${cx - 330} ${cy + 520} Q${cx - 340} ${cy + 260} ${cx - rx * .6} ${cy + ry + 20}`;
  const e1 = evolvePath(ramp(f, 10, 30, EIO), ring), e2 = evolvePath(ramp(f, 28, 40, EIO), arrow);
  return <>
    <Img src={staticFile(src)} style={{position: 'absolute', left: 0, top: 300, width: 1080, height: 1080, objectFit: 'cover', filter: 'brightness(.85) sepia(.2)', transform: `scale(${1 + ramp(f, 0, 75) * .04})`}} />
    <svg width={1080} height={1920} style={{position: 'absolute', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.5))'}}>
      <path d={ring} fill="none" stroke={T.accent} strokeWidth={9} strokeLinecap="round" strokeDasharray={e1.strokeDasharray} strokeDashoffset={e1.strokeDashoffset} />
      <path d={arrow} fill="none" stroke={T.accent} strokeWidth={7} strokeLinecap="round" strokeDasharray={e2.strokeDasharray} strokeDashoffset={e2.strokeDashoffset} />
    </svg>
    <div style={{position: 'absolute', left: cx - 560, top: cy + 540, width: 480, textAlign: 'center', ...txt(72, 800, {opacity: ramp(f, 38, 48)})}}>{note}</div>
  </>;
};

// Light sweep: a specular band glides across a hero word, like light across embossed metal.
export const LightSweep: React.FC<{text?: string; sub?: string}> = ({text = '规则', sub = '比努力先到'}) => {
  const f = useCurrentFrame(); const x = interpolate(f, [10, 46], [-40, 140], {...CL, easing: EIO});
  return <Center y={900} style={{opacity: ramp(f, 0, 10)}}>
    <div style={txt(300, 900, {letterSpacing: -10, backgroundImage: `linear-gradient(105deg, #c9b79c 0%, #c9b79c ${x - 18}%, #fff6e2 ${x}%, ${T.accent} ${x + 6}%, #c9b79c ${x + 22}%, #c9b79c 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,.5))'})}>{text}</div>
    <div style={txt(60, 600, {color: T.dim, marginTop: 20, opacity: ramp(f, 40, 54)})}>{sub}</div>
  </Center>;
};

// Source card: a claim with its source, as a dated archival slip. Makes "this is real" visible.
export const SourceCard: React.FC<{claim?: string; source?: string; year?: string}> = ({claim = '一个人每天能做出的好决定是有限的', source = 'Sample source, Journal Name', year = '1998'}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const k = spring({frame: f - 4, fps, config: {damping: 22, stiffness: 110}});
  return <div style={{position: 'absolute', left: 110, right: 110, top: 640, padding: '70px 64px', borderRadius: 10, background: 'linear-gradient(180deg,#efe3cc,#dccaa8)', boxShadow: '0 50px 90px rgba(0,0,0,.6)',
    transform: `translateY(${(1 - k) * 120}px) rotate(${(1 - k) * -4 - .8}deg)`, opacity: Math.min(1, k * 1.5)}}>
    <div style={txt(34, 600, {color: '#7a4a1c', letterSpacing: 6})}>SOURCE · {year}</div>
    <div style={txt(68, 900, {color: '#22170c', marginTop: 30, lineHeight: 1.3})}>{claim}</div>
    <div style={{height: 2, background: 'rgba(34,23,12,.25)', margin: '40px 0 26px'}} />
    <div style={txt(38, 500, {color: '#4a3420', opacity: ramp(f, 20, 32)})}>{source}</div>
  </div>;
};
