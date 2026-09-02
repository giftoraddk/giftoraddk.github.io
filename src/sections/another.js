// Central registry: lazy-load section configs by key.
// Key format: 'domain/variant/name' mirrors the file path under src/sections/.
// configKey = '' means "keep static config from shop-config" — no override applied.
//
// Name prefix conventions:
//   base      — no background config (transparent / inherits parent bg)
//   neat      — simple design with its own background
//   hori      — horizontal / landscape layout
//   pic       — layout featuring an image as a main element
//   card      — grid of cards
//   slide     — slider / carousel layout
//   step      — step / timeline layout
//   tab       — tabbed layout
//   expansion — accordion / expandable layout

const MANIFEST = {
    // special cases
    'anotherPicPromo':        () => import('./another/_picPromo.js'),
    'anothercardArticle':     () => import('./another/_cardArticle.js'),
    'anotherHoriPost':        () => import('./another/_horiPost.js'),
    'anotherHoriArticle':     () => import('./another/_horiArticle.js'),
    'anotherPicBlog':         () => import('./another/_picBlog.js'),
    'anotherPicCta':          () => import('./another/_picCta.js'),
    'anotherPicNotify':       () => import('./another/_picNotify.js'),
    'anotherNeatCta':         () => import('./another/_neatCta.js'),
    'anotherNeatFeatures':    () => import('./another/_neatFeatures.js'),
    'anotherCardHero':        () => import('./another/_cardHero.js'),
    'anotherCardPricing':     () => import('./another/_cardPricing.js'),
    'anotherCardProduct':     () => import('./another/_cardProduct.js'),
    'anotherCardPost':        () => import('./another/_cardPost.js'),
    'anotherCardPro':         () => import('./another/_cardPro.js'),
    'anotherCardTravel':      () => import('./another/_cardTravel.js'),
    'anotherSlideNews':       () => import('./another/_slideNews.js'),
    'anotherCardProductNeat': () => import('./another/_cardProductNeat.js'),
    'anotherCardBook':        () => import('./another/_cardBook.js'),
    'anotherHoriShowcase':    () => import('./another/_horiShowcase.js'),
    'anotherCardSimple':      () => import('./another/_cardSimple.js'),
    'anotherCardBasic':       () => import('./another/_cardBasic.js'),
    'anotherCardChannel':     () => import('./another/_cardChannel.js'),
    'anotherPicShowcase':     () => import('./another/_picShowcase.js'),
    'anotherNeatStats':       () => import('./another/_neatStats.js'),
    'anotherCardTestimonials':() => import('./another/_cardTestimonials.js'),
    'anotherCardProfile':     () => import('./another/_cardProfile.js'),
    'anotherNeatTrusted':     () => import('./another/_neatTrusted.js'),
    'anotherBaseInventory':   () => import('./another/_baseInventory.js'),
    'anotherBaseOrder':       () => import('./another/_baseOrder.js'),
    'anotherBaseStaff':       () => import('./another/_baseStaff.js'),
};

// 'products/shop/card' → 'Cafe — Card'
function labelFromKey(key) {
    const parts    = key.split('/');
    const titleCase = s => s.charAt(0).toUpperCase() + s.slice(1).replace(/([A-Z])/g, c => ' ' + c);
    return parts.slice(1).map(titleCase).join(' — ');
}

/**
 * Returns select options for all configs under a domain.
 * @param {string} domain  e.g. 'products'
 * @returns {{ value: string, label: string }[]}
 */
export function getConfigsForDomain(domain) {
    return Object.keys(MANIFEST)
        .filter(key => key.startsWith(domain + '/'))
        .map(key => ({ value: key, label: labelFromKey(key) }));
}

/**
 * Lazy-loads and returns the config object for a given key.
 * Returns null if key is not in registry.
 * @param {string} configKey  e.g. 'products/shop/card'
 * @returns {Promise<object|null>}
 */
export async function resolveConfig(configKey) {
    const loader = MANIFEST[configKey];
    if (!loader) return null;
    const mod = await loader();
    return mod.config ?? null;
}
