# RefitPanel

Opens the instant the refit rail fills and freezes the field: three cards rolled fresh each time, one pick, no confirm step.

Built from an `ab-elbow is-lit` at 96% of the screen width; the mark and a console code at the left end, FIELD REFIT hard right with the label script and the sub-line; a position bar of one block per card (the lit block is the card you are on, in `command`); three UpgradeCards; the key legend on the left of the foot.

- Input: 1 2 3 take a card outright; Tab and Shift+Tab move the selection inside the panel; Enter takes it. Arrows and Space do nothing: they are flight keys and one is usually held when the panel opens.
- The panel ignores input for its first 0.4s while the cards come up.
- Salvage from a capital ship uses the same panel titled BATTLE SALVAGE, sub-line "Hull broken · choose one upgrade", without a refit number.
- Layouts: three columns above 980px wide; one column with compact cards below that; three short columns when the window is under 420px tall. The panel never scrolls.
