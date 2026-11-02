from vibe_audio import *
R = film(__file__)
mus, drm = score(R)
sfx = z()
transitions(sfx, R)
climax_hits(sfx, R)
add(sfx, boom(), 0, 0.9)
add(sfx, ding(86), R.marks['p2'], .35)
finish(mus, drm, sfx, out_path(__file__))
