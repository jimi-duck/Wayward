# Brackets

Four corner brackets: the viewscreen frame, and the frame around anything the player should look at. Built from eight background gradients, so they cost no markup.

Provide: `class="ab-brackets"` on any box. Set `--l` (arm length, default 14px) and `--b` (colour) to tune.

- At rest the arms are `rule-2`. `is-lit` turns them `signal` for the focused viewport; `is-target` makes short `command` arms for a target lock.
- The HUD's outer frame is one set of brackets inset `space-4` from the screen edge. The corners stay open on purpose, so rocks can cross the edge.
- Brackets frame a thing; they never hold text on their own.
