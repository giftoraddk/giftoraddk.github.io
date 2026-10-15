import type { FnKey, FnSpec } from '../types.ts';
import { STRATEGY } from './strategy.ts';
import { PRODUCT } from './product.ts';
import { MARKETING } from './marketing.ts';
import { COMMERCIAL } from './commercial.ts';
import { OPERATIONS } from './operations.ts';
import { SUPPLY } from './supply.ts';
import { QUALITY } from './quality.ts';
import { FINANCE } from './finance.ts';
import { TECHNOLOGY } from './technology.ts';
import { CONSULT } from './consult.ts';
import { SECRETARY } from './secretary.ts';
import { INTEGRATION } from './integration.ts';

/** Sector-agnostic expertise, one entry per function. The 9 departments first, in the spec's §6 order (sectorFaces keeps
 *  this order); the consult chat; then the system functions — the secretary (group-chat host + context + routing) and
 *  integration — named per sector, never listed as departments (P3-2). */
export const BASE: Partial<Record<FnKey, FnSpec>> = {
  strategy: STRATEGY, product: PRODUCT, marketing: MARKETING, commercial: COMMERCIAL, operations: OPERATIONS,
  supply: SUPPLY, quality: QUALITY, finance: FINANCE, technology: TECHNOLOGY, consult: CONSULT,
  secretary: SECRETARY, integration: INTEGRATION,
};
