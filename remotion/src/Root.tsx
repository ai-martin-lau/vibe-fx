import React from 'react';
import {AbsoluteFill, Composition, Img, Series, staticFile} from 'remotion';
import {Stage, txt, T} from './look';
import * as X from './effects/text';
import * as N from './effects/numbers';
import * as Cm from './effects/camera';
import * as I from './effects/image';
import * as R from './effects/tree';
import * as Ci from './effects/cinema';

const SceneA = () => <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}><div style={txt(120, 900)}>你以为</div></AbsoluteFill>;
const SceneB = () => <AbsoluteFill><Img src={staticFile('img/town.jpg')} style={{width: 1080, height: 1920, objectFit: 'cover', filter: 'brightness(.6) sepia(.25)'}} />
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}><div style={txt(120, 900, {color: T.accent, textShadow: '0 10px 40px #000'})}>其实</div></AbsoluteFill></AbsoluteFill>;

// id, origin effect in the old fx.js (or "new"), component, frames
export const DEMOS: [string, string, React.FC, number][] = [
  ['Iris', 't_iris', () => <Cm.Iris a={<SceneA />} b={<SceneB />} />, 75],
  ['Whip', 't_whip', () => <Cm.Whip a={<SceneA />} b={<SceneB />} />, 60],
  ['Slam', 'k_slam', () => <X.Slam sub="这一步大多数人做反了" />, 60],
  ['Scramble', 'k_scramble', () => <X.Scramble />, 75],
  ['SplitFlap', 'k_splitFlap', () => <X.SplitFlap />, 75],
  ['Highlight', 'k_highlight', () => <X.Highlight />, 60],
  ['Typewriter', 'k_type', () => <X.Typewriter />, 120],
  ['WordLight', 'k_counterWords', () => <X.WordLight />, 75],
  ['Odometer', 'n_odometer', () => <N.Odometer />, 75],
  ['CompoundCurve', 'n_compound', () => <N.CompoundCurve />, 90],
  ['Timeline', 'n_timeline', () => <N.Timeline />, 120],
  ['ShareRing', 'n_pie', () => <N.ShareRing />, 75],
  ['Balance', 'n_scale', () => <N.Balance />, 75],
  ['RackFocus', 'c_rackFocus', () => <Cm.RackFocus />, 75],
  ['DollyZoom', 'c_dollyZoom', () => <Cm.DollyZoom />, 75],
  ['KenBurns', 'g_kenBurns', () => <Cm.KenBurns />, 90],
  ['EraMorph', 'g_eraMorph', () => <I.EraMorph />, 75],
  ['Lens', 'g_lens', () => <I.Lens />, 75],
  ['Spotlight', 'g_spotlight', () => <I.Spotlight />, 75],
  ['ParticleWord', 'm_particleText + g_img2particles', () => <I.ParticleWord />, 75],
  ['TreeGrow', 'r_treeGrow + r_mindmap', () => <R.TreeGrow />, 75],
  ['DecisionPath', 'r_decision', () => <R.DecisionPath />, 90],
  ['ContrastPair', 'new', () => <Ci.ContrastPair />, 90],
  ['ChapterCard', 'new', () => <Ci.ChapterCard />, 75],
  ['Annotate', 'new', () => <Ci.Annotate />, 75],
  ['LightSweep', 'new', () => <Ci.LightSweep />, 75],
  ['SourceCard', 'new', () => <Ci.SourceCard />, 75],
];
const Label: React.FC<{i: number; id: string}> = ({i, id}) => <div style={{position: 'absolute', left: 60, top: 1740, ...txt(30, 500, {color: T.dim, letterSpacing: 3})}}>{String(i + 1).padStart(2, '0')} · {id}</div>;
const Gallery = () => <Series>{DEMOS.map(([id, , C, d], i) => <Series.Sequence key={id} durationInFrames={d}><Stage><C /></Stage><Label i={i} id={id} /></Series.Sequence>)}</Series>;
export const Root: React.FC = () => <>
  {DEMOS.map(([id, , C, d]) => <Composition key={id} id={id} component={() => <Stage><C /></Stage>} durationInFrames={d} fps={30} width={1080} height={1920} />)}
  <Composition id="Gallery" component={Gallery} durationInFrames={DEMOS.reduce((a, x) => a + x[3], 0)} fps={30} width={1080} height={1920} />
</>;
