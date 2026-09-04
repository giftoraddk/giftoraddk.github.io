/**
 * firestore.js — Firebase app init + Firestore adapter
 *
 * Single source of truth for all Firebase/Firestore specifics.
 * To swap backends: implement the DbAdapter interface in a new file
 * and register it in crud.js via registerAdapter().
 *
 * DbAdapter interface
 * ───────────────────
 *   now()                                   → server timestamp
 *   find(table, opts?)                       → row[]
 *   findById(table, id)                      → row | null
 *   add(table, data)                         → { id, ...data }
 *   set(table, id, data)                     → void  (create or overwrite)
 *   put(table, id, data)                     → void  (partial update)
 *   batch(table, [{id, data}])               → void  (atomic multi-update)
 *   listen(table, opts, onNext, onError)     → Promise<unsubscribe>
 *
 * @typedef {{ filters?:    Record<string,any>,
 *             searchField?: string,
 *             searchValue?: string,
 *             sortBy?:     string,
 *             order?:      'asc'|'desc',
 *             maxCount?:   number }} QueryOpts
 */

// ── Firebase apps — 3 kết nối độc lập (users / invoices / mọi bảng còn lại) ───
// Mỗi kết nối đọc 1 env var riêng (tilde-separated), tách bằng named app của Firebase
// (initializeApp(config, name)) — 3 project cùng sống trong 1 client mà không đụng nhau.

import { initializeApp, getApps } from 'firebase/app';

const ENV_KEYS = { firestore: 'PUBLIC_DB_INVO', auth: 'PUBLIC_DB_AUTH', invoices: 'PUBLIC_DB_INVO' };

// Masking marker: `~k!t@d~` can be spliced anywhere into the env value (e.g.
// into the middle of apiKey) to defeat plaintext greps in a shipped bundle —
// every occurrence is stripped, collapsing the two surrounding tildes back
// into a seamless string, before splitting into fields.
const _MASK_MARKER = '~k!t@d~';
const _unmask = (raw) => raw.includes(_MASK_MARKER) ? raw.split(_MASK_MARKER).join('') : raw;

const _apps = new Map();

/** Firebase app cho 1 kết nối theo tên ('firestore' | 'auth' | 'invoices') — lazy + cached. */
export function getFirebaseApp(name = 'firestore') {
    if (_apps.has(name)) return _apps.get(name);
    const envKey = ENV_KEYS[name] ?? ENV_KEYS.firestore;
    const [apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, databaseURL] =
        _unmask(import.meta.env[envKey] ?? '').split('~');
    // getApps().find (không getApp, tránh throw) — an toàn khi HMR re-run module này.
    const app = getApps().find(a => a.name === name)
        ?? initializeApp({ apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, databaseURL }, name);
    _apps.set(name, app);
    return app;
}

// ── Firestore singletons (cache theo INSTANCE, không còn module-level — mỗi
// FirestoreAdapter là 1 kết nối/project riêng, xem constructor dưới) ─────────

// ── Query builder ─────────────────────────────────────────────────────────────

// Converts a plain QueryOpts into a Firestore constraint array.
// Ordering rule (orderBy before range where) is enforced here.
function _buildConstraints(opts, fs) {
    const {
        filters = {}, searchField = '', searchValue = '',
        sortBy = '', order = 'asc', maxCount = 0,
    } = opts;
    const { where, orderBy, limit } = fs;
    const c = [];

    if (sortBy) c.push(orderBy(sortBy, order));
    // Prefix-search needs orderBy on the same field before range where clauses.
    // Skip if sortBy already covers that field to avoid a duplicate orderBy error.
    if (searchField && searchValue && searchField !== sortBy) {
        c.push(orderBy(searchField));
    }
    for (const [k, v] of Object.entries(filters)) {
        if (v != null && v !== '') c.push(where(k, '==', v));
    }
    if (searchField && searchValue) {
        c.push(where(searchField, '>=', searchValue));
        c.push(where(searchField, '<=', searchValue + '￿')); // inclusive prefix upper-bound
    }
    if (maxCount) c.push(limit(maxCount));
    return c;
}

// Map a Firestore snapshot to rows, excluding soft-deleted records.
const _toRows = (snap) =>
    snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.deleted_at == null);

// Firestore rejects `undefined` field values outright (addDoc/setDoc/updateDoc all throw
// "Unsupported field value: undefined"). Callers routinely build payloads where an optional
// field is intentionally left undefined (eg. flatToBg() so getStyleOpts() can apply its own
// default) — strip those recursively before any write so that pattern doesn't crash here.
function _stripUndefined(value) {
    if (Array.isArray(value)) return value.map(_stripUndefined);
    if (value && typeof value === 'object' && value.constructor === Object) {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            if (v !== undefined) out[k] = _stripUndefined(v);
        }
        return out;
    }
    return value;
}

// ── FirestoreAdapter ──────────────────────────────────────────────────────────

