// src/webs/underlay/gl/quality.js
// Auto-adaptive quality tier with hysteresis, plus a manual pin.

export const TIERS = ['low', 'medium', 'high'];

const LOW_WATERMARK = 45;
const HIGH_WATERMARK = 55;
const DOWNGRADE_STREAK = 2;
const UPGRADE_STREAK = 3;

export function createQualityController(startTier) {
    let tierIndex = Math.max(0, TIERS.indexOf(startTier));
    let mode = 'auto'; // 'auto' | 'manual'
    let lowStreak = 0;
    let highStreak = 0;

    return {
        get tier() {
            return TIERS[tierIndex];
        },
        setManual(tier) {
            const idx = TIERS.indexOf(tier);
            if (idx === -1) return;
            mode = 'manual';
            tierIndex = idx;
            lowStreak = 0;
            highStreak = 0;
        },
        setAuto() {
            mode = 'auto';
            lowStreak = 0;
            highStreak = 0;
        },
        // Returns true if the tier changed as a result of this sample.
        sample(fps) {
            if (mode !== 'auto') return false;
            if (fps < LOW_WATERMARK) {
                lowStreak++;
                highStreak = 0;
            } else if (fps > HIGH_WATERMARK) {
                highStreak++;
                lowStreak = 0;
            } else {
                lowStreak = 0;
                highStreak = 0;
            }
            if (lowStreak >= DOWNGRADE_STREAK && tierIndex > 0) {
                tierIndex--;
                lowStreak = 0;
                return true;
            }
            if (highStreak >= UPGRADE_STREAK && tierIndex < TIERS.length - 1) {
                tierIndex++;
                highStreak = 0;
                return true;
            }
            return false;
        },
    };
}
