# Brand

Source for the Asteroid Blaster design system, published at
https://claude.ai/artifact/WdTTCZEzY5s15ytUBkdWpg (private to the owner).

- `system/` is what the design system holds: the brand book (`README.md` and
  the section pages), `tokens.json`, `components/bundle.css` (every class is
  prefixed `ab-`), a preview and guidelines per component, and the logo and
  icon SVGs.
- `src/` is the generator: `glyphs.py` draws the constructed wordmark,
  `fragments.py` holds the mark, icons, schematics and the scene painter the
  screen mockups use, `previews.py` writes the component previews, and
  `make_tokens.py` writes the tokens.

Regenerate from `src/` with `python3 make_tokens.py && python3 make.py`; both
write to `./project` next to them, which is what `system/` was copied from.

The game's interface (milestone M7) is built from `system/components/bundle.css`
and `system/tokens.json`.
