// Section catalog — re-export every section config as a named namespace.
// Import:  import { heroSpatialHoriNeat } from '@/sections/index.js';
// Naming:  {domain}{Ui}{VariantName}  →  heroSpatialHoriNeat
//
// Layout notation per comment:
//   col [A·B·C]      – tiersCol values (·-separated)
//   rows [A·B·C]     – tiersRow (omitted when all 'auto')
//   {render-mode}    – only when non-default: slider / masonry / steps / tabs / expansion
//   image-pinned-*   – a tier spans ≥2 rows, locking an image beside stacked content
//   no-tiers         – shop cards use flat groupCol, no tiers wrapper

// ─── BENEFITS ───────────────────────────────────────────────────────────────
// cardList – [modern] heading row full-width + checklist bullet rows
//   col [12·12]  grid
export * as benefitsModernCardList      from './benefits/modernCardList.js';

// compareTable – [modern] heading + 3-col comparison table (col-5 | divider col-2 | col-5)
//   col [12·5·2·5]  grid
export * as benefitsModernCompareTable  from './benefits/modernCardCompare.js';

// picBenefits – [modern] checklist col-5 + image col-7 span-2rows right + CTA bottom-left
//   col [5·7·5]  rows [auto·2·auto]  image-pinned-right
export * as benefitsModernPicBenefits   from './benefits/modernPicBenefits.js';

// ─── BLOG ───────────────────────────────────────────────────────────────────
// slideIntro – [modern] intro heading + horizontal slider  3 post-cards/view
//   col [12·12]  slider(3/view loop)
export * as blogModernSlideIntro        from './blog/modernSlideIntro.js';

// slideNeat – [spatial] intro heading + slider  3 glass post-cards/view
//   col [12·12]  slider(3/view loop glass)
export * as blogSpatialSlideNeat        from './blog/spatialSlideNeat.js';

// ─── CONTACT ────────────────────────────────────────────────────────────────
// horiMap – [modern] info/icons col-5 + map col-7 span-2rows right + links bottom-left
//   col [5·7·5]  rows [auto·2·auto]  map-pinned-right
export * as contactModernHoriMap        from './contact/modernHoriMap.js';

// horiMap – [spatial] same horizontal-map layout with glass/blur treatment
//   col [5·7·5]  rows [auto·2·auto]  map-pinned-right  glass
export * as contactSpatialHoriMap       from './contact/spatialHoriMap.js';

// ─── CTA ────────────────────────────────────────────────────────────────────
// neat – [modern] bg-image tier + centered heading + primary / outline buttons
//   col [12·12]  grid
export * as ctaModernNeat               from './cta/modernNeat.js';

// neat – [spatial] same centered CTA with spatial glass treatment
//   col [12·12]  grid  glass
export * as ctaSpatialNeat              from './cta/spatialNeat.js';

// neatApex – [spatial] centered CTA via apex web-boxs components
//   col [12·12]  apex
export * as ctaSpatialNeatApex          from './cta/spatialNeatApex.js';

// ─── FAQ ────────────────────────────────────────────────────────────────────
// neat – [modern] intro col-5 left  +  expansion accordion col-7 right
//   col [5·7]  expansion(openFirst:false)
export * as faqModernNeat               from './faq/modernExpansionQuestion.js';

// neatApex – [spatial] intro full-width + accordion below via apex components
//   col [12·12]  expansion  apex
export * as faqSpatialNeatApex          from './faq/spatialExpansionApex.js';

// ─── FEATURES ───────────────────────────────────────────────────────────────
// cardIntro – [modern] intro col-7 + image col-5 span-2rows right + 4×col-3 cards bottom-left
//   col [7·5·7]  rows [auto·2·auto]  image-pinned-right + card-grid
export * as featuresModernCardIntro     from './features/modernCardIntro.js';

// horiIntro – [modern] intro col-5 + feature-list col-7 span-2rows right + extra col-5 below
//   col [5·7·5]  rows [auto·2·auto]  feature-list-pinned-right
export * as featuresModernHoriIntro     from './features/modernHoriIntro.js';

