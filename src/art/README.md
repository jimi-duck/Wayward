# Artwork

Pictures made outside the game live here, one file per slot:
`src/art/<folder>/<id>.webp` (`.avif`, `.png` and `.jpg` also work). The build
finds them on its own; a picture that is not there leaves the screen as it was.

| Folder | Ids | Size | Shown in |
| --- | --- | --- | --- |
| `captains/` | `vance`, `calloway`, `vance-scarred`, … | 640×800 | comms call |
| `contacts/` | `story_sam`, `foreman`, … | 640×800 | comms call |
| `emblems/` | `custody`, `gutter`, … | 256×256, white on transparent | comms call |
| `ships/` | `lancer`, `picket`, … | 960×480, on black | comms call (the read) |
| `places/` | `kellern`, `gutter`, `netted`, … | 1280×320 | port |
| `endings/` | `broadcast`, `vanish`, … | 1280×720 | the Threshold, Archive |
| `sightings/` | `saw_thren`, … | 800×600 | Archive |
| `file/` | `frag_order`, … | 800×600 | Archive |
| `regions/` | `reach`, `hollows`, … | 1280×480 | not drawn yet |
| `fleet/` | `capital-vance`, `tanker`, `wayward-rig`, … | 960×480, on black | not drawn yet |
| `jobs/` | `sc_toll`, `sc_wire`, … | 1280×720 | job offer card (the picture, cropped square) |
| `phenomena/` | `veil`, `well`, … | 800×600 | not drawn yet |
| `gates/` | `reach`, `breaker-yards`, … | 1280×720 | not drawn yet |
| `planets/` | `rocky`, `ice`, `gas`, `dead` | 1280×720 | not drawn yet |
| `debrief/` | `castoff`, `limping` | 1280×720 | not drawn yet |
| `baybanners/` | one per refit bay tab | 1280×720 | not drawn yet |

The full list, with a prompt for each, is `docs/art/briefs.md`
(`npm run art:brief` rewrites it). The plan, the workflow and the style rules are
[docs/ART-SLOTS.md](../../docs/ART-SLOTS.md). `npm run art:prep -- <folder>`
crops, resizes and converts raw generator output into these files.
`npm test` fails on a file whose name the game does not use.
