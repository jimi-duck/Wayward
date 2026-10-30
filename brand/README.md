> **Superseded for the game's look** by brand v1.1 in `branding/`
> (amber for the Wayward, teal for information, red for the threat). See
> "UI. Look and feel" in `docs/PLAN.md`. This folder is kept for its
> generator and history. The game's colour roles live in the `ui` section of
> `system/tokens.json`; `npm run tokens` writes them to `src/styles/tokens.css`.
> `make_tokens.py` does not write `ui`, so keep that section when regenerating.

# Brand

Source for the Wayward design system, published at
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
