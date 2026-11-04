// Structure. A tree is only worth it when the branches are the point.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {EIO, EO, T, ramp, txt} from '../look';
export type Node = {l: string; c?: Node[]};
type P = {n: Node; x: number; y: number; d: number; path: number[]; parent?: {x: number; y: number}};
const layout = (root: Node, top = 520, dy = 380): P[] => {
  const out: P[] = [];
  const leaves = (n: Node): number => n.c?.length ? n.c.reduce((a, c) => a + leaves(c), 0) : 1;
  const walk = (n: Node, d: number, x0: number, x1: number, path: number[], parent?: {x: number; y: number}) => {
    const me = {n, x: (x0 + x1) / 2, y: top + d * dy, d, path, parent}; out.push(me); let cur = x0; const tot = leaves(n);
    (n.c || []).forEach((c, i) => {const w = (x1 - x0) * leaves(c) / tot; walk(c, d + 1, cur, cur + w, [...path, i], me); cur += w;});
  };
  walk(root, 0, 60, 1020, []); return out;
};
const Tree: React.FC<{tree: Node; pick?: number[]; per?: number}> = ({tree, pick, per = 12}) => {
  const f = useCurrentFrame(); const ps = layout(tree);
  const onPath = (p: number[]) => pick ? p.every((v, i) => pick[i] === v) : true;
  const chosenAt = 10 + 3 * per;
  return <>
    <svg width={1080} height={1920} style={{position: 'absolute'}}>{ps.filter((p) => p.parent).map((p, i) => {
      const a = p.parent!; const d = `M${a.x} ${a.y + 40} C${a.x} ${(a.y + p.y) / 2} ${p.x} ${(a.y + p.y) / 2} ${p.x} ${p.y - 40}`;
      const k = ramp(f, 4 + p.d * per, 4 + p.d * per + 10, EIO); const ev = evolvePath(k, d); const hi = pick && onPath(p.path) && f > chosenAt;
      return <path key={i} d={d} fill="none" stroke={hi ? T.accent : T.line} strokeWidth={hi ? 6 : 3} strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />;})}</svg>
    {ps.map((p, i) => {const k = ramp(f, 8 + p.d * per, 16 + p.d * per, EO); const hi = pick && onPath(p.path) && f > chosenAt; const dim = pick && !onPath(p.path) && f > chosenAt;
      return <div key={i} style={{position: 'absolute', left: p.x - 260, width: 520, top: p.y - 40, textAlign: 'center', opacity: k * (dim ? .4 : 1), transform: `translateY(${(1 - k) * 16}px)`}}>
        <span style={{...txt(p.d === 0 ? 60 : 44, p.d === 0 ? 900 : 700, {color: hi ? '#1a1008' : T.text}), display: 'inline-block', padding: '12px 26px', whiteSpace: 'nowrap', borderRadius: 14,
          background: hi ? T.accent : 'rgba(246,234,214,.07)', boxShadow: hi ? '0 0 40px rgba(242,166,64,.45)' : 'inset 0 0 0 1px rgba(246,234,214,.16)'}}>{p.n.l}</span></div>;})}
  </>;
};
// Tree grow (r_treeGrow): a concept unfolds level by level.
export const TreeGrow: React.FC<{tree?: Node}> = ({tree = {l: '一个好习惯', c: [{l: '容易开始', c: [{l: '小'}, {l: '固定时间'}]}, {l: '能看见进度', c: [{l: '记录'}, {l: '反馈'}]}]}}) => <Tree tree={tree} />;
// Decision path (r_decision): all branches appear, then one path lights and the rest dim.
export const DecisionPath: React.FC<{tree?: Node; pick?: number[]}> = ({tree = {l: '已经投入一年', c: [{l: '继续', c: [{l: '越陷越深'}, {l: '侥幸做成'}]}, {l: '停下', c: [{l: '损失封顶'}, {l: '重新出发'}]}]}, pick = [1, 1]}) => <Tree tree={tree} pick={pick} />;
