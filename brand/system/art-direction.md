# Art direction

The 3D world follows the same four rules as the interface. These notes brief the 3D milestones (M1 to M6).

## Camera and plane

Play happens on a flat plane; the presentation is full 3D. The camera sits above and behind the ship, smoothed, angled enough to see hull detail and the overcharge ring, high enough to read a dense field. Ships bank into turns and dip their nose under thrust; the barrel roll is the one 3D move with a gameplay effect.

## The player's ships

- **Hard-surface and faceted.** Low polygon count with crisp bevels, matte graphite hull plating (around `#2B3440` albedo), panel lines, a registry decal on the saucer. No gloss, no chrome.
- **Light is `signal`.** Nacelle strips, the impulse glow and the trail are emissive cyan; they are the brightest thing on the ship and the only part that blooms. The deflector dish is the one `command` point of light, as on the mark.
- **Three silhouettes that differ at 30px.** Escort: a compact wedge with integrated nacelles. Cruiser: a long cut saucer, nacelles on pylons. Scout: a small saucer, nacelles slung low. These are generic Starfleet-era forms; none is traced from a canon design.
- Shields read as a hex-cell fresnel dome in `signal` that is invisible at rest and ripples outward from the impact point.

## Asteroids

- **Dark basalt with dilithium seams.** Faceted low-poly rock in near-black (`#1A1622`), split by emissive `dilithium` veins. The silhouette edge carries a thin violet rim light, so rocks read against deep space at a glance.
- **Breaking one shows what it was for.** A fracture splits a rock into two or three smaller rocks along its seams and throws out glowing violet crystal shards; the shards are the dilithium the player collects. The XP economy is visible in the rock itself.
- Rocks harden over a run (2 to 5 hits). A hardened rock shows more crystal and less basalt.

## Hostile factions

Warm, and each asks a different question. Hull colour, emissive colour and silhouette all change by faction.

| Faction | Hull and light | Silhouette | Signature |
|---|---|---|---|
| Klingon | Bronze-green hull, `faction-klingon` light | Swept wings, forward head | Pincer wing that dives together |
| Cardassian | Ochre hull, `faction-cardassian` light | Long spine, fan of emitters | Fans of fire, a wall of escorts |
| Romulan | Teal-green hull, `faction-romulan` light | Wide double wings | Cloak shimmer, a plasma torpedo you can shoot down |
| Borg | Black lattice cube, `nominal` light | A cube with a lit grid | Cutting beam, tractor lock, adaptation glow |
| Tholian | Crystalline amber, `faction-tholian` light | Faceted shard | Webs in `dilithium` violet |

## Sectors

Three sectors, each ending in a flagship fight. These are working proposals until the Phase 4 brief is confirmed.

| Sector | Name | Key light | Palette | Environment |
|---|---|---|---|---|
| 001 | Sol belt | A small, hard amber sun | Violet rock on deep blue-black, warm dust | Dense belt, clear sight lines; the tutorial sector |
| 002 | Ion front | Cold teal from inside the cloud | Teal and magenta nebula, lightning flashes | Visibility drops in storm bands; the scanner (and the HUD's brackets) flicker |
| 003 | The well | An accretion ring in `command` amber | Black, amber, lensed starlight | Gravity bends shots and drags the ship toward the centre; the tilted rings of the title screen are this sector's sky |

## Lighting and post-processing

- One key light per sector (the sun or the ring), a cool `signal`-tinted rim light from behind the camera, and very little ambient: space is dark and contrast is the point.
- Bloom applies only above a high threshold, so only emissives bloom: ship lights, fire, dilithium seams, shards, explosions. Panels and hulls never do.
- Tone mapping keeps whites from clipping; the ship's cyan must stay cyan at full brightness.
- Phones run the medium or low quality tier: half-resolution bloom, no shadows on rocks, fewer shards.

## Effects

| Event | Look |
|---|---|
| Phaser shot | A short `signal` beam with a white core, 2 to 3 frames of muzzle flash |
| Torpedo | A white-cyan point with a trailing ring every few frames; a spherical shockwave on detonation |
| Hostile fire | The faction colour, always warm, never cyan |
| Rock destroyed | White flash, violet bloom, crystal shards, a small shake |
| Ship destroyed | White flash, faction-coloured fireball, ember sparks, a larger shake and a held frame |
| Hull hit | An `alert` flash at the screen edges, chromatic split for 4 frames, the hull plate breaks out of the HUD |
| Overcharge release | A `signal` ring that sweeps out from the hull and burns through rock and fire |

## The HUD in the world

Some instruments live in the 3D scene, because the player is looking at the ship and not at the corners:

- **The overcharge ring:** 28 segments on a tilted orbit under the ship, lighting as near misses charge it.
- **The tractor radius:** a faint dashed ring at the dilithium pull radius, shown only while shards are moving toward you.
- **The capital ship's tag:** name, hull meter and fuse, on a leader line in target-lock brackets.
