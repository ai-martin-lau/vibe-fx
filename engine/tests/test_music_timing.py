"""配乐时序自检：音符/鼓点是否精确跟着 rhythm.json 走（段落进入时刻、半拍变速、跨变速的高潮提前量）。
运行：python3 engine/tests/test_music_timing.py [FILM_DIR ...]   （默认测 templates/film + 内置变速用例）
通过：exit 0；任何一项偏差超过 1 帧（1/30s）：exit 1。只在内存里合成，不写文件。"""
import json, pathlib, sys, tempfile
ENG = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ENG))
import rhythm as rh, vibe_audio as va

FRAME = 1 / 30
NEED = {'lead': 1, 'bass': 2, 'snare': 3, 'hat': 3}   # 每层最低段落强度（kick 在 2 段只打小节头，3 段全开）
fails = []


def ok(cond, msg):
    print(('  ✓ ' if cond else '  ✗ ') + msg)
    if not cond: fails.append(msg)


def ref_beat_to_sec(bpm, changes, beat):
    """独立实现（不用 rhythm.py）：changes = [(拍号, bpm)] 已按拍号排序。"""
    t, b0, cur = 0.0, 0.0, bpm
    for bc, nb in changes:
        if beat <= bc: break
        t += (bc - b0) * 60 / cur; b0, cur = bc, nb
    return t + (beat - b0) * 60 / cur


def run_score(R):
    va.init(R.duration, int(R.raw.get('seed', 1))); R.audio_dur = R.duration
    va.score(R)
    return list(va.EVENTS)


def check_sections(name, R, ev):
    print(f'[{name}] {R.bpm:g} BPM，变速 {R.segs[1:] or "无"}，时长 {R.duration:.3f}s，事件 {len(ev)} 个')
    outro_t = R.music.get('outro_t', 1e9)
    # 1 每个事件的强度按它自己的时刻读，且满足该层的最低强度
    bad = [e for e in ev if e['layer'] in NEED and R.energy_at(e['t']) < NEED[e['layer']]]
    ok(not bad, f'没有音符落在强度不够的段落里（违规 {len(bad)} 个）')
    # 2 每段开始后，该段应有的层在 1 帧内进入
    for i, s in enumerate(R.sections):
        end = R.sections[i + 1]['t'] if i + 1 < len(R.sections) else R.duration
        if s['t'] >= outro_t - 1e-6 or end - s['t'] < 0.5: continue
        for layer, need in (('lead', 1), ('bass', 2)):   # 0 铺底 1 +拨弦 2 +贝斯 3 +鼓（2 段只在小节头轻踩底鼓）
            if s['energy'] < need: continue
            prev = R.energy_at(s['t'] - 1e-3) if s['t'] > 0 else -1
            if prev >= need: continue          # 上一段就有这一层，不算「进入」
            first = min((e['t'] for e in ev if e['layer'] == layer and e['t'] >= s['t'] - 1e-6), default=None)
            exp_b = R.sec_to_beat(s['t'])
            ok(first is not None and first - s['t'] <= FRAME + 1e-9,
               f'{layer} 在 {s["t"]:.3f}s（第 {exp_b:g} 拍，强度 {s["energy"]}）进入：实际 {first if first is None else round(first, 3)}s，'
               f'差 {"—" if first is None else f"{(first - s["t"]) * 1000:+.0f}ms"}')
        if s['energy'] >= 3 and R.energy_at(s['t'] - 1e-3) < 3:
            first = min((e['t'] for e in ev if e['layer'] in ('snare', 'hat') and e['t'] >= s['t'] - 1e-6), default=None)
            ok(first is not None and first - s['t'] <= R.beat_to_sec(R.sec_to_beat(s['t']) + 1) - s['t'] + 1e-9,
               f'满鼓（军鼓/踩镲）在 {s["t"]:.3f}s 段开始后一拍内进入：实际 {first if first is None else round(first, 3)}s')
    # 3 每个事件的秒数 = 独立速度表换算出的拍格点（十六分 1/4 拍；尾声三连音 1/3 拍 → 统一用 1/12 拍格），偏差 < 1ms
    if not R.music.get('swing'):
        segs = R.segs[1:]
        worst = 0.0
        for e in ev:
            b = R.sec_to_beat(e['t']); g = round(b * 12) / 12
            worst = max(worst, abs(ref_beat_to_sec(R.bpm, segs, g) - e['t']))
        ok(worst < 1e-3, f'所有音符/鼓点都落在速度表的 1/4 拍格点上（最大偏差 {worst*1000:.3f}ms）')


