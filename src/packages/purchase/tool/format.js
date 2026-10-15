// Money/date/i18n helpers — pure, shared by the components and auth (PayPal amount parsing).
const LOCALES = { vi: 'vi-VN', en: 'en-US' }

/** Minor-unit digits of a currency (usd 2, vnd/jpy 0). */
export const fractionDigits = (currency) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits

/** PayPal's decimal string ("12.00") → minor units (1200). */
export const toMinor = (value, currency) => Math.round(Number(value) * 10 ** fractionDigits(currency))

/** Minor units (cents) → "$9" / "$9.50"; whole amounts drop the ".00" unless `trim` is false. */
export function formatMoney(minor, currency, lang = 'vi', { trim = true } = {}) {
    const locale = LOCALES[lang] ?? LOCALES.en
    const digits = fractionDigits(currency)
    const major = minor / 10 ** digits
    const minimumFractionDigits = trim && Number.isInteger(major) ? 0 : digits
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits, maximumFractionDigits: digits }).format(major)
}

/** Per-month equivalent of a plan price, in minor units. */
export const monthlyAmount = (price, interval) => (interval === 'year' ? Math.round(price.amount / 12) : price.amount)

/** Whole-percent saving of annual billing over 12 monthly payments (0 when there's none or a price is missing). */
export function yearlySavings(prices) {
    const month = prices?.month?.amount
    const year = prices?.year?.amount
    if (!month || !year) return 0
    return Math.max(0, Math.round((1 - year / (month * 12)) * 100))
}

/** `{ vi, en }` (or a plain string) → the string for `lang`. */
export function localize(value, lang = 'vi') {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) return value ?? ''
    return value[lang] ?? value.vi ?? value.en ?? ''
}

/** Unix seconds → a short localized date. */
export const formatDate = (unixSeconds, lang = 'vi') =>
    unixSeconds ? new Date(unixSeconds * 1000).toLocaleDateString(LOCALES[lang] ?? LOCALES.en, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
