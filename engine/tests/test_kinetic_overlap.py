"""逐字动效防撞自检：charAssemble 的字在飞行中不能互相压（layoutcheck 不报 TEXT×TEXT / SAFE）。
运行：python3 engine/tests/test_kinetic_overlap.py      通过 exit 0。
同时跑一份旧写法 scatter:'random' 的副本，必须报 TEXT×TEXT —— 证明这项检查本身没失灵。"""
import pathlib, shutil, subprocess, sys, tempfile
ENG = pathlib.Path(__file__).resolve().parents[1]
FIX = ENG / 'tests' / 'fixtures' / 'kinetic'
fails = []


def run(film):
    r = subprocess.run([sys.executable, str(ENG / 'layoutcheck.py'), str(film), '--step', '0.0333'],
                       capture_output=True, text=True, timeout=600)
    return r.returncode, r.stdout + r.stderr


code, out = run(FIX)
bad = [l for l in out.splitlines() if l.startswith(('TEXT×TEXT', 'SAFE'))]
print(('  ✓ ' if code == 0 and not bad else '  ✗ ') + 'charAssemble 默认（整行放大收回）：没有压字、出框')
if code != 0 or bad: fails.append('default'); print(out)

tmp = pathlib.Path(tempfile.mkdtemp(prefix='_tmp_random_', dir=FIX.parent))
try:
    shutil.copy(FIX / 'rhythm.json', tmp)
    (tmp / 'scene.html').write_text((FIX / 'scene.html').read_text(encoding='utf-8').replace(
        "window.SCATTER||''", "window.SCATTER||'random'"), encoding='utf-8')
    code, out = run(tmp)
    hit = any(l.startswith('TEXT×TEXT') for l in out.splitlines())
    print(('  ✓ ' if hit else '  ✗ ') + "对照：旧写法 scatter:'random' 能被 layoutcheck 抓到压字")
    if not hit: fails.append('control'); print(out)
finally:
    shutil.rmtree(tmp, ignore_errors=True)

print('通过' if not fails else f'失败：{fails}'); sys.exit(1 if fails else 0)
