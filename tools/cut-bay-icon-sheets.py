"""Cut the redrawn bay icon sheets into public/icons/node/<id>.png.

    python3 tools/cut-bay-icon-sheets.py <folder with icons__yard-1.png, icons__redraw-1.png, ...>

Each sheet is a 4 x 3 grid on black, one glyph per cell, left to right, row by
row (docs/art/UPGRADES-FINISH-BRIEF.md, batch A). ORDER names the glyph in each
cell by upgrade id (the sixteen yard modules are `md_*`). Every glyph becomes a
white-on-transparent mask, 128px square, so the bay tints it with CSS. The older
tools/cut-bay-icons.py cut the 96px v2 sheet. Needs Pillow and numpy.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

OUT = Path('public/icons/node')
SIZE, FIT = 128, 112
COLS, ROWS = 4, 3
ORDER = {
    'yard-1': 'md_hardpoints md_plate md_gunnery md_projector md_racks md_shop md_tractor md_capacitor md_baffles md_array md_jammer md_spoofer',
    'yard-2': 'md_ghost md_ledger md_names md_dock',
    'redraw-1': 'cl_arc cl_arc_power cl_arc_reach cl_juggernaut cl_ram cl_shock cl_storm df_armour df_bulkheads df_control df_fortress df_reactive',
    'redraw-2': 'df_regen df_regenerative df_repair df_shield hl_frame mn_chain mn_field mn_gravity mn_layer mn_racks mn_seekers mn_yield',
    'redraw-3': 'mo_afterburner mo_dampers mo_drift mo_evasion mo_impulse mo_jets mo_thrusters ph_array ph_bank ph_capacitors ph_cone ph_cone_wide',
    'redraw-4': 'ph_emitters ph_fire_control ph_lance ph_lance_cap ph_lenses ph_pierce pl_corona pl_flow pl_heat pl_ignite pl_vent pl_wake',
    'redraw-5': 'rx_core rx_sinks sy_arc_shield sy_arc_torps sy_detonator sy_plasma_torps sy_ramjet tech_custody tech_gutter tech_office tech_thren tech_voice',
    'redraw-6': 'tp_bay tp_cluster tp_heavy tp_magazine tp_painter tp_precision tp_swarm tp_swarm_volley tp_tracking tp_yield ut_matrix ut_prospector',
    'redraw-7': 'ut_quiet ut_salvager ut_scanner ut_tactical ut_tractor',
}


def main(folder: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    n = 0
    for sheet, names in ORDER.items():
        path = Path(folder) / f'icons__{sheet}.png'
        if not path.exists():
            print('skip', sheet, '(no file)')
            continue
        g = np.asarray(Image.open(path).convert('L')).astype(np.float32)
        ch, cw = g.shape[0] / ROWS, g.shape[1] / COLS
        for i, name in enumerate(names.split()):
            r, c = divmod(i, COLS)
            y0, y1, x0, x1 = round(r * ch), round((r + 1) * ch), round(c * cw), round((c + 1) * cw)
            cell = g[y0:y1, x0:x1]
            on = cell > 60
            ys, xs = np.where(on)
            if not len(ys):
                print('EMPTY', sheet, name)
                continue
            if ys.min() < 3 or xs.min() < 3 or ys.max() > cell.shape[0] - 4 or xs.max() > cell.shape[1] - 4:
                print('TOUCHES THE CELL EDGE', sheet, name)
            crop = cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
            alpha = np.clip((crop - 40) / 120, 0, 1)
            h, w = alpha.shape
            k = FIT / max(h, w)
            a = Image.fromarray((alpha * 255).astype(np.uint8)).resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
            img = Image.new('LA', (SIZE, SIZE), (255, 0))
            img.paste(Image.merge('LA', (Image.new('L', a.size, 255), a)), ((SIZE - a.width) // 2, (SIZE - a.height) // 2))
            img.save(OUT / f'{name}.png', optimize=True)
            n += 1
    print('wrote', n)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
