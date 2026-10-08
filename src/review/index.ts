import type { Sector } from '../render/sector';
import type { World } from '../sim/world';
import { Gallery } from './gallery';
import { ReviewPanel } from './panel';

/** The review world (docs/REVIEW.md): lay the gallery in a World built with `review: true`, and put up its menu and labels. Loaded only by ?dev. */
export function startReview(app: HTMLElement, world: World, sector: Sector): { frame(): void } {
  const gallery = new Gallery(world);
  gallery.onMove = () => sector.snapCamera();
  const panel = new ReviewPanel(app, world, gallery, sector);
  gallery.go(gallery.stops[0]!.id);
  // dev server only: a handle for the screenshot scripts
  if (import.meta.env.DEV) Object.assign(window, { review: gallery });
  return panel;
}
