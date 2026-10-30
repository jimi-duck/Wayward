# The sky and the deep

Back to front, all in `src/render/sky.ts`, `starfield.ts` and `environment.ts`. No new draw call
per frame beyond four star layers; nothing is created per frame.

| Layer | What | Moves against the ship's travel |
|---|---|---|
| Nebula | Baked once per system on the GPU (five clouds, band, dust lanes, bright wisps, a magenta accent). The dome lays a seamless detail tile over it at two scales and slides it, so the gas thins and folds without repeating. | slowly (a sine, ±4°) |
| Far worlds | A planet (rings, moon), now and then a second small world, far works. | slowly |
| Stars | Four Points layers: dust (9,500), mid (1,300), bright (110, halo, cross, twinkle), lamps (a dozen far lights, pulsing). Seeded by the sky and thicker along the band and in clumps. | each its own rate; the nearer, the more |
| Wisps and far rocks | Sprites under the plane, a few drifting dark rock clusters, tumbling hulks. | the most |

Every slide is a sine of the distance flown, so nothing runs off in a long run.

- `?quality=low`: half the stars, half the wisps and rocks, no detail tile (no extra shader work).
- Reduced motion: the twinkle, the pulse and the gas hold still.
- `?nospace` turns the sector's space features off, not the sky.
- The detail tile uses the bake's own program (`uMode`), so it adds no shader to compile.
- Not measured: GPU time. The cloud pass costs two texture reads per pixel; test on a phone.
