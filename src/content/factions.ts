import type { Standing } from '../sim/comms';
import type { Faction } from '../sim/enemies';

// ── factions: notice and nemeses ──────────────────────────────────────────
// How each faction that flies against the Wayward takes it when you break its
// ships, as data. sim/notice.ts keeps the score; this says what it costs and
// what it brings. Notice is how much a faction has marked your hull, in
// points: a kill adds some (more for a cruiser, a lot for a capital ship),
// and it fades by so much a day. As it climbs it crosses the tiers:
//
//   warning · a bulletin or word in the bars: cards that say they know you.
//   toll    · their fees go up when they have you on the channel.
//   hunters · their pursuit comes oftener and harder (Custody from behind,
//             Gutter crews from ahead).
//   captain · one of theirs takes it personally: a named captain (content/captains.ts),
//             who comes for you in system after system until beaten for good.
//
// Kills cost standing too: every `standingPer` points of notice is one
// standing lost with whoever the faction answers to.

/** Notice tiers, in the order they come. */
export type Tier = 'quiet' | 'warning' | 'toll' | 'hunters' | 'captain';
export const TIERS: readonly Tier[] = ['quiet', 'warning', 'toll', 'hunters', 'captain'];

export interface FactionNotice {
  name: string;
  /** Who loses standing when you kill their ships (null: nobody you can stand with). */
  standing: Standing | null;
  /** Notice per kill by hull role, and per capital ship. */
  kill: { interceptor: number; cruiser: number; special: number; capital: number };
  /** Notice that fades a day. */
  decay: number;
  /** Notice at which each tier begins. */
  at: Record<Exclude<Tier, 'quiet'>, number>;
  /** Points of notice per standing lost. */
  standingPer: number;
  /** At toll and above: their fees are multiplied by this. */
  toll: number;
  /** At hunters and above: their pursuit's interval is multiplied by this, and its elite chance raised by `elite`. */
  hunt: number;
  elite: number;
  /** The log line when a tier is reached. */
  lines: Record<Exclude<Tier, 'quiet'>, string>;
  /** Captains (content/captains.ts), named in this order; one beaten CAPTAIN_LIVES times, or killed, is gone, and the next takes it up. */
  captains: string[];
}

/** Seconds into a sortie before a captain calls. */
export const CAPTAIN_AT = 70;
/** Days a captain needs after a meeting before she comes again. */
export const CAPTAIN_REST = 2;
/** Times a captain is beaten before she is gone for good. */
export const CAPTAIN_LIVES = 2;
/** A captain's hull against an arcade run's first capital ship, before personality and memory (sim/captains.ts form). */
export const CAPTAIN_HP = 2.4;
/** Notice tops out at this much of the captain tier, so a long war can still be cooled. */
export const NOTICE_CAP = 1.5;
/** Kills alone never drive standing below this (a card can). */
export const STANDING_FLOOR = -5;
/** Of a faction's notice, the share that goes when its captain is beaten, or parts on terms (paid, or turned away). */
export const BEATEN_RELIEF = 0.4;
export const PARLEY_RELIEF = 0.2;

export const NOTICE: Record<Faction, FactionNotice> = {
  custody: {
    name: 'the Custody', standing: 'custody',
    kill: { interceptor: 1, cruiser: 2, special: 2, capital: 6 }, decay: 0.8,
    at: { warning: 4, toll: 9, hunters: 20, captain: 30 }, standingPer: 6, toll: 1.5, hunt: 0.75, elite: 0.08,
    lines: {
      warning: 'The Custody has posted a bulletin on your hull',
      toll: 'Custody fees are up for a hull like yours',
      hunters: 'The Custody has sent hunters after you',
      captain: 'A Custody captain has taken your file personally',
    },
    captains: ['vance', 'sorensen'],
  },
  gutter: {
    name: 'the Gutter', standing: 'gutter',
    kill: { interceptor: 1, cruiser: 2, special: 2, capital: 5 }, decay: 1,
    at: { warning: 4, toll: 8, hunters: 18, captain: 27 }, standingPer: 5, toll: 1.6, hunt: 0.8, elite: 0.06,
    lines: {
      warning: 'Word in the Gutter: a hauler is killing crews',
      toll: 'The Lane Wardens have put your toll up',
      hunters: 'Gutter crews are hunting you for the bounty',
      captain: 'A Gutter captain wants your hull on her wall',
    },
    captains: ['kade', 'vex'],
  },
  office: {
    name: 'the Office of Peace', standing: null,
    kill: { interceptor: 2, cruiser: 3, special: 3, capital: 8 }, decay: 0.5,
    at: { warning: 3, toll: 7, hunters: 16, captain: 24 }, standingPer: Infinity, toll: 1.4, hunt: 0.8, elite: 0.1,
    lines: {
      warning: 'The Office of Peace has opened a file',
      toll: 'Office clerks have your name on their fee schedule',
      hunters: 'Office ambush craft are on your trail',
      captain: 'An Office captain has been assigned to you',
    },
    captains: ['ashgrove', 'pell'],
  },
  voice: {
    name: 'the Voice', standing: null,
    kill: { interceptor: 1, cruiser: 2, special: 2, capital: 6 }, decay: 0.6,
    at: { warning: 5, toll: 10, hunters: 22, captain: 32 }, standingPer: Infinity, toll: 1, hunt: 0.8, elite: 0.06,
    lines: {
      warning: 'The Voice has learned your hull',
      toll: 'The Voice asks more of you',
      hunters: 'Voice probes follow your wake',
      captain: 'A foundry mind has turned toward you',
    },
    captains: ['chorus'],
  },
  thren: {
    name: 'the Thren', standing: null,
    kill: { interceptor: 1, cruiser: 2, special: 2, capital: 6 }, decay: 0.7,
    at: { warning: 5, toll: 10, hunters: 22, captain: 32 }, standingPer: Infinity, toll: 1, hunt: 0.8, elite: 0.06,
    lines: {
      warning: 'The Thren have tasted your Cyrite',
      toll: 'Thren webs thicken on your lanes',
      hunters: 'Thren shards drift toward your wake',
      captain: 'Something old among the Thren has woken',
    },
    captains: ['loom'],
  },
};
