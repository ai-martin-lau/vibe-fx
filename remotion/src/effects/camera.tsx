// Transitions and camera moves. Hard, motivated moves; nothing fades out the frame.
import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {CL, EIO, EO, T, ramp, txt, Center} from '../look';

// Iris (t_iris): a soft-edged circle opens from the subject to reveal scene B.
export const Iris: React.FC<{a: React.ReactNode; b: React.ReactNode; at?: number; cx?: number; cy?: number}> = ({a, b, at = 20, cx = 540, cy = 900}) => {
  const f = useCurrentFrame(); const r = interpolate(f, [at, at + 24], [0, 1500], {...CL, easing: EIO});
  const m = `radial-gradient(circle ${r}px at ${cx}px ${cy}px, #000 ${Math.max(0, r - 30)}px, transparent ${r}px)`;
  return <><AbsoluteFill>{a}</AbsoluteFill><AbsoluteFill style={{WebkitMaskImage: m, maskImage: m}}>{b}</AbsoluteFill>
    {r > 0 && r < 1400 && <div style={{position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: '50%', boxShadow: '0 0 60px 6px rgba(255,190,120,.35)'}} />}</>;
};

// Whip pan (t_whip): A leaves sideways with real motion blur, B arrives from the other side.
export const Whip: React.FC<{a: React.ReactNode; b: React.ReactNode; at?: number}> = ({a, b, at = 30}) => {
  const f = useCurrentFrame(); const k = interpolate(f, [at - 5, at + 5], [0, 1], {...CL, easing: EIO});
  return <CameraMotionBlur shutterAngle={240} samples={6}>
    <AbsoluteFill style={{transform: `translateX(${-k * 1200}px)`}}>{a}</AbsoluteFill>
    <AbsoluteFill style={{transform: `translateX(${(1 - k) * 1200}px)`}}>{b}</AbsoluteFill>
  </CameraMotionBlur>;
};

// Rack focus (c_rackFocus): focus pulls from foreground object to the background line.
export const RackFocus: React.FC<{fg?: string; text?: string; at?: number}> = ({fg = 'img/watch.jpg', text = '时间才是成本', at = 24}) => {
  const f = useCurrentFrame(); const k = ramp(f, at, at + 18, EIO);
  return <>
    <Center y={760} style={{filter: `blur(${(1 - k) * 14}px)`, opacity: .5 + .5 * k}}><div style={txt(116, 900)}>{text}</div></Center>
    <Img src={staticFile(fg)} style={{position: 'absolute', left: 140, top: 980, width: 800, height: 800, objectFit: 'cover', borderRadius: '50%', mixBlendMode: 'lighten',
      filter: `blur(${k * 16}px) brightness(${1 - .35 * k})`, transform: `scale(${1.02 + .04 * k})`, WebkitMaskImage: 'radial-gradient(circle, #000 55%, transparent 71%)'}} />
  </>;
};

// Dolly zoom (c_dollyZoom): subject holds size while the background stretches. The "wait, what" beat.
export const DollyZoom: React.FC<{bg?: string; text?: string}> = ({bg = 'img/town.jpg', text = '原来问题不在这'}) => {
  const f = useCurrentFrame(); const {durationInFrames} = useVideoConfig(); const k = interpolate(f, [0, durationInFrames], [0, 1], {...CL, easing: EIO});
  return <>
    <Img src={staticFile(bg)} style={{position: 'absolute', inset: 0, width: 1080, height: 1920, objectFit: 'cover', transform: `scale(${1.6 - .55 * k})`, filter: `blur(${2 + k * 3}px) brightness(.5) sepia(.3)`}} />
    <Center y={900}><div style={txt(110, 900, {transform: `scale(${1 + .04 * k})`, textShadow: '0 10px 40px rgba(0,0,0,.6)'})}>{text}</div></Center>
  </>;
};

// Ken Burns (g_kenBurns): slow push + drift on a still, with a lower-third that earns its place.
export const KenBurns: React.FC<{src?: string; caption?: string; from?: [number, number, number]; to?: [number, number, number]}> = ({src = 'img/town.jpg', caption = '1850年 密西西比河边的小镇', from = [1.05, 0, 0], to = [1.22, -60, -30]}) => {
  const f = useCurrentFrame(); const {durationInFrames} = useVideoConfig(); const k = interpolate(f, [0, durationInFrames], [0, 1], CL);
  const s = from[0] + (to[0] - from[0]) * k, x = from[1] + (to[1] - from[1]) * k, y = from[2] + (to[2] - from[2]) * k;
  return <>
    <Img src={staticFile(src)} style={{position: 'absolute', inset: 0, width: 1080, height: 1920, objectFit: 'cover', transform: `translate(${x}px,${y}px) scale(${s})`, filter: 'brightness(.82) saturate(.9) sepia(.15)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 700, background: 'linear-gradient(transparent, rgba(10,6,3,.85))'}} />
    <div style={{position: 'absolute', left: 90, bottom: 360, opacity: ramp(f, 8, 22), transform: `translateY(${(1 - ramp(f, 8, 26)) * 20}px)`}}>
      <div style={{width: 60, height: 4, background: T.accent, marginBottom: 24}} /><div style={txt(56, 700)}>{caption}</div></div>
  </>;
};
