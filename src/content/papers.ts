// ── the ship's papers ─────────────────────────────────────────────────────
// Where the Wayward's parts came from. A hauler kept running for twenty years
// is not all factory: some modules are Obedience spec, most are not, and the
// ship's own system knows it. Only a quarter of the web is stamped, and a
// module with no stamp is simply unremarkable. Pure flavour: no rule reads it.
// The words are on the stamps in the bay; sim/papers.ts picks what the
// registry line says.

export type Origin = 'oem' | 'salvaged' | 'field' | 'nonoem' | 'aftermarket' | 'repaired' | 'unknown' | 'property';

/** What the stamp says. */
export const STAMP: Record<Origin, string> = {
  oem: 'Obedience spec',
  salvaged: 'Salvaged',
  field: 'Field mod',
  nonoem: 'Non-OEM',
  aftermarket: 'Aftermarket',
  repaired: 'Repaired',
  unknown: 'Unknown origin',
  property: 'Continuance property',
};

/** Module id to where it came from. Anything not here has no stamp. */
export const ORIGIN: Readonly<Record<string, Origin>> = Object.freeze({
  // the hull: a frame that has been replaced, plates from other ships, a cutting head that has been welded back
  hl_frame: 'repaired', df_armour: 'salvaged', cl_ram: 'repaired', df_repair: 'field', df_control: 'oem', cl_juggernaut: 'aftermarket',
  // guns and ordnance: the stock fit, and what was bolted on beside it
  ph_emitters: 'oem', ph_lance: 'field', ph_cone: 'field', tp_bay: 'oem', mn_layer: 'salvaged',
  // the drive: pods that are not the pods she left the yard with
  mo_thrusters: 'oem', mo_jets: 'nonoem', mo_afterburner: 'nonoem', pl_vent: 'field',
  // defence and utility
  df_shield: 'oem', cl_arc: 'unknown', ut_tractor: 'oem', ut_scanner: 'aftermarket',
  // the core
  rx_core: 'repaired', rx_sinks: 'aftermarket', oc_overload: 'unknown',
  // salvaged tech, and the yard's quiet kit
  tech_gutter: 'salvaged', tech_custody: 'property', tech_office: 'property', tech_thren: 'unknown', tech_voice: 'unknown',
  md_plate: 'salvaged', md_ghost: 'unknown',
});

/** The ship's own answer to a fit, shown in the voice line for a moment. */
export const LOG = {
  accepted: 'Module compatibility: accepted',
  offSpec: 'Component: not factory spec',
} as const;
