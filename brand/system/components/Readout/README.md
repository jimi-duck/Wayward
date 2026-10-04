# Readout

A label and a figure, the unit of the HUD: a quiet `label` word (it never changes) and a loud `numeral` figure (the only part worth a glance).

Provide: `<span class="ab-readout"><span class="ab-label">Score</span><span class="ab-num">1142</span></span>`. Put readouts in an `ab-frame ab-chip` when they sit over the field; the chip's glass keeps them legible over a lit rock or a nebula.

- Figures use tabular numerals so a counting score does not jitter.
- A change against last run is a `label` with a sign and `nominal` (gain) or `ink-3` (loss): ▲ +23, ▼ −19. Never colour alone.
- `is-lit` on the chip is for the one readout that just changed state, briefly.
