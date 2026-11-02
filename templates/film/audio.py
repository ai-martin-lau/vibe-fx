"""新片骨架 · 配乐与音效事件表。时间全部来自同目录 rhythm.json（和 scene.html 读同一份）。
运行：PYTHONPATH=engine python3 <片子目录>/audio.py（engine/make.sh 会自动跑）
规矩：音效时间用 R.sec('18b') / R.hit('id')['t'] / R.shot('id')['a'] / R.marks['x'] 取，不写死秒数。"""
from vibe_audio import *

R = film(__file__)                     # 读 rhythm.json，设好时长和随机种子
mus, drm = score(R)                    # 配乐：调式/和弦/鼓型/琶音/尾声都按 rhythm.json 的 music（没写的按 seed 选）

sfx = z()
transitions(sfx, R)                    # 每个交界自动放一个落在切点上的瞬态（match 加呼啸，carry 加拖尾，fade 不加）
climax_hits(sfx, R)                    # 每个 hit 按类型：slam 收暗+riser+砸，snap 短促，drop 抽空再落；主高潮加锣
add(sfx, boom(), 0, 0.9); add(sfx, ding(84), 0.05, 0.6)            # 第 1 帧钩子
add(sfx, ding(86), R.shot('explain')['a'] + 1.2, .35)               # 关键数字出现
add(sfx, ding(81), R.shot('close')['a'] + 1.0, .3)

finish(mus, drm, sfx, out_path(__file__))
