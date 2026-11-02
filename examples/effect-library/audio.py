from vibe_audio import *
R = film(__file__)
mus, drm = score(R)
sfx = z()
transitions(sfx, R)
finish(mus, drm, sfx, out_path(__file__))
