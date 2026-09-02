import fs   from 'node:fs';
import path from 'node:path';

// ── Parsing ──────────────────────────────────────────────────────────────────

function parseLine(line: string): string[] {
    const out: string[] = [];
    let inQ = false, cur = '';
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
            else inQ = !inQ;
        } else if (ch === ',' && !inQ) {
            out.push(cur); cur = '';
        } else {
            cur += ch;
        }
    }
    out.push(cur);
    return out;
}

function escapeVal(v: unknown): string {
    const s = String(v ?? '');
    return (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r'))
        ? '"' + s.replace(/"/g, '""') + '"'
        : s;
}

export function parseCsv(text: string): Record<string, string>[] {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
    if (lines.length < 2) return [];
    const headers = parseLine(lines[0]);
    return lines.slice(1)
        .filter(l => l.trim())
        .map(line => {
            const vals = parseLine(line);
            const row: Record<string, string> = {};
            headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
            return row;
        });
}

export function stringifyCsv(rows: any[], fields: string[]): string {
    return fields.join(',') + '\n' +
        rows.map(r => fields.map(f => escapeVal(r[f])).join(',')).join('\n');
}

// ── File I/O ──────────────────────────────────────────────────────────────────

export function readCsv(filePath: string): Record<string, string>[] {
    if (!fs.existsSync(filePath)) return [];
    return parseCsv(fs.readFileSync(filePath, 'utf-8'));
}

export function writeCsv(filePath: string, rows: any[], fields: string[]): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, stringifyCsv(rows, fields) + '\n', 'utf-8');
}

/** Seed CSV if it doesn't exist, then return its contents. */
export function readOrSeed(filePath: string, seed: any[], fields: string[]): Record<string, string>[] {
    if (!fs.existsSync(filePath)) writeCsv(filePath, seed, fields);
    return readCsv(filePath);
}
