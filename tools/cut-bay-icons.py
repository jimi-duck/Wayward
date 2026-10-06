"""Cut branding/bay-icon-sheet-v1.webp into public/icons/node/<id>.png.

Each glyph becomes a white-on-transparent mask, 96px square, so the bay can
tint it with CSS (mask-image). Needs Pillow and numpy; run from the repo root:
  python3 tools/cut-bay-icons.py
The sheet reads left to right, row by row; ORDER names each glyph by upgrade
(or fitting) id. None skips a spare.
"""
import os
import numpy as np
from PIL import Image

SHEET = 'branding/bay-icon-sheet-v1.webp'
OUT = 'public/icons/node'
SIZE, FIT = 96, 84
# y0, y1, gap: the band of each row and how far apart columns must be to be separate glyphs
ROWS = [(26, 118, 14), (145, 242, 14), (262, 362, 24), (381, 478, 14), (494, 580, 14), (608, 713, 14),
        (716, 823, 14), (838, 938, 14), (944, 1038, 14), (1042, 1139, 8), (1141, 1222, 14)]
ORDER = '''
ph_emitters ph_capacitors ph_bank ph_lenses ph_pierce ph_cone ph_cone_wide ph_lance ph_lance_cap ph_array ph_fire_control
tp_bay tp_magazine tp_yield tp_tracking tp_heavy tp_cluster tp_swarm tp_swarm_volley - tp_precision tp_painter
mn_layer mn_yield mn_racks mn_seekers mn_field mn_chain mn_gravity
pl_vent pl_heat pl_flow pl_ignite pl_corona pl_wake
cl_arc cl_arc_power cl_arc_reach cl_storm cl_ram cl_juggernaut cl_shock
mo_impulse mo_thrusters mo_dampers mo_jets mo_drift mo_evasion mo_afterburner
df_shield df_regen df_armour df_bulkheads df_control df_repair df_fortress df_reactive df_regenerative
ut_tractor ut_matrix ut_quiet ut_tactical ut_prospector ut_salvager ut_scanner
rx_core rx_sinks hl_frame oc_coils oc_nova oc_overload oc_phase
sy_plasma_torps sy_detonator sy_arc_shield sy_ramjet sy_arc_torps sy_core_mines
tech_gutter tech_custody tech_office tech_voice tech_thren
'''.split('\n')
ORDER = [r.split() for r in ORDER if r.strip()]


def runs(mask, gap):
    idx = np.where(mask)[0]
    out, s, p = [], idx[0], idx[0]
    for i in idx[1:]:
        if i - p > gap:
            out.append((s, p)); s = i
        p = i
    out.append((s, p))
    return out


g = np.asarray(Image.open(SHEET).convert('L')).astype(np.float32)
os.makedirs(OUT, exist_ok=True)
for (y0, y1, gap), names in zip(ROWS, ORDER):
    band = g[y0:y1 + 1] > 60
    cols = runs(band.any(0), gap)
    assert len(cols) == len(names), (names, len(cols))
    for (x0, x1), name in zip(cols, names):
        if name == '-':
            continue
        yy = np.where(band[:, x0:x1 + 1].any(1))[0]
        crop = g[y0 + yy[0]:y0 + yy[-1] + 1, x0:x1 + 1]
        alpha = np.clip((crop - 40) / 120, 0, 1)
        h, w = alpha.shape
        k = FIT / max(h, w)
        a = Image.fromarray((alpha * 255).astype(np.uint8)).resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
        img = Image.new('LA', (SIZE, SIZE), (255, 0))
        img.paste(Image.merge('LA', (Image.new('L', a.size, 255), a)), ((SIZE - a.width) // 2, (SIZE - a.height) // 2))
        img.save(f'{OUT}/{name}.png', optimize=True)
print('ok')
