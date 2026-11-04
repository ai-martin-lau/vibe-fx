// Numbers. Each one answers one question: how much, how fast, which share, which way it tips.
import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {CL, Center, EIO, EO, T, ramp, txt} from '../look';

// Odometer (n_odometer): mechanical digit wheels roll to the value, rightmost spins most.
export const Odometer: React.FC<{value?: number; label?: string; unit?: string}> = ({value = 10000, label = '他做过的实验', unit = '次'}) => {
  const f = useCurrentFrame(); const digits = String(value).split(''); const H = 200;
  return <Center y={880}>
    <div style={txt(46, 500, {color: T.dim, marginBottom: 30})}>{label}</div>
    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 6}}>
      {digits.map((d, i) => {const turns = (digits.length - i) * 1; const k = ramp(f, 4, 40 + i * 3, EO); const pos = (Number(d) + turns * 10) * k;
        return <div key={i} style={{height: H, overflow: 'hidden', width: 118, WebkitMaskImage: 'linear-gradient(180deg,transparent,#000 22%,#000 78%,transparent)'}}>
          <div style={{transform: `translateY(${-(pos % 10) * H}px)`}}>{Array.from({length: 11}, (_, j) => <div key={j} style={txt(190, 900, {height: H, lineHeight: `${H}px`, color: T.text})}>{j % 10}</div>)}</div></div>;})}
      <div style={txt(70, 700, {color: T.accent, marginLeft: 14, marginBottom: 30})}>{unit}</div>
    </div></Center>;
};

// Compound curve (n_compound): an exponential curve draws on, a dot rides it, the late steepness is the point.
export const CompoundCurve: React.FC<{label?: string; end?: string}> = ({label = '前20年几乎看不见', end = '后10年翻了三倍'}) => {
  const f = useCurrentFrame(); const W = 840, Hh = 700, x0 = 120, y0 = 1300;
  const pts = Array.from({length: 61}, (_, i) => {const x = i / 60; return [x0 + x * W, y0 - (Math.pow(1.07, x * 60) - 1) / (Math.pow(1.07, 60) - 1) * Hh];});
  const d = 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L');
  const k = ramp(f, 4, 60, EIO); const {strokeDasharray, strokeDashoffset} = evolvePath(k, d); const p = pts[Math.round(k * 60)];
  return <>
    <svg width={1080} height={1920} style={{position: 'absolute'}}>
      <line x1={x0} y1={y0} x2={x0 + W} y2={y0} stroke={T.line} strokeWidth={2} />
      <path d={d} fill="none" stroke={T.accent} strokeWidth={8} strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} style={{filter: 'drop-shadow(0 0 14px rgba(242,166,64,.55))'}} />
      <circle cx={p[0]} cy={p[1]} r={16} fill={T.text} />
    </svg>
    <div style={{position: 'absolute', left: x0, top: y0 + 40, ...txt(42, 500, {color: T.dim})}}>{label}</div>
    <div style={{position: 'absolute', right: 120, top: 440, textAlign: 'right', ...txt(64, 800, {opacity: ramp(f, 50, 62)})}}>{end}</div>
  </>;
};

// Timeline (n_timeline): a rail scrubs past dated nodes; the current node is lit, the rest dim.
export const Timeline: React.FC<{items?: {y: string; t: string}[]}> = ({items = [{y: '1879', t: '第一盏灯亮了'}, {y: '1882', t: '整条街通电'}, {y: '1890', t: '城市夜里不再黑'}]}) => {
  const f = useCurrentFrame(); const {durationInFrames} = useVideoConfig(); const gap = 560;
  const pos = interpolate(f, [0, durationInFrames], [0, items.length - 1], {...CL, easing: EIO}); const off = 540 - pos * gap;
  return <>
    <div style={{position: 'absolute', left: 0, right: 0, top: 960, height: 3, background: T.line}} />
    {items.map((it, i) => {const a = Math.max(0, 1 - Math.abs(pos - i)); const x = off + i * gap;
      return <div key={i} style={{position: 'absolute', left: x - 260, width: 520, top: 760, textAlign: 'center', opacity: .3 + .7 * a}}>
        <div style={txt(120, 900, {color: a > .5 ? T.accent : T.text})}>{it.y}</div>
        <div style={{width: 26, height: 26, borderRadius: 13, background: a > .5 ? T.accent : T.text, margin: '42px auto', boxShadow: a > .5 ? '0 0 30px rgba(242,166,64,.8)' : 'none'}} />
        <div style={txt(54, 700)}>{it.t}</div></div>;})}
  </>;
};

