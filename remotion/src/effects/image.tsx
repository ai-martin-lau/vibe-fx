// Image x code. The generated or archival picture carries the story; code only directs the eye.
import React from 'react';
import {AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {CL, EIO, EO, T, ramp, txt, Center} from '../look';
const cover: React.CSSProperties = {position: 'absolute', inset: 0, width: 1080, height: 1920, objectFit: 'cover'};

// Era morph (g_eraMorph): two same-framing images, a lit scanline sweeps old into new.
export const EraMorph: React.FC<{a?: string; b?: string; la?: string; lb?: string}> = ({a = 'img/phone-old.jpg', b = 'img/phone-new.jpg', la = '1925', lb = '2025'}) => {
  const f = useCurrentFrame(); const k = ramp(f, 14, 50, EIO);   const box: React.CSSProperties = {position: 'absolute', left: 90, top: 460, width: 900, height: 900, objectFit: 'cover', borderRadius: 28};
  return <>
    <Img src={staticFile(a)} style={{...box, filter: 'sepia(.6) contrast(1.05)'}} />
    <Img src={staticFile(b)} style={{...box, clipPath: `inset(0 0 ${(1 - k) * 100}% 0 round 28px)`}} />
    {k > 0 && k < 1 && <div style={{position: 'absolute', left: 60, right: 60, top: 460 + 900 * k - 2, height: 4, background: T.accent, boxShadow: '0 0 40px 8px rgba(242,166,64,.6)'}} />}
    <Center y={1500}><div style={txt(110, 900)}><span style={{opacity: 1 - k * .7}}>{la}</span><span style={{color: T.dim, margin: '0 30px', fontWeight: 400}}>→</span><span style={{color: T.accent, opacity: .3 + .7 * k}}>{lb}</span></div></Center>
  </>;
};

// Magnifier (g_lens): a lens glides to the detail and magnifies it; everything else dims.
export const Lens: React.FC<{src?: string; tx?: number; ty?: number; zoom?: number; note?: string}> = ({src = 'img/bill.jpg', tx = 560, ty = 900, zoom = 2.4, note = '角落里这行小字才是重点'}) => {
  const f = useCurrentFrame(); const k = ramp(f, 4, 34, EIO); const x = 300 + (tx - 300) * k, y = 1300 + (ty - 1300) * k, R = 230;
  const m = `radial-gradient(circle ${R}px at ${x}px ${y}px, #000 ${R - 2}px, transparent ${R}px)`;
  return <>
    <Img src={staticFile(src)} style={{...cover, filter: `brightness(${1 - .5 * k}) saturate(.8)`}} />
    <AbsoluteFill style={{WebkitMaskImage: m, maskImage: m}}><Img src={staticFile(src)} style={{...cover, transformOrigin: `${x}px ${y}px`, transform: `scale(${1 + (zoom - 1) * k})`}} /></AbsoluteFill>
    <div style={{position: 'absolute', left: x - R, top: y - R, width: R * 2, height: R * 2, borderRadius: '50%', border: '10px solid #d8c3a0', boxShadow: '0 30px 60px rgba(0,0,0,.6), inset 0 0 40px rgba(255,255,255,.2)'}} />
    <Center y={1600}><div style={txt(56, 700, {opacity: ramp(f, 30, 42)})}>{note}</div></Center>
  </>;
};

// Spotlight (g_spotlight): darkness, a beam searches, then locks on the answer.
export const Spotlight: React.FC<{src?: string; tx?: number; ty?: number; note?: string}> = ({src = 'img/diorama.jpg', tx = 600, ty = 820, note = '问题出在这里'}) => {
  const f = useCurrentFrame(); const s = ramp(f, 0, 30, EIO), lock = ramp(f, 30, 44, EO);
  const x = interpolate(s, [0, .5, 1], [260, 820, tx]) , y = interpolate(s, [0, .5, 1], [1200, 700, ty]); const R = 220 - 40 * lock;
  return <>
    <Img src={staticFile(src)} style={cover} />
    <AbsoluteFill style={{background: `radial-gradient(circle ${R}px at ${x}px ${y}px, transparent 60%, rgba(6,3,1,${.9 - .05 * lock}) 100%)`}} />
    <div style={{position: 'absolute', left: x - R - 16, top: y - R - 16, width: (R + 16) * 2, height: (R + 16) * 2, borderRadius: '50%', border: `3px solid ${T.accent}`, opacity: lock}} />
    <Center y={1480}><div style={txt(72, 800, {opacity: lock})}>{note}</div></Center>
  </>;
};

// Particle word (m_particleText / g_img2particles): drifting warm dust converges into the word.
export const ParticleWord: React.FC<{text?: string}> = ({text = '复利'}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const k = ramp(f, 0, 40, EIO); const N = 160;
  return <>
    {Array.from({length: N}, (_, i) => {const sx = random('x' + i) * 1080, sy = random('y' + i) * 1920; const tx = 540 + (random('tx' + i) - .5) * 520, ty = 900 + (random('ty' + i) - .5) * 220;
      const x = sx + (tx - sx) * k + Math.sin(f / fps * 2 + i) * 20 * (1 - k), y = sy + (ty - sy) * k; const r = 3 + random('r' + i) * 5;
      return <div key={i} style={{position: 'absolute', left: x, top: y, width: r, height: r, borderRadius: '50%', background: T.accent, opacity: (1 - ramp(f, 34, 50)) * .9, boxShadow: '0 0 10px rgba(242,166,64,.8)'}} />;})}
    <Center y={900}><div style={txt(260, 900, {opacity: ramp(f, 30, 46), filter: `blur(${(1 - ramp(f, 30, 48)) * 12}px)`, letterSpacing: -8})}>{text}</div></Center>
  </>;
};
