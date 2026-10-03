# Elbow

The signature frame: an LCARS sweep re-cut at 45°. A 12px bar down the left (`stroke-bar`), a 3px rail along the top (`stroke-rail`), a chamfered outer corner (`cut-lg`) and a chamfered bend where they meet. The other two corners are a hairline at 45% of the elbow's colour, with the bottom-right cut to match.

Provide: `<section class="ab-elbow"><i class="ab-elbow-l"></i> … </section>`. The `<i>` draws the sweep. Put the head in `ab-elbow-head`: a code or the mark on the left, the title hard right in `ab-elbow-title` (`display` style, caps, in the elbow's colour) with the sub-line under it.

| Class | Colour | Use |
|---|---|---|
| (default) | `signal` | Field refit, all stop |
| `is-command` | `command` | Shakedown, the hull pick |
| `is-alert` | `alert` | The hail, hull breach |
| `is-lit` | adds `glow-signal` | The one panel on screen that is waiting for a decision |

- One elbow on screen at a time. It means "the run has stopped and a decision is owed".
- The title is set hard right, the way LCARS sets titles; the left end holds the mark or a code.
- Don't nest an elbow in an elbow, or use one for a HUD element.
