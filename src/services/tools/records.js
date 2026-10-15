// src/services/tools/records.js
//
// Record helpers shared by the schema-driven CRUD shells — auth/svc-resources.js (admin pages) and
// auth/svc-records.js (svc-node panels): nested merge for dot-path updates, CSV round-trip by schema.
// Pure functions, no DOM beyond downloadCsv().

import { parseCsvRows, formatDateTime, parseDateTime, getPath, isObject } from './util.js';

// System fields — in no table's schema, handled separately both ways by CSV
export const DATE_FIELDS = ['created_at', 'updated_at', 'deleted_at'];

export function deepMerge(target, source) {
    const out = { ...target };
    for (const [k, v] of Object.entries(source)) {
        out[k] = (v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object')
            ? deepMerge(out[k], v) : v;
    }
    return out;
}

/** jsonb/json columns may arrive as a string — parse so they can be merged. */
export const asObject = (v) => {
    if (isObject(v)) return v;
    if (typeof v === 'string' && v.trim().startsWith('{')) { try { return JSON.parse(v); } catch {} }
    return null;
};

/** CSV text → [{ header: value }] (BOM stripped, blank lines dropped; needs a header + ≥ 1 row). */
export function parseCsvText(text) {
    const rows = parseCsvRows(text.replace(/^﻿/, '')).filter(r => r.some(c => c.trim() !== ''));
    if (rows.length < 2) return [];
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).map(vals => Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').trim()])));
}

/**
 * Rows → CSV text. Importable columns export their RAW value (render is display formatting and loses
 * data on the round-trip); only truly read-only columns use render. `meta.*` columns fold back into one
 * "meta" JSON column; headers are storage keys (not translated labels) so a re-import matches.
 */
export function recordsToCsv(data, schema) {
    const allCols = schema.filter(c => c.type !== 'photor' && c.type !== 'password' && c.width);
    const metaCols  = allCols.filter(c => (c.key || '').startsWith('meta.'));
    const plainCols = allCols.filter(c => !metaCols.includes(c));
    const dateCols  = DATE_FIELDS.map(f => ({ __dateField: f }));
    const cols      = [...(metaCols.length ? [...plainCols, { __metaRaw: true }] : plainCols), ...dateCols];

    const header = cols.map(c => `"${c.__metaRaw ? 'meta' : (c.__dateField || c.key || c.field)}"`).join(',');
    const body   = data.map(row =>
        cols.map(col => {
            if (col.__metaRaw) {
                const raw = typeof row.meta === 'string' ? row.meta : JSON.stringify(row.meta ?? {});
                return `"${raw.replace(/"/g, '""')}"`;
            }
            if (col.__dateField) return `"${formatDateTime(row[col.__dateField])}"`;
            const v          = getPath(row, col.key || col.field) ?? '';
            const importable = col.write !== false || col.csvWrite;
            const raw = importable
                ? (col.suffix && v !== '' ? `${v} ${col.suffix}` : v)
                : (col.render ? col.render(v, row) : v);
            return `"${String(raw).replace(/"/g, '""')}"`;
        }).join(',')
    ).join('\n');
    return '﻿' + header + '\n' + body;
}

export function downloadCsv(text, filename) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8;' }));
    const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Columns a CSV import may write — `csvWrite` lets a write:false column still take CSV data (vd products.score). */
export const csvWriteCols = (schema) => schema.filter(c => (c.write !== false || c.csvWrite) && c.type && c.type !== 'password');

/**
 * One parsed CSV row → flat record { storageKey: value } for `writeCols`. Headers match the storage key
 * (current export) → label / field (old exports, hand-written CSV); unknown headers holding JSON fold into
 * dot-paths of that object. Returns { flat } or { missing: col } when a required column is empty.
 */
export function csvRowToFlat(row, writeCols) {
    const keyMap   = Object.fromEntries(writeCols.map(c => [c.key || c.field, c]));
    const labelMap = Object.fromEntries(writeCols.map(c => [c.label, c]));
    const fieldMap = Object.fromEntries(writeCols.map(c => [c.field, c]));
    const flat = {};

    for (const [header, val] of Object.entries(row)) {
        const col = keyMap[header] || labelMap[header] || fieldMap[header];
        if (col) {
            flat[col.key || col.field] = col.type === 'number' ? Number(val || 0) : val;
            continue;
        }
        if (DATE_FIELDS.includes(header)) {
            // Blank / malformed → skipped so the new-doc defaults apply
            const ms = parseDateTime(val);
            if (ms != null) flat[header] = new Date(ms).toISOString();
            continue;
        }
        const trimmed = (val || '').trim();
        if (!trimmed.startsWith('{')) continue;
        try {
            for (const [k, v] of Object.entries(JSON.parse(trimmed))) {
                const dk = `${header}.${k}`;
                if (dk in flat) continue;
                flat[dk] = keyMap[dk]?.type === 'number' ? Number(v || 0) : String(v ?? '');
            }
        } catch {}
    }

    const missing = writeCols.filter(c => c.required).find(c => !String(flat[c.key || c.field] ?? '').trim());
    return missing ? { missing } : { flat };
}