// Share ring (n_pie): a single ring fills to the share; the number counts with it.
export const ShareRing: React.FC<{pct?: number; label?: string}> = ({pct = 68, label = '的人选了先拿到手的那个'}) => {
  const f = useCurrentFrame(); const k = ramp(f, 6, 50, EIO); const R = 300, C = 2 * Math.PI * R;
  return <>
    <svg width={1080} height={1920} style={{position: 'absolute'}}><g transform="rotate(-90 540 820)">
      <circle cx={540} cy={820} r={R} fill="none" stroke={T.line} strokeWidth={34} />
      <circle cx={540} cy={820} r={R} fill="none" stroke={T.accent} strokeWidth={34} strokeLinecap="round" strokeDasharray={`${C * pct / 100 * k} ${C}`} />
    </g></svg>
    <Center y={820}><div style={txt(200, 900)}>{Math.round(pct * k)}<span style={{fontSize: 90, color: T.accent}}>%</span></div></Center>
    <Center y={1290}><div style={txt(56, 700, {opacity: ramp(f, 40, 54)})}>{label}</div></Center>
  </>;
};

// Balance (n_scale): a beam on a post tips toward the heavier side with a damped settle. Trade-offs.
export const Balance: React.FC<{left?: string; right?: string; tilt?: number}> = ({left = '眼前的10块', right = '一年后的12块', tilt = 1}) => {
  const f = useCurrentFrame(); const k = ramp(f, 10, 40, EO); const ang = tilt * 10 * k + Math.sin(f / 4) * 1.6 * Math.exp(-Math.max(0, f - 30) / 12) * k;
  const arm = 360, cx = 540, cy = 760, rad = ang * Math.PI / 180;
  const pan = (s: number, label: string, hi: boolean) => {const x = cx + s * arm * Math.cos(rad), y = cy + s * arm * Math.sin(rad);
    return <React.Fragment key={s}>
      <div style={{position: 'absolute', left: x - 1, top: y, width: 2, height: 220, background: T.line}} />
      <div style={{position: 'absolute', left: x - 150, top: y + 220, width: 300, height: 14, borderRadius: '0 0 150px 150px / 0 0 14px 14px', background: hi ? T.accent : T.text}} />
      <div style={{position: 'absolute', left: x - 210, width: 420, top: y + 270, textAlign: 'center', ...txt(54, 800, {color: hi ? T.accent : T.text})}}>{label}</div></React.Fragment>;};
  return <>
    <div style={{position: 'absolute', left: cx - 8, top: cy, width: 16, height: 640, background: 'linear-gradient(#d8c3a0,#5a4a38)', borderRadius: 8}} />
    <div style={{position: 'absolute', left: cx - 120, top: cy + 630, width: 240, height: 14, borderRadius: 7, background: '#5a4a38'}} />
    <div style={{position: 'absolute', left: cx - arm, top: cy - 6, width: arm * 2, height: 12, borderRadius: 6, background: T.text, transform: `rotate(${ang}deg)`}} />
    <div style={{position: 'absolute', left: cx - 20, top: cy - 20, width: 40, height: 40, borderRadius: 20, background: T.accent}} />
    {pan(-1, left, tilt < 0)}{pan(1, right, tilt > 0)}
  </>;
};
