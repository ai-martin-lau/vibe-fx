"""机制组件演示 · 配乐与音效。时间全部来自同目录 rhythm.json。"""
from vibe_audio import *

R = film(__file__)
mus, drm = score(R)
sfx = z()
transitions(sfx, R)
climax_hits(sfx, R)
add(sfx, boom(), 0, 0.8); add(sfx, ding(88), 0.05, 0.5)
add(sfx, ding(83), R.shot('funnel')['a'] + 4.6, .35)      # 漏斗落完
add(sfx, ding(76), R.shot('depletion')['a'] + 4.4, .35)   # 见底
finish(mus, drm, sfx, out_path(__file__))
