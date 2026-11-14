import type { Row } from '../../sim/script';
import { ARRIVAL_ROWS } from './arrivals';
import { BROADCAST_ROWS } from './broadcasts';
import { CHARTER_ROWS } from './charter';
import { EVIDENCE_ROWS } from './evidence';
import { THRESHOLD_ROWS } from './threshold';
import { RESISTANCE_ROWS } from './resistance';
import { LEG_ROWS } from './legs';
import { NARROWS_ROWS } from './narrows';
import { REACH } from './reach';

/** Every stop's rows: the Reach, the Narrows, the seven legs past it and their arrivals, the Continuance's broadcasts, the Charter the present-day evidence the Threshold scene and the divided resistance. A row's id is its key in `carry.seen`, so ids never change. */
export const SCRIPT: Row[] = [...REACH, ...NARROWS_ROWS, ...LEG_ROWS, ...ARRIVAL_ROWS, ...BROADCAST_ROWS, ...CHARTER_ROWS, ...EVIDENCE_ROWS, ...THRESHOLD_ROWS, ...RESISTANCE_ROWS];
