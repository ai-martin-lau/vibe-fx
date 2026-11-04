// Shared cinema look: warm graded backdrop, vignette, film grain, one amber accent, one sans font.
import React from 'react';
import {AbsoluteFill, Easing, Solid, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {whiteNoise} from '@remotion/effects/white-noise';
export const FONT = '"Noto Sans SC", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif';
export const T = {bg0: '#2a1c12', bg1: '#0e0906', text: '#f6ead6', dim: 'rgba(246,234,214,.6)', accent: '#f2a640', line: 'rgba(246,234,214,.22)'};
export const CL = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const EO = Easing.bezier(.16, 1, .3, 1);   // expo-out: fast in, long settle
export const EIO = Easing.bezier(.65, 0, .35, 1);
export const ramp = (f: number, a: number, b: number, e = EO) => interpolate(f, [a, b], [0, 1], {...CL, easing: e});
export const useSec = () => {const f = useCurrentFrame(); const {fps} = useVideoConfig(); return f / fps;};
export const txt = (size: number, weight = 800, extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: FONT, fontSize: size, fontWeight: weight, color: T.text, letterSpacing: size > 90 ? -size * .03 : 0, lineHeight: 1.15, ...extra});
export const Backdrop: React.FC = () => {
  const t = useSec();
  return <AbsoluteFill style={{background: `radial-gradient(110% 75% at ${46 + Math.sin(t * .4) * 4}% 36%, ${T.bg0} 0%, ${T.bg1} 100%)`}}>
    <AbsoluteFill style={{mixBlendMode: 'screen', background: 'radial-gradient(55% 32% at 28% 12%, rgba(255,186,110,.16), transparent 70%)'}} />
  </AbsoluteFill>;
};
export const CinemaLook: React.FC<{grain?: number}> = ({grain = .18}) => {
  const f = useCurrentFrame(); const {width, height} = useVideoConfig();
  return <>
    <AbsoluteFill style={{mixBlendMode: 'soft-light', background: 'linear-gradient(180deg, rgba(150,96,48,.3), rgba(90,52,24,.3))', pointerEvents: 'none'}} />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 92% 74% at 50% 46%, transparent 52%, rgba(8,4,2,.68) 100%)', pointerEvents: 'none'}} />
    <AbsoluteFill style={{mixBlendMode: 'overlay', opacity: grain, pointerEvents: 'none'}}>
      <Solid width={width} height={height} color="#808080" effects={[whiteNoise({seed: f % 24, amount: 1})]} />
    </AbsoluteFill>
  </>;
};
// Stage = backdrop + content + look. Every demo uses it so the library reads as one family.
export const Stage: React.FC<{children: React.ReactNode; bare?: boolean}> = ({children, bare}) =>
  <AbsoluteFill style={{background: T.bg1, overflow: 'hidden'}}>{!bare && <Backdrop />}{children}<CinemaLook /></AbsoluteFill>;
export const Center: React.FC<{y?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({y = 900, children, style}) =>
  <div style={{position: 'absolute', left: 60, right: 60, top: y, transform: 'translateY(-50%)', textAlign: 'center', ...style}}>{children}</div>;
