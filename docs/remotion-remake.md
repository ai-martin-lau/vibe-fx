# Remotion edition: what was kept, remade, dropped (2026-11-04)

The 63 effects in `engine/effects/fx.js` (canvas engine) stay as they are. The Remotion edition in `remotion/` is a curated set
of 27 React components in one look: warm grade, film grain, vignette, one sans font, one amber accent (#f2a640).
Rule for keeping: the effect must make one thing clearer. Gimmicks, cartoon physics and near-duplicates were dropped.

## Remade (22 components cover 24 old effects)
| Component | From | Why kept |
|---|---|---|
| Iris | t_iris | Reveal from the subject outward |
| Whip | t_whip | A/B turn, real motion blur (@remotion/motion-blur) |
| Slam | k_slam | Hook word, short camera kick, no shake loop |
| Scramble | k_scramble | Suspense reveal |
| SplitFlap | k_splitFlap | Year / place reveal |
| Highlight | k_highlight | One key phrase marked |
| Typewriter | k_type | Sourced quote at reading speed |
| WordLight | k_counterWords | Line read in rhythm, last word accented |
| Odometer | n_odometer | Big counts with mechanical weight |
| CompoundCurve | n_compound | Late steepness of exponential growth |
| Timeline | n_timeline | Dated life / history nodes |
| ShareRing | n_pie | One share, one ring (replaces pie) |
| Balance | n_scale | Trade-off that tips one way |
| RackFocus | c_rackFocus | Attention moves from object to idea |
| DollyZoom | c_dollyZoom | The realisation beat |
| KenBurns | g_kenBurns | Still photo with motion and a lower third |
| EraMorph | g_eraMorph | Same framing, old to new |
| Lens | g_lens | Magnify the small print |
| Spotlight | g_spotlight | Find the answer in a scene |
| ParticleWord | m_particleText, g_img2particles | Dust converges into the key word |
| TreeGrow | r_treeGrow, r_mindmap | Concept unfolds level by level |
| DecisionPath | r_decision | One path lights, the rest dim |

## New (5)
| Component | Use |
|---|---|
| ContrastPair | Same thing, two numbers: two lit bars and the ratio |
| ChapterCard | Letterbox act break with index and tracked title |
| Annotate | Pen-drawn ellipse + arrow on a photo region |
| LightSweep | Specular light across a hero word |
| SourceCard | Claim + source + year on an archival slip |

## Already covered by a typical Remotion pipeline (7, not duplicated here)
n_counter (counter), n_bars (3D bar chart), n_dots (dot grid), k_stack (staged text), c_parallax and g_depthPlate (2.5D photo parallax), g_skybox (blurred photo backdrop).

## Dropped (32)
- Cartoon or cheap motion: t_glitch, t_blinds, k_charDrop, k_stretch, k_textPath, k_stamp, m_spring, m_pendulum, m_domino, m_explode, m_liquid, m_morph, g_puppet.
- Transitions that pull focus from the content: t_coinWipe, t_zoomThrough, t_pageTurn, t_ink, t_shatter, t_carry, c_dutch.
- Heavy 3D showpieces with little explanatory value: c_orbit, c_spline, g_tex3D, r_constellation3D, n_coinStack.
- Overlap with a kept component: g_diorama (Annotate), g_tiles and g_polaroid (KenBurns), g_inkPaper and m_paperFold (Typewriter, SourceCard), r_forceGraph and r_imageTree (TreeGrow).

Dropped effects still work in the canvas engine.
