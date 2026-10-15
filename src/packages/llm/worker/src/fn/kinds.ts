import type { FnKey, Label } from './types.ts';

/**
 * Every handoff kind (spec §17, §21–§28) and the ONE function that produces it. Invariant: KINDS[k].source's base spec
 * lists k in `produces` — a kind nobody produces would leave every reader planned beside its source waiting forever.
 */
export const KINDS: Record<string, { source: FnKey } & Label> = {
  context: { source: 'secretary', vi: 'Bối cảnh dẫn xuất', en: 'Derived context' },
  routing: { source: 'secretary', vi: 'Phân công', en: 'Routing' },
  'product.value': { source: 'product', vi: 'Gói giá trị sản phẩm', en: 'Product value package' },
  'product.spec': { source: 'product', vi: 'Gói đặc tả sản phẩm', en: 'Product specification package' },
  'product.quality': { source: 'product', vi: 'Yêu cầu chất lượng sản phẩm', en: 'Product quality requirements' },
  'marketing.insight': { source: 'marketing', vi: 'Gói insight khách hàng', en: 'Customer insight package' },
  'marketing.demand': { source: 'marketing', vi: 'Gói nhu cầu & thông điệp', en: 'Demand & messaging package' },
  'finance.economics': { source: 'finance', vi: 'Gói kinh tế', en: 'Economics package' },
  'finance.people': { source: 'finance', vi: 'Kế hoạch nhân sự', en: 'Workforce plan' },
  'strategy.brief': { source: 'strategy', vi: 'Định hướng chiến lược', en: 'Strategic brief' },
  'strategy.econFrame': { source: 'strategy', vi: 'Khung kinh tế', en: 'Economic frame' },
  'commercial.offer': { source: 'commercial', vi: 'Gói chào bán', en: 'Commercial offer package' },
  'commercial.sla': { source: 'commercial', vi: 'Yêu cầu chăm sóc khách hàng', en: 'Customer success requirements' },
  'ops.package': { source: 'operations', vi: 'Gói vận hành', en: 'Operating package' },
  'ops.controls': { source: 'operations', vi: 'Điểm kiểm soát vận hành', en: 'Operational control points' },
  'supply.package': { source: 'supply', vi: 'Gói cung ứng', en: 'Supply package' },
  'quality.findings': { source: 'quality', vi: 'Kết quả kiểm soát chất lượng', en: 'Quality findings' },
  'tech.package': { source: 'technology', vi: 'Gói công nghệ', en: 'Technology package' },
  decision: { source: 'integration', vi: 'Quyết định tích hợp', en: 'Integrated decision' },
};

/** Public names of the 9 functions + the system steps — a function without a base spec yet still has a name to report. */
export const FN_TITLES: Record<string, Label> = {
  strategy: { vi: 'Chiến lược & Quản trị', en: 'Strategy & Governance' },
  product: { vi: 'Sản phẩm & Đổi mới', en: 'Product & Innovation' },
  marketing: { vi: 'Marketing & Tăng trưởng', en: 'Marketing & Growth' },
  commercial: { vi: 'Thương mại & Khách hàng', en: 'Commercial & Customer' },
  operations: { vi: 'Vận hành & Giao hàng', en: 'Operations & Delivery' },
  supply: { vi: 'Cung ứng & Mua hàng', en: 'Supply & Procurement' },
  quality: { vi: 'Chất lượng & Hiệu suất', en: 'Quality & Performance' },
  finance: { vi: 'Tài chính & Nhân sự', en: 'Finance & People' },
  technology: { vi: 'Công nghệ & Dữ liệu', en: 'Technology & Intelligence' },
  secretary: { vi: 'Thư ký', en: 'Secretary' },
  integration: { vi: 'Tích hợp', en: 'Integration' },
};

export const kindLabels = (): Record<string, Label> =>
  Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [k, { vi: v.vi, en: v.en }]));

/** A function's reading edges (§18) — structurally a task.ts GraphNode. */
export interface Reader { fn: string; needs: string[]; uses: string[] }

/** The functions that read a handoff kind — a hard `needs` or a soft `uses` (P3-13). */
export const readersOf = (graph: readonly Reader[], kind: string): string[] =>
  graph.filter(n => n.needs.includes(kind) || n.uses.includes(kind)).map(n => n.fn);
