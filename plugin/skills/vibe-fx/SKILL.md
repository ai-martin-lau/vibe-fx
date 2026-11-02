---
name: vibe-fx
description: Make a vertical (1080x1920) short video or a single motion effect with the vibe-fx engine. Use when the user wants a code-rendered explainer clip, a kinetic-text/number/3D/tree-node effect, or wants to combine AI-generated images with code animation.
---

# vibe-fx

The repo root (two levels above this file's `plugin/` folder) contains `engine/`, `examples/`, `templates/` and `docs/`.

## Render one effect
```bash
examples/effect-library/one.sh k_slam      # -> examples/effect-library/out/test/test.mp4
```
Ids are listed in `docs/effect-library.md`. `g_*` effects (and `r_imageTree`, `t_carry`, `c_rackFocus`, `t_pageTurn`, `t_ink`, `k_stamp`, `k_type`, `m_paperFold`) need images in `examples/effect-library/img/`; prompts are in `docs/effect-library.md`. Generate them with any image model; without them those effects draw placeholders or nothing.

## Make a film
1. `engine/newfilm.sh films/my-film` (copies `templates/film`).
2. Write `rhythm.json` first (BPM, shots, hits, marks), then check it: `python3 engine/rhythm.py films/my-film`.
3. Write `scene.html`: one scene per shot id; use `FXR.<id>.draw(lt,D,t)` from `engine/effects/fx.js` and `VIBE3D` from `engine/three3d.js` for 3D shots. Design the opening and one signature shot per film; don't copy the demo.
4. Test 10 s: `engine/make.sh films/my-film --test 10`; full: `engine/make.sh films/my-film`.
5. Read `out/final-vN/qa/qa-report.md` and look at `overview.jpg`. Fix every FAIL.

## Rules (see docs/playbook.md)
- Text appears within 0.15 s; something new every 1.5–2 s.
- Gentle ambient motion in every frame, big moves on beats; ~0.5–3 cuts per 10 s.
- Numbers only from cited sources; generated images carry no text (code draws text).
- Real people: only their documented public story, no invented quotes, no endorsement look.
