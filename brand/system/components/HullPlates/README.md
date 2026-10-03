# HullPlates

The player's health, as five cut plates: lit plates are hull you have, unlit plates are the ceiling. The word is always *hull*, never life or HP.

Provide: `<span class="ab-plates">` with one `<i>` per plate up to `MAX_LIVES`, `class="on"` on the plates you have. Add `is-alert` at one plate: the last plate turns `alert` and blinks at 1.1s (steady under reduced motion).

- Sits beside the stardate in the bottom-left HUD chip, and on the shakedown cards.
- Ablative armour shows as a sixth plate drawn in `dilithium` outline while it is charged.
- Give the group an `aria-label` such as "Hull 3 of 5"; the plates carry no text of their own.