// cardComponents – [spatial] intro top + apex grid of icon-colored feature cards
//   col [12·12]  apex  grid
export * as featuresSpatialCardComponents from './features/spatialCardWebApex.js';

// horiIntro – [spatial] image col-7 span-2rows left + feature rows col-5 stacked right
//   col [7·5·5]  rows [2·auto·auto]  image-pinned-left
export * as featuresSpatialHoriIntro    from './features/spatialHoriIntro.js';

// horiIntroApex – [spatial] same image-left + feature rows via apex components
//   col [7·5·5]  rows [2·auto·auto]  image-pinned-left  apex
export * as featuresSpatialHoriIntroApex from './features/spatialHoriIntroApex.js';

// ─── HERO ───────────────────────────────────────────────────────────────────
// horiBase – [modern] intro col-7 + image col-5 span-2rows right + CTA/actions bottom-left
//   col [7·5·7]  rows [auto·2·auto]  image-pinned-right
export * as heroModernHoriBase          from './hero/modernHoriBase.js';

// horiFeature – [spatial] intro col-6 + image col-6 + feature-list full-width below
//   col [6·6·12]  rows [auto·auto·auto]
export * as heroSpatialHoriFeature      from './hero/spatialHoriFeature.js';

// horiGallery – [spatial] gallery col-6 span-3rows left + intro / checklist / CTA stacked right
//   col [6·6·6·6]  rows [3·auto·auto·auto]  gallery-pinned-left
export * as heroSpatialHoriGallery      from './hero/spatialHoriGallery.js';

// horiNeat – [spatial] image col-6 span-2rows left + intro col-6 top-right + CTA col-6 bottom-right
//   col [6·6·6]  rows [2·auto·auto]  image-pinned-left
export * as heroSpatialHoriNeat         from './hero/spatialHoriNeat.js';

// neatCenterApex – [spatial] single centered tier — badge + heading + avatar row + CTA (apex)
//   col [12]  single-tier  apex
export * as heroSpatialNeatCenterApex   from './hero/spatialNeatCenterApex.js';

// splitGalleryApex – [spatial] intro col-7 + gallery col-5 span-3rows + checklist + CTA (apex)
//   col [7·5·7·7]  rows [auto·3·auto·auto]  gallery-pinned  apex
export * as heroSpatialSplitGalleryApex from './hero/spatialSplitGalleryApex.js';

// videoNeatApex – [spatial] single full-bleed tier — bg YouTube embed + centered label/heading/subtitle + explore cue (apex)
//   col [12]  single-tier  fullbleed-video  apex
export * as heroSpatialVideoNeatApex    from './hero/spatialVideoNeatApex.js';

// ─── PRICING ────────────────────────────────────────────────────────────────
// cardPlans – [modern] intro full-width + sidebar col-3 + 3-plan cards col-9
//   col [12·3·9]  rows [auto·auto·auto]  sidebar + cards-grid
export * as pricingModernCardPlans      from './pricing/modernCardPlans.js';

// cardPlans – [spatial] intro full-width + 3-tier glass pricing cards below
//   col [12·12]  grid  glass
export * as pricingSpatialCardPlans     from './pricing/spatialCardPlans.js';

// togglePlans – [spatial] intro + tabs toggle (Monthly / Annual) → 3 cards each panel
//   col [12·12]  tabs(pack:3 monthly/annual)
export * as pricingSpatialTogglePlans   from './pricing/spatialTabPlans.js';

// togglePlansApex – [spatial] same monthly/annual toggle pricing via apex components
//   col [12·12]  tabs(pack:3)  apex
export * as pricingSpatialTogglePlansApex from './pricing/spatialTabPlansApex.js';

// ─── PROCESS ────────────────────────────────────────────────────────────────
// stepTimeline – [modern] intro full-width + steps timeline (web-steps wizard)
//   col [12·[12]]  steps(idField labelField iconField)
export * as processModernStepTimeline   from './process/modernStepTimeline.js';

