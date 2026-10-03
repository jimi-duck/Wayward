# Placard

A hazard label for the two alert levels, built like the warning stickers on industrial hardware: a striped band, a kicker line with the label script, a heavy title, one line of fact.

Provide: `ab-placard` plus a level class, then `ab-placard-stripes` and `ab-placard-body` holding `-kicker`, `-title` and `-text`. Add `is-live` while the alert is current: the stripes crawl (static under reduced motion).

| Level | Class | When |
|---|---|---|
| Yellow alert | `ab-placard--caution` | A capital ship is inbound (the 2.6s warning before the hail). `caution` fill, `on-caution` text. |
| Red alert | `ab-placard--alert` | One hull plate left; the hail itself. `alert` on `hull`. |

- Yellow before red, as on a starship: the warning is yellow, the engagement is red.
- `caution` is never text. It is a fill with `on-caution` on it, or nothing.
- One placard on screen at once. It sits top-centre, under the refit rail.
