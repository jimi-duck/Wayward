# Tag

Small cut chips for status: the badge on a refit card, a timed power-up, a faction, a registry code.

Provide: `<span class="ab-tag">` with one to three words. Add a variant for card badges, an `ab-dot` for a live state, or use `ab-reg` for a bracketed registry code.

| Variant | Means |
|---|---|
| `ab-tag--new` | You don't own this upgrade yet (`command`) |
| `ab-tag--up` | You own it; this takes it up a level |
| `ab-tag--max` | This pick finishes the system (`nominal`) |
| `ab-tag--once` | Damage Control: one use, doesn't stack (`dilithium`) |

- A dot means something is running right now. `nominal` for shields, `signal` for overloaded phasers, `alert` for a tractor lock.
- Faction tags take the faction token for both the dot and the word.
- Registry codes (`ab-reg`) are annotation, in `ink-3`. They carry a 47 where a number is free.