// ─── PRODUCTS / SHOP ────────────────────────────────────────────────────────
// cardBase – [shop] flat card: image + name + meta + price / add-to-cart  (4-row stack)
//   groupCol [12·12·12·12]  no-tiers  add-to-cart action
export * as productsShopCardBase       from './products/cardBase.js';

// cardMaverick – [shop] flat card variant: compact square image, same 4-row structure
//   groupCol [12·12·12·12]  no-tiers  compact-image
export * as productsShopCardMaverick     from './products/cardMaverick.js';

// baseInventory – [shop] ingredient/stock table: header + rows + unit actions
//   groupCol [12·12·12]  no-tiers  stock-management
export * as productsShopBaseInventory   from './another/_baseInventory.js';

// baseOrder – [shop] order management: header + order list + summary
//   groupCol [12·12·12]  no-tiers  order-tracking
export * as productsShopBaseOrder       from './another/_baseOrder.js';

// baseStaff – [shop] staff/HR panel: header + employee list + action buttons
//   groupCol [12·12·12]  no-tiers  HR-management
export * as productsShopBaseStaff       from './another/_baseStaff.js';

// ─── SHOWCASE ───────────────────────────────────────────────────────────────
// horiCase – [modern] intro col-5 left + case-study slider col-7 right  (2/view)
//   col [5·7]  slider(2/view loop) right-column
export * as showcaseModernHoriCase      from './showcase/modernHoriCase.js';

// slideNeat – [modern] full-width slider  1/view autoplay:5s  (single tier)
//   col [[12]·12]  slider(1/view autoplay:5s)
export * as showcaseModernSlideNeat     from './showcase/modernSlideNeat.js';

// slidePortfolio – [modern] intro top + portfolio slider  3/view  image-overlay + hover name
//   col [12·12]  slider(3/view loop nav)
export * as showcaseModernSlidePortfolio from './showcase/modernSlidePortfolio.js';

// ─── STATS ──────────────────────────────────────────────────────────────────
// cardRow – [modern] label row + 4×col-3 metric cards  (value + label)
//   col [12·[3]]  grid(4/row)
export * as statsModernCardRow          from './stats/modernCardRow.js';

// cardRow – [spatial] same metric-card row with glass card style
//   col [12·[3]]  grid(4/row)  glass
export * as statsSpatialCardRow         from './stats/spatialCardRow.js';

// cardRowApex – [spatial] metric cards via apex components
//   col [12·[3]]  apex
export * as statsSpatialCardRowApex     from './stats/spatialCardRowApex.js';

// ─── TEAM ───────────────────────────────────────────────────────────────────
// gridNeat – [spatial] intro heading + masonry grid of member cards (avatar + name + role)
//   col [12·12]  masonry
export * as teamSpatialGridNeat         from './team/spatialCardGridNeat.js';

// ─── TESTIMONIALS ───────────────────────────────────────────────────────────
// hori – [modern] abstract-bg col-5 left + image col-7 span-2rows right + quote-slider col-5 below
//   col [5·7·5]  rows [auto·2·auto]  slider(1/view nav) + image-pinned-right
export * as testimonialsModernHori      from './testimonials/modernHori.js';

// masonryNeat – [spatial] intro top + masonry 3-col glass quote cards
//   col [12·12]  masonry(col:3 gap:1.5rem)
export * as testimonialsSpatialMasonryNeat from './testimonials/spatialMasonryNeat.js';

// masonryNeatApex – [spatial] masonry testimonials via apex components
//   col [12·12]  masonry(col:3)  apex
export * as testimonialsSpatialMasonryNeatApex from './testimonials/spatialMasonryNeatApex.js';

// ─── TRUSTED ────────────────────────────────────────────────────────────────
// slideLogos – [modern] label tier + logo strip auto-scroll slider (infinite)
//   col [12·12]  slider(auto-scroll infinite)
export * as trustedModernSlideLogos     from './trusted/modernSlideLogos.js';

// slideLogos – [spatial] single-tier logo auto-scroll slider with glass style
//   col [12]  slider(auto-scroll)  single-tier  glass
export * as trustedSpatialSlideLogos    from './trusted/spatialSlideLogos.js';
