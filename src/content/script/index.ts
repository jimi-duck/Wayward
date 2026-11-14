import type { Row } from '../../sim/script';
import { ARRIVAL_ROWS } from './arrivals';
import { BROADCAST_ROWS } from './broadcasts';
import { LEG_ROWS } from './legs';
import { NARROWS_ROWS } from './narrows';
import { REACH } from './reach';

/** Every stop's rows: the Reach, the Narrows, the seven legs past it and their arrivals, and the Continuance's broadcasts. A row's id is its key in `carry.seen`, so ids never change. */
export const SCRIPT: Row[] = [...REACH, ...NARROWS_ROWS, ...LEG_ROWS, ...ARRIVAL_ROWS, ...BROADCAST_ROWS];
