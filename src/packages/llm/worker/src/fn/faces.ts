import type { Label } from './types.ts';

/** A `divisions` row's editable face — name, description, avatar, on/off, language (never `meta`). */
export interface FaceRow { id: string; title: string; description: string; pics: string; status: string; lang: string; sector: string; fn: string; owner: string }
export interface FnFace { id: string; fn: string; kind: string; title: Label; description?: Label }
export interface SectorFace { id: string; title: Label; name: Label; icon: string; tints: string[]; released: boolean; functions: FnFace[]; system: FnFace[] }
export interface FnView extends FnFace { name: string; about: string; pics: string; status: 'active' | 'inactive'; lang: string }
export interface SectorView extends Omit<SectorFace, 'functions'> { functions: FnView[] }

/** Faces from the rows, field by field: the owner's own row (a hub's, or a platform site's '@<host>'), then the
 *  platform row (owner ''); other owners never show. A blank field of the own row falls through to the platform's. */
export function mergeFaces(sectors: SectorFace[], rows: FaceRow[], owner: string): SectorView[] {
  const of = (id: string, o: string) => rows.find(r => r.owner === o && `${r.sector}.${r.fn}` === id);
  const pick = (id: string, key: keyof FaceRow): string => {
    const own = owner ? of(id, owner) : undefined;
    return String(own?.[key] || of(id, '')?.[key] || '');
  };
  return sectors.map(s => ({
    ...s,
    functions: s.functions.map(f => ({
      ...f,
      name: pick(f.id, 'title'),
      about: pick(f.id, 'description'),
      pics: pick(f.id, 'pics'),
      status: pick(f.id, 'status') === 'inactive' ? 'inactive' as const : 'active' as const,
      lang: pick(f.id, 'lang') || 'vi',
    })),
  }));
}

/** Display name of a department: the name its row gives, else the base title in `lang`. */
export const faceTitle = (f: { name?: string; title: Label }, lang = 'vi') => f.name || (lang === 'en' ? f.title.en : f.title.vi);
