# Button

An LCARS pill with its ends cut to points. One primary action per screen.

Provide: a `<button class="ab-btn">` with a variant, one to three words of label, an optional leading icon.

| Variant | Use |
|---|---|
| `ab-btn--command` | The one action the screen exists for: Launch, Play again. `command-fill` with `on-command`. |
| `ab-btn--ghost` | Secondary actions: How to fly, All stop. An `edge` outline that turns `signal` on hover. |
| `ab-btn--alert` | Leaving a run for good. Rare. |
| `ab-btn--sm` | 32px tall, for HUD controls. |

- Labels are verbs in caps, tracked wide: LAUNCH, PLAY AGAIN, ALL STOP.
- Focus is drawn in the edge layer, since the cut would clip an outline: a 2px gap, then 2px of `focus`, solid (second button above).
- Panels that freeze the run ignore input for their first 0.4s, so a key already on its way down is not an order.
