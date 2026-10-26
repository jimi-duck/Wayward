import type { Row } from '../../sim/script';
import { NARROWS_ROWS } from './narrows';
import { REACH } from './reach';

/** Every stop's rows. A row's id is its key in `carry.seen`, so ids never change. */
export const SCRIPT: Row[] = [...REACH, ...NARROWS_ROWS];
