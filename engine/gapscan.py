#!/usr/bin/env python3
"""真看画面的「没变化」扫描（2026-10-30 加；QA 的变化密度只数 rhythm.json 里的 mark，数不出弱 mark）。
用法：python3 engine/gapscan.py out/latest/final-upload.mp4 [--max 2.0] [--thr 10] [--lag 4] [--events]
每帧和 4 帧前比，按 60×60（1080p 等价）方块算平均亮度差，最大的方块超过 thr 才算「有变化」；
底噪（金尘、颗粒、环境漂移）达不到阈值。thr 10 和 16 各跑一遍，都没有 >2.0s 的段才算过。
"""
import sys, subprocess, numpy as np, argparse
ap=argparse.ArgumentParser(); ap.add_argument('video'); ap.add_argument('--max',type=float,default=2.0)
ap.add_argument('--thr',type=float,default=10); ap.add_argument('--lag',type=int,default=4); ap.add_argument('--events',action='store_true')
a=ap.parse_args()
Wd,Hd=180,320
raw=subprocess.run(['ffmpeg','-loglevel','error','-i',a.video,'-vf',f'scale={Wd}:{Hd}:flags=area,format=gray','-f','rawvideo','-'],capture_output=True).stdout
F=np.frombuffer(raw,np.uint8).reshape(-1,Hd,Wd).astype(np.float32)
n=len(F); B=10  # block 10px at 180 wide = 60px at 1080
ev=[]
score=np.zeros(n)
for i in range(a.lag,n):
    d=np.abs(F[i]-F[i-a.lag])[:Hd//B*B,:Wd//B*B].reshape(Hd//B,B,Wd//B,B).mean(axis=(1,3))
    score[i]=d.max()
evt=[i/30 for i in range(n) if score[i]>a.thr]
# merge
gaps=[];prev=0.0
for t in evt+[n/30]:
    if t-prev>a.max: gaps.append((prev,t))
    prev=t
print(f'frames {n} dur {n/30:.2f}s, event frames {len(evt)}, gaps>{a.max}s: {len(gaps)}')
for g0,g1 in gaps: print(f'  {g0:7.2f} -> {g1:7.2f}  ({g1-g0:.2f}s)')
if gaps: print('max gap', max(g1-g0 for g0,g1 in gaps))
if a.events:
    for i in range(0,n,15): print(f'{i/30:6.1f} {score[i]:.1f}')
