import type { Faction } from '../sim/enemies';
import { hex } from './palette';

/**
 * Faction colours for text and marks (brand v1.1, § 16). The Continuance's
 * arms wear its red, black and white: the Custody in alert red, the Office of
 * Peace in a paler official red. The Gutter are frontier independents, in
 * faded rust; the Voice in cold steel; the Thren in a biological green that
 * is not any human faction's.
 */
export const NEON_CSS: Record<Faction, string> = {
  gutter: hex('faction-gutter'),
  custody: hex('alert'),
  office: hex('faction-office'),
  voice: hex('faction-voice'),
  thren: hex('faction-thren'),
};
