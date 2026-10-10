# Copy

Rules for every line the player reads. They came out of the copy pass of
2026-10-10, when all the English was exported, reworked by hand and applied
back. German twins follow the English (`src/i18n/de/`; the lines of that pass
are in `copy.ts`).

- **Clarity first.** In the HUD, chart, menus, tutorials and choice hints, say
  what is happening or what to do before adding atmosphere.
- **One main action per line.** Labels are short and scannable. Extra context
  goes in the hint.
- **Choices are actions.** The label names the action (`Jam the patrol`,
  `Decline`). The hint gives the key cost, requirement, risk or likely result.
  No `Go` or `Do it` where a clearer verb fits.
- **Be honest about consequences.** Name costs, time limits, required modules
  and real risks. Never promise a result that may not happen.
- **Concrete outcomes.** `The scan is logged and sent to Custody`, not `Bad
  result`.
- **Lean HUD.** Short labels and brief status messages. No repeats of what is
  already on screen. Full sentences for tutorials and story scenes.
- **Two voices.** Interface copy is direct and neutral. Dialogue can be terse,
  warm or strange but must read clearly the first time. Calloway is controlled
  and human, frontier characters plain and distinct, the Voice precise and
  literal, the Thren strange and not explained early.
- **Respect the player's time.** Short sentences, active voice, familiar words.
  No filler, repeated warnings or unexplained abbreviations.
- **Consistent terms.** Cyrite, Krail, supplies, Bay, Custody, Office of Peace,
  the Net, the Voice, the Thren, jump lane, lane entrance. Cyrite is the one
  currency and the jump fuel (see `ECONOMY.md`); Chits and Krail are not
  shown as money.
- **Sentence case** for messages and descriptions. Title case only for proper
  names and named story content.
- **Punctuation by function.** Short labels and one-line status messages need
  no full stop. Dialogue and full sentences are punctuated normally. `·` only
  joins compact status pairs.
- **British English** (`favour`, `colour`, `authorise`).
- **Keep tokens exact:** `{name}`, `{n}`, `{times}`, `{#}`.
- **Easy to translate.** No puns or idioms. One idea per sentence.
- **Target.** A new player quickly knows what is happening, what they can do,
  what it costs, what might go wrong and what happens next. Mystery belongs in
  the world, not in the controls.

The comms reading caps (`tests/reading.test.ts`) were widened in the same pass
(text 32 words, hint 19, label 8, win 16, lose 13, read 14) so a line can state
its cost and risk.