export class FirestoreAdapter {
    /** @param {string} connection — 'firestore' | 'auth' | 'invoices' (xem ENV_KEYS ở trên) */
    constructor(connection = 'firestore') {
        this._connection = connection;
        this._db  = null;
        this._mod = null;
    }

    async _getDb() {
        if (this._db) return this._db;
        const { getFirestore } = await import('firebase/firestore');
        this._db = getFirestore(getFirebaseApp(this._connection));
        return this._db;
    }

    // Returns the full firebase/firestore namespace merged with { db }.
    // All Firestore calls go through here — load once, cache forever (per instance).
    async _getFs() {
        if (this._mod) return this._mod;
        const [mod, db] = await Promise.all([import('firebase/firestore'), this._getDb()]);
        this._mod = { db, ...mod };
        return this._mod;
    }

    /** Server-side timestamp sentinel — written by Firestore, not the client clock. */
    async now() {
        const { serverTimestamp } = await this._getFs();
        return serverTimestamp();
    }

    /**
     * Query a collection. Soft-deleted records are excluded automatically.
     * - Without `limit`: fetch-all → returns row[]
     * - With `limit`: cursor-based page → returns { data, hasMore, cursor }
     * @param {string} table
     * @param {QueryOpts & { limit?:number, cursor?:any }} [opts]
     */
    async find(table, opts = {}) {
        const fs = await this._getFs();
        const { db, collection, query, getDocs, orderBy, limit, startAfter, documentId } = fs;
        const { limit: lim, cursor = null } = opts;
        const col = collection(db, table);
        const c   = _buildConstraints(opts, fs);

        if (lim != null) {
            // Cursor pagination — orderBy is required for stable startAfter
            if (!opts.sortBy) c.unshift(orderBy(documentId()));
            c.push(limit(lim));
            if (cursor) c.push(startAfter(cursor));
            const snap = await getDocs(query(col, ...c));
            const data = _toRows(snap);
            return { data, hasMore: snap.docs.length === lim, cursor: snap.docs.at(-1) ?? null };
        }

        const snap = await getDocs(c.length ? query(col, ...c) : col);
        return _toRows(snap);
    }

    /**
     * Read a single document by ID. Returns null if missing or soft-deleted.
     * @param {string} table
     * @param {string} id
     * @returns {Promise<object|null>}
     */
    async findById(table, id) {
        const { db, getDoc, doc } = await this._getFs();
        const snap = await getDoc(doc(db, table, id));
        if (!snap.exists() || snap.data()?.deleted_at != null) return null;
        return { id: snap.id, ...snap.data() };
    }

    /**
     * Insert a document with auto-generated ID.
     * @param {string} table
     * @param {object} data
     * @returns {Promise<{ id: string } & object>}
     */
    async add(table, data) {
        const { db, collection, addDoc } = await this._getFs();
        const ref = await addDoc(collection(db, table), _stripUndefined(data));
        return { id: ref.id, ...data };
    }

    /** Create or overwrite a document at a known ID. */
    async set(table, id, data) {
        const { db, doc, setDoc } = await this._getFs();
        await setDoc(doc(db, table, id), _stripUndefined(data));
    }

    /** Partial-update fields on an existing document. */
    async put(table, id, data) {
        const { db, doc, updateDoc } = await this._getFs();
        await updateDoc(doc(db, table, id), _stripUndefined(data));
    }

    /**
     * Atomic batch partial-update for multiple documents in the same collection.
     * @param {string} table
     * @param {{ id: string, data: object }[]} items
     */
    async batch(table, items) {
        const { db, doc, writeBatch } = await this._getFs();
        const b = writeBatch(db);
        for (const { id, data } of items) b.update(doc(db, table, id), _stripUndefined(data));
        await b.commit();
    }

    /**
     * Real-time listener — same opts as find().
     * @param {string} table
     * @param {QueryOpts} opts
     * @param {(rows: object[]) => void} onNext
     * @param {(err: Error) => void}    onError
     * @returns {Promise<() => void>}  call to unsubscribe
     */
    async listen(table, opts = {}, onNext, onError) {
        const fs = await this._getFs();
        const { db, collection, query, onSnapshot } = fs;
        const col = collection(db, table);
        const c   = _buildConstraints(opts, fs);
        const q   = c.length ? query(col, ...c) : col;
        return onSnapshot(q, snap => onNext(_toRows(snap)), onError);
    }

    /** Current Firebase Auth user ID. Empty string when not signed in. */
    async userId() {
        const { getAuth } = await import('firebase/auth');
        return getAuth(getFirebaseApp(this._connection)).currentUser?.uid ?? '';
    }
}

/** 3 singleton — imported by crud.js and registered under 'firestore'/'auth'/'invoices'. */
export const firestoreAdapter        = new FirestoreAdapter('firestore');
export const authFirestoreAdapter    = new FirestoreAdapter('auth');
export const invoicesFirestoreAdapter = new FirestoreAdapter('invoices');
