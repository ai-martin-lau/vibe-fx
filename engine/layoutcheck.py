"""版面检查：字有没有互相压、被线穿、出安全框，框和框有没有碰。

用法：python3 engine/layoutcheck.py FILM [--step 0.1] [--seconds S] [--json OUT]
页面约定：window.TEXTS(t) 返回字 {text,a,x0,y0,x1,y1}，以及 logShape() 登记的 {kind:'line'|'box', a, pts}。
规则（只看透明度 ≥ 0.5 的元素；转场前 0.35 秒两个镜头叠画，不判）：
  TEXT×TEXT  两段不同的字框相交（各缩 6%）
  LINE×TEXT  线的采样点落进字框（缩 12%）——线从字上穿过去，看起来像字被挡了一半
  BOX×BOX    两个框相交
  PTS        matchPts() 配对后目标点云高度 < 原点云 80%（粒子字缺半截）
  CONTRAST   字色和字框里底色（像素亮度中位数）对比度 < 3:1，持续 ≥ 0.3 秒（每 0.25 秒采一帧）
  SAFE       字超出安全框 x∈[40,1040]、y∈[60,1860]，持续 ≥ 0.15 秒（砸字过冲一两帧不算）
退出码：0 = 干净；1 = 有问题；2 = 没法检查。
"""
import argparse, asyncio, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from readcheck import scan

def shrink(b, f):
    dx, dy = (b[2]-b[0])*f, (b[3]-b[1])*f
    return (b[0]+dx, b[1]+dy, b[2]-dx, b[3]-dy)

def inter(a, b): return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]

def frame_issues(items):
    T, L, B, out = [], [], [], []
    for it in items:
        if it.get('a', 1) < .5: continue
        k = it.get('kind')
        if k == 'line': L.append(it['pts'])
        elif k == 'box':
            (x0, y0), (x1, y1) = it['pts']; B.append((x0, y0, x1, y1))
        elif it.get('text', '').strip():
            bb = (it['x0'], it['y0'], it['x1'], it['y1'])
            if (it['text'], tuple(round(v) for v in bb)) not in [(t, tuple(round(v) for v in b)) for t, b in T]: T.append((it['text'], bb))
    for i in range(len(T)):
        t, b = T[i]
        if b[0] < 40 or b[2] > 1040 or b[1] < 60 or b[3] > 1860: out.append(('SAFE', t))
        for j in range(i+1, len(T)):
            if T[j][0] != t and inter(shrink(b, .06), shrink(T[j][1], .06)): out.append(('TEXT×TEXT', f'{t} / {T[j][0]}'))
        sb = shrink(b, .12)
        if any(sb[0] < x < sb[2] and sb[1] < y < sb[3] for pts in L for x, y in pts): out.append(('LINE×TEXT', t))
    for i in range(len(B)):
        for j in range(i+1, len(B)):
            if inter(B[i], B[j]): out.append(('BOX×BOX', f'box{i}/box{j}'))
    return out

async def shots(film):
    from playwright.async_api import async_playwright
    from vibe_env import chrome_path
    import rhythm as _rh
    r = _rh.load(film); exe = chrome_path()
    async with async_playwright() as pw:
        b = await pw.chromium.launch(**({'executable_path': exe} if exe else {}), args=['--allow-file-access-from-files'])
        p = await b.new_page(viewport={'width': 1080, 'height': 1920})
        await p.add_init_script(f'window.RHYTHM={json.dumps(r.to_js(), ensure_ascii=False)};' if r else 'window.RHYTHM=null;')
        await p.goto((film / 'scene.html').as_uri()); await p.evaluate('window.ready')
        s = await p.evaluate('(window.SHOTS||[]).map(s=>s.a)')
        await p.evaluate('(()=>{for(let t=0;t<=window.DURATION;t+=0.5)window.draw(t)})()')
        w = await p.evaluate('window.PTWARN||[]')
        cr = []
        if await p.evaluate("typeof window.CONTRAST==='function'"):
            dur = await p.evaluate('window.DURATION'); t = 0.0
            while t <= dur:
                cr.append((round(t, 2), await p.evaluate(f'window.CONTRAST({t})'))); t += .25
        await b.close()
    return s, w, cr

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('film'); ap.add_argument('--step', type=float, default=0.1)
    ap.add_argument('--seconds', type=float); ap.add_argument('--json')
    a = ap.parse_args(); film = pathlib.Path(a.film).resolve()
    res = asyncio.run(scan(film, a.step, a.seconds))
    if res.get('noTexts'): print('layoutcheck：页面没有 window.TEXTS'); sys.exit(2)
    starts, ptw, crs = asyncio.run(shots(film))
    rows, last = [], {}
    for k in ptw: rows.append({'key': ('PTS', k), 'kind': 'PTS', 'what': f'{k}：粒子目标点只用到 <80% 高度（字会缺半截）', 't0': 0, 't1': 0})
    for t, items in res['frames']:
        if any(0 < t - s0 < .35 for s0 in starts): continue
        for kind, what in frame_issues(items):
            key = (kind, what)
            if key in last and t - last[key] <= a.step * 1.5 + 1e-6: last[key] = t; rows[-1 if rows[-1]['key'] == key else [i for i, r in enumerate(rows) if r['key'] == key][-1]]['t1'] = round(t, 2); continue
            last[key] = t; rows.append({'key': key, 'kind': kind, 'what': what, 't0': round(t, 2), 't1': round(t, 2)})
    run = {}
    for t, items in crs:
        if any(0 < t - s0 < .35 for s0 in starts): continue
        for it in items:
            if it['c'] >= 3: continue
            key = ('CONTRAST', it['text'])
            if key in run and t - run[key]['t1'] <= .26: run[key]['t1'] = t; run[key]['c'] = min(run[key]['c'], it['c']); continue
            r = {'key': key, 'kind': 'CONTRAST', 'what': it['text'], 't0': t, 't1': t, 'c': it['c']}; run[key] = r; rows.append(r)
    for r in rows:
        if r['kind'] == 'CONTRAST': r['what'] = f"{r['what']}（最低 {r['c']}:1）"
    rows = [r for r in rows if not (r['kind'] == 'CONTRAST' and r['t1'] - r['t0'] < .3)]
    rows = [r for r in rows if not (r['kind'] == 'SAFE' and r['t1'] - r['t0'] < .15)]   # 砸字过冲一两帧出框不算
    for r in rows: print(f"{r['kind']:10} {r['t0']:6.2f}–{r['t1']:6.2f}s  {r['what']}")
    if not rows: print('layoutcheck：没有压字、穿字、出框、碰框')
    if a.json: pathlib.Path(a.json).write_text(json.dumps({'rows': [{k: v for k, v in r.items() if k != 'key'} for r in rows]}, ensure_ascii=False, indent=1), encoding='utf-8')
    sys.exit(1 if rows else 0)

if __name__ == '__main__':
    main()
