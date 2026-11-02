# Short-video motion playbook / 竖屏短视频动效规则

Rules the engine and QA are built around. Thresholds are our own working values, tuned on a small sample; adjust for your audience.

## 1. Pacing 节奏
- One `rhythm.json` per film. Scenes (`scene.html`) and sound (`audio.py`) read the same table, so picture and music never drift. Check it with `python3 engine/rhythm.py FILM`.
- Choose BPM per film (explainers 76–92, lists/twists 100–124); tempo can change (`"tempo":[{"at":"24b","bpm":100}]`).
- Text appears instantly or pops in within 0.15 s (`rise()` default). A new line or new visual every 1.5–2 s. A circle or underline alone doesn't count as a change.
- First reveal by ~3.5 s; no gap between reveals (hits + marks) longer than 15 s. `rhythm.py` and QA warn on gaps > 2.5 s.
- Allow reading time: ~4.5 CJK chars/s + 1 s. Cut words, not time.
- After rendering: `python3 engine/gapscan.py VIDEO --thr 10` should show no static segment > 2 s.

## 2. Transitions 转场
| type | when | rhythm.json |
|---|---|---|
| `cut` | default; key reveals | `"in":"cut"` |
| `match` | same motion/direction across shots | `"in":"match","dir":"up"` |
| `carry` | an object flies from one shot into the next | `"in":"carry","carry":"1b"` |
| `fade` | only deliberately (time passes); crossfade, never fade-to-empty | `"in":"fade","fade":"1b"` |

QA flags "dead fades" (both shots near zero opacity at once).

## 3. Motion 动效
1. Opening and one signature shot per film written specifically for that film with `VIBE3D` (three.js + depth of field + bloom + vignette).
2. At least 4 camera-move types (push, pull, orbit, parallax, spline path, fly-through, rack focus).
3. At least one particle form/disperse, one morph (shape or chart; chart values never change).
4. Prefer object-carried transitions over default fades.
5. Kinetic text for anchor words (`charAssemble`, `maskReveal`).
6. Ambient base motion in every frame (on by default: slow push + drift + floating dust; `ambient:false` to disable). Big moves land on beats. Cuts ~0.5–3 per 10 s outside montages (`"montage":[[from,to]]`). `engine/motion.py` warns if median motion < 0.4, fully static > 2.5 s, or > 4 cuts/10 s.
7. Keep bloom off text (bloom.strength ≤ 0.8 behind text, or a dark plate).
8. Pick 3–5 effects from [effect-library.md](effect-library.md) for hook / reveal / number / ending.

## 4. Generated image × code 生图 × 代码
Use at least one image-gen technique in the opening or signature shot (P1 depth plate, P2 textured 3D prop, P3 image→particles, P4 diorama + draw-on notes, P5 era morph, P6 cutout puppet, P7 hand-drawn chart on paper, P8 skybox). Details: [research-image-gen.md](research-image-gen.md). Generated images carry no text; code draws all text.

## 5. Climax 高潮 (`hits`)
- `slam`: dim + riser, freeze 3 frames, slam word + flash + boom.
- `snap`: short flash + hit for small twists.
- `drop`: music drops out, soft bloom + low note for quiet "aha".
- 3–4 per 60 s film, exactly one `main`. Read times with `HIT('id')`, never hard-coded seconds.

## 6. Picture 画面
- Safe area for 9:16 apps: content centre x=520, text inside x 120–920, y 180–1500; keep the bottom 20% and right-side button column clear.
- One highlighted keyword per screen.
- Show what the line says (a "flat for 50 years" curve really hugs the floor).
- Avoid the default AI look: gradient + centred title + corner frames + generic particles.
- Real people: only their documented public story, no invented quotes, no endorsement look, nothing demeaning, no voice cloning. Currency must be clearly illustrated (no serial numbers), no brand logos.

## 7. Acceptance 验收
Contact sheet, 0.5 s overview, full 1× watch with sound, QA report with no FAIL.
