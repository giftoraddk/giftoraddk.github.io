import type { SectorAdapter } from '../types.ts';
import { ECOMMERCE } from './ecommerce.ts';
import { EDUCATION } from './education.ts';
import { FNB } from './fnb.ts';
import { HEALTHCARE } from './healthcare.ts';
import { REALESTATE } from './realestate.ts';

/** In the order the node groups appear. A new sector = 1 adapter file (vars + patches) registered here — no base copy. */
export const SECTORS: SectorAdapter[] = [ECOMMERCE, EDUCATION, FNB, HEALTHCARE, REALESTATE];