def main():
    films = sys.argv[1:] or [str(ENG.parent / 'templates/film')]
    for f in films:
        R = rh.load(f); check_sections(pathlib.Path(f).name, R, run_score(R))

    # 内置用例：半拍处变速 + 秒数写的第二次变速 + 跨变速的高潮提前量
    d = {'bpm': 60, 'beats_per_bar': 4, 'seed': 3,
         'tempo': [{'at': '10.5b', 'bpm': 120}, {'at': 14.0, 'bpm': 90}],
         'shots': [{'id': 'a', 'len': '8b'}, {'id': 'b', 'len': '5b'}, {'id': 'c', 'len': '11b'}],
         'hits': [{'id': 'x', 'at': '13b', 'type': 'slam', 'pre': '3b', 'main': True}],
         'sections': [{'at': 0, 'energy': 0}, {'at': '6b', 'energy': 1}, {'at': '11b', 'energy': 2}, {'at': '12b', 'energy': 3}],
         'music': {'key': 'A', 'mode': 'minor', 'prog': 'i-VI-III-VII', 'drums': 'four', 'arp': 'up8', 'lead': 'pluck', 'outro': 'none'}}
    R = rh.Rhythm(d)
    print('[变速用例] 60 BPM → 第 10.5 拍 120 BPM → 14.0s 处 90 BPM')
    # 独立算：第 10.5 拍 = 10.5s；之后每拍 0.5s；14.0s = 10.5 + 7 拍 = 第 17.5 拍
    ok(abs(R.segs[2][0] - 17.5) < 1e-9, f'秒数写的变速 14.0s 换成第 {R.segs[2][0]:g} 拍（应为 17.5）')
    for beat, exp in ((10, 10.0), (10.5, 10.5), (11, 10.75), (12, 11.25), (13, 11.75), (17.5, 14.0), (18.5, 14 + 60 / 90)):
        ok(abs(R.beat_to_sec(beat) - exp) < 1e-9, f'第 {beat:g} 拍 = {R.beat_to_sec(beat):.4f}s（应为 {exp:.4f}s）')
    h = R.hit('x')
    ok(abs(h['t'] - 11.75) <= FRAME + 1e-9, f'高潮 x 在 {h["t"]:.4f}s（应为 11.75s，吸附到帧格后差 1 帧以内）')
    ok(abs(h['pre'] - 1.75) < 1e-6, f'高潮 x 提前 3 拍跨过变速 = {h["pre"]:.4f}s（应为 1.75s：第 10–10.5 拍 0.5s + 2.5 拍×0.5s）')
    d2 = dict(d); d2['hits'] = [{'id': 'y', 'at': '13b', 'type': 'slam'}]
    h2 = rh.Rhythm(d2).hit('y')
    ok(abs(h2['pre'] - 0.75) < 1e-6, f'默认提前一拍半 = {h2["pre"]:.4f}s（120 BPM 下应为 0.75s）')
    check_sections('变速用例', R, run_score(R))
    ev = run_score(R)
    halfbeat = [e for e in ev if abs(e['t'] - 10.5) < 1e-6]
    ok(any(e['layer'] == 'lead' for e in halfbeat), f'第 10.5 拍（变速点）的八分音符正好在 10.500s（{len(halfbeat)} 个事件）')

    print('结果：' + ('全部通过' if not fails else f'{len(fails)} 项不通过'))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
