// The node's default "icon" when it has none — always exactly 2 characters (never 1, never 3+)
// so every node's fallback badge looks visually consistent regardless of how short its title/id
// happens to be.
export function generateInitials(title) {
    const trimmed = String(title ?? '').trim();
    if (!trimmed) return '';
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
        const w = words[0];
        return (w.length >= 2 ? w.slice(0, 2) : w[0] + w[0]).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
}
