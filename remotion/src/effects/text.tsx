// Kinetic text. Restrained: one motion per line, long ease-out settle, no bounce cartoons.
import React from 'react';
import {interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CL, Center, EO, T, ramp, txt} from '../look';

// Slam (k_slam): heavy word lands from 1.35x with a short camera kick and a soft flash. Hook beat.
export const Slam: React.FC<{text?: string; sub?: string; y?: number}> = ({text = '先别划走', sub = '', y = 880}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const k = spring({frame: f, fps, config: {damping: 200, stiffness: 420, mass: .7}});
  const kick = Math.sin(f * 2.2) * 10 * Math.exp(-f / 4) * (f > 2 ? 1 : 0);
  const flash = interpolate(f, [2, 4, 12], [0, .22, 0], CL);
  return <>
    <div style={{position: 'absolute', inset: 0, background: `rgba(255,214,160,${flash})`}} />
    <Center y={y} style={{transform: `translate(${kick}px, calc(-50% + ${kick * .4}px)) scale(${1.35 - .35 * k})`, opacity: Math.min(1, f / 2)}}>
      <div style={txt(170, 900, {textShadow: '0 20px 60px rgba(0,0,0,.55)'})}>{text}</div>
      {sub && <div style={txt(48, 500, {color: T.dim, marginTop: 30, opacity: ramp(f, 10, 22)})}>{sub}</div>}
    </Center>
  </>;
};

// Scramble (k_scramble): glyphs resolve left to right from a muted cipher set. Reveal beat.
const GLYPHS = '0123456789#%&$@ABCDEFXYZ';
export const Scramble: React.FC<{text?: string; y?: number; speed?: number}> = ({text = '答案藏在第三行', y = 900, speed = 2.4}) => {
  const f = useCurrentFrame(); const chars = [...text];
  return <Center y={y}><div style={txt(110, 900)}>
    {chars.map((c, i) => {const done = f > 6 + i * speed + 6; const g = GLYPHS[Math.floor(random(`${i}-${Math.floor(f / 2)}`) * GLYPHS.length)];
      return <span key={i} style={{color: done ? T.text : T.accent, opacity: f < i * speed ? 0 : done ? 1 : .55, fontWeight: done ? 900 : 400}}>{done ? c : g}</span>;})}
  </div></Center>;
};

// Split-flap board (k_splitFlap): each cell flips through characters before landing. Year / place reveals.
export const SplitFlap: React.FC<{text?: string; label?: string; y?: number}> = ({text = '1847', label = '那一年', y = 900}) => {
  const f = useCurrentFrame(); const chars = [...text];
  return <Center y={y}>
    <div style={txt(44, 500, {color: T.dim, marginBottom: 28})}>{label}</div>
    <div style={{display: 'flex', gap: 18, justifyContent: 'center'}}>
      {chars.map((c, i) => {const land = 14 + i * 7; const flips = Math.max(0, Math.floor((land - f) / 2)); const shown = f >= land ? c : String((flips + i * 3) % 10);
        const ph = f < land ? (f % 2) / 2 : 0;
        return <div key={i} style={{width: 170, height: 240, borderRadius: 16, background: 'linear-gradient(180deg,#2c2219 0%,#2c2219 49.5%,#120d09 50.5%,#1d1611 100%)', boxShadow: '0 30px 60px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,220,180,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotateX(${ph * 70}deg)`, perspective: 600}}>
          <span style={txt(180, 900, {color: f >= land ? T.text : T.dim})}>{shown}</span></div>;})}
    </div></Center>;
};

// Highlighter (k_highlight): an amber band wipes under the key words only.
export const Highlight: React.FC<{before?: string; mark?: string; y?: number}> = ({before = '真正决定结果的是', mark = '你先做了什么', y = 900}) => {
  const f = useCurrentFrame(); const k = ramp(f, 14, 32);
  return <Center y={y} style={{opacity: ramp(f, 0, 8)}}>
    <div style={txt(76, 700, {color: T.dim, marginBottom: 34})}>{before}</div>
    <div style={{position: 'relative', display: 'inline-block', padding: '6px 28px'}}>
      <div style={{position: 'absolute', inset: 0, background: T.accent, transformOrigin: 'left', transform: `scaleX(${k}) skewX(-6deg)`, borderRadius: 8}} />
      <div style={{position: 'relative', ...txt(110, 900, {color: k > .55 ? '#1a1008' : T.text})}}>{mark}</div></div>
  </Center>;
};

// Typewriter quote (k_type): a sourced quote types in at reading speed, caret blinks, source fades last.
export const Typewriter: React.FC<{text?: string; source?: string; cps?: number}> = ({text = '我没有失败，我只是找到了一万种行不通的方法。', source = '常被归于 爱迪生', cps = 14}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const n = Math.floor(Math.max(0, f - 4) / fps * cps); const done = n >= [...text].length;
  return <div style={{position: 'absolute', left: 110, right: 110, top: 640}}>
    <div style={txt(150, 900, {color: T.accent, lineHeight: .6, opacity: .9})}>“</div>
    <div style={txt(70, 700, {lineHeight: 1.45})}>{[...text].slice(0, n).join('')}<span style={{opacity: Math.floor(f / 8) % 2 || !done ? 1 : 0, color: T.accent}}>▍</span></div>
    <div style={txt(38, 400, {color: T.dim, marginTop: 40, opacity: done ? ramp(f, 4 + [...text].length / cps * fps, 14 + [...text].length / cps * fps) : 0})}>{source}</div>
  </div>;
};

// Word light (k_counterWords): words sit dim, then light up one by one in reading rhythm.
export const WordLight: React.FC<{words?: string[]; per?: number}> = ({words = ['慢慢来', '反而', '比较快'], per = 12}) => {
  const f = useCurrentFrame();
  return <Center y={900}><div style={{display: 'flex', flexDirection: 'column', gap: 26, alignItems: 'center'}}>
    {words.map((w, i) => {const k = ramp(f, 6 + i * per, 14 + i * per); const last = i === words.length - 1;
      return <div key={i} style={txt(120, 900, {color: last && k > .5 ? T.accent : T.text, opacity: .18 + .82 * k, transform: `translateY(${(1 - k) * 14}px)`, filter: `blur(${(1 - k) * 3}px)`})}>{w}</div>;})}
  </div></Center>;
};
