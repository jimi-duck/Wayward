// The gate signs bench: tools/signs.html on the dev server. Each category's look, flat, for judging the panels
// (render/signs.ts) without flying to a gate.
import { SIGNS } from '../src/content/gatesigns';
import { drawSign } from '../src/render/signs';

const want = new URLSearchParams(location.search).get('id')?.split(',');
const picks = want ? SIGNS.filter((d) => want.includes(d.id)) : [
  'official_the_severance_keeps_you_safe', 'defaced_the_severance_keeps_you_prisoners', 'defaced_the_lanes_are_closed_we_are_left_',
  'resistance_you_closed_the_gates_you_left_', 'krail_94_remained_they_knew', 'krail_they_didn_t_run_out_of_krail_they',
  'civilian_my_son_was_born_after_the_closu', 'warden_gate_status_sealed', 'rare_this_message_has_been_flagged_for_removal',
].map((id) => SIGNS.find((d) => d.id.startsWith(id.slice(0, 22)) )).filter((d): d is NonNullable<typeof d> => !!d);

void document.fonts.ready.then(() => {
  const m = document.getElementById('m')!;
  for (const d of picks) {
    const f = document.createElement('figure'), c = document.createElement('canvas');
    c.width = 1024; c.height = 256;
    drawSign(c.getContext('2d')!, d, 7);
    f.append(c, Object.assign(document.createElement('figcaption'), { textContent: `${d.look} · ${d.id}` }));
    m.append(f);
  }
  document.body.dataset.ready = '1';
});
