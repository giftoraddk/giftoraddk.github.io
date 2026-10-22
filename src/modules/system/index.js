// src/modules/system/index.js — trang bán hàng / (src/pages/index.astro): AI Operations — tự động hóa
// tương tác khách hàng, tối ưu vận hành doanh nghiệp. Mọi chữ đủ { vi, en }; mặc định tiếng Anh (meta.js `page.lang`).
//   Starter = <svc-aide> (trợ lý tư vấn) + mọi tính năng của nó: kho kiến thức riêng, nạp qua API / MCP, nhúng site.
//   Pro     = Starter + <svc-talk> (Thư ký) + trọn bộ 9 phòng ban (<svc-fn>), chạy ở không gian /system/<ngành>.
// Giá + quyền của gói đọc thẳng từ purchase/tool/plans.js (PURCHASE, `grants` — llm chặn thật theo đó), nên bảng
// giá ở đây không bao giờ lệch với checkout. Mô tả phòng ban chép từ llm fn/base/*.ts (title / description).
// Không có số liệu khách hàng / đánh giá bịa — chỉ những gì sản phẩm thật sự làm.
import { PURCHASE, findPlan } from '@/packages/purchase/tool/plans.js'
import { FN_ICONS, SECRETARY_ICON, CONSULT_ICON, SECTOR_FACES } from '@/packages/llm/tool/sectors.js'
import { ZAP_PRODUCTS } from '@/packages/zap/products.js'
import { companyBar, companyContact, companySocials } from '@/modules/company.js'
import { page, CTA, PRODUCT, TAGLINE, pricingHref, sectorPath } from './meta.js'
import { LEGAL_DOCS, legalPath } from './legal.js'

export { page }

export const variant = {
	theme: 'dark',
	light: {
		ui: 'pastel',
		mainColors: '#ffbb24|#de8daf|#8c87b0|#5691c9|#e19d69|#70daa3|#e57e70', // primary|secondary|accent|info|warning|success|error
		bgColors: '',
		textColor: '',
		bgImage: '',
	},
	dark: {
		ui: 'pastel',
		mainColors: '#ffbb24|#de8daf|#8c87b0|#5691c9|#e19d69|#70daa3|#e57e70',
		bgColors: '',
		textColor: '',
		bgImage: '',
	},
	// Nền nhẹ 1 tông primary — giống mặt canvas svc-node, không lấp lánh nhiều màu. Bảng màu = styles/themes/gold.css.
	bg: {
		blur: true, quality: 'medium',
		concept: 'stars',
		tint: '#ffbb24',
		deg: 45,
		speed: 4,
		size: '1~4',
		limit: 30,
		trail: 40,
		gradient: true, total: 3, colorful: false, blobType: 'circleOverlap', blobMove: 'swap', distance: 108,
	},
}

const iconBase = {
	width: '2.5rem', height: '2.5rem', display: 'flex',
	alignItems: 'center', justifyContent: 'center', borderRadius: '0.625rem',
}
const iconBg = (colorVar) => ({ ...iconBase, background: `color-mix(in oklab, var(--${colorVar}) 16%, transparent)` })

// ── Giá từ PURCHASE ──────────────────────────────────────────────────────────────────────
const starter = findPlan('starter')
const pro = findPlan('pro')
const dollars = (cents) => String(+(cents / 100).toFixed(2))
/** Giá hiển thị "/tháng" của 1 gói theo kỳ — gói năm = amount / 12 (như svc-purchase-plans). */
const monthly = (plan, interval) => dollars(interval === 'year' ? plan.prices.year.amount / 12 : plan.prices.month.amount)
const trial = PURCHASE.trialDays

const btnPrimary = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '48px', borderRadius: '2rem', cursor: 'pointer', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '700', background: 'var(--color-primary)', color: 'var(--color-base-100)', width: '100%', boxSizing: 'border-box' }
const btnGhost = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '48px', borderRadius: '2rem', cursor: 'pointer', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '500', border: '1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent)', color: 'var(--color-base-content)', width: '100%', boxSizing: 'border-box' }

const INTRO_VIDEO = '/video/ai-operations.mp4' // public/video — video dọc 9:16 (video/README.md), thay ảnh placeholder của config

/**
 * Mục "Hai lớp" của trang này — config featureHoriIntroApex dùng chung với các landing khác (giữ nguyên ở đó), nên chỉ
 * bản sao này đổi: ô ảnh lớn bên cạnh = INTRO_VIDEO (svc-player: tự phát, tắt tiếng, lặp — có nút để bật tiếng; khung
 * giữ đúng 9:16, rộng tối đa 400px, giữa cột — phủ kín cột 7 thì video dọc bị cắt gần hết), và thẻ không có nút tròn "+"
 * ở cuối (cột chữ nhận luôn 2 cột trống).
 */
function systemIntroConfig(config) {
	const out = structuredClone(config)
	const visit = (node) => {
		if (!node || typeof node !== 'object') return
		if (node.render === 'gallery' && typeof node.value === 'string' && node.value.includes('placehold.co')) {
			Object.assign(node, {
				value: INTRO_VIDEO, render: 'player',
				style: { width: 'min(100%, 400px)', margin: '0 auto', display: 'block' },
				props: { ratio: 9 / 16, autoPlay: true, mute: true, loops: true, control: true, rounded: '1.5rem' },
			})
		}
		if (node.each === 'cards' && Array.isArray(node.children)) {
			const isLink = (col) => col.children?.some((c) => c.props?.prefix === 'ri:add-line')
			const link = node.children.find(isLink)
			const text = node.children.find((col) => col.children?.some((c) => c.source === '$item.title'))
			if (link && text) {
				node.children = node.children.filter((col) => col !== link)
				text.layout = { ...text.layout, col: String(Number(text.layout?.col || 0) + Number(link.layout?.col || 0)) }
			}
		}
		Object.values(node).forEach(visit)
	}
	visit(out)
	return out
}

/** 4 dòng tính năng (f1–f4) của 1 thẻ giá — Pro mở đầu bằng "Mọi thứ trong Starter" (featuresFrom). */
function featureSlots(plan) {
	const pick = (lang) => {
		const list = plan.features[lang]
		const base = plan.featuresFrom ? findPlan(plan.featuresFrom) : null
		return base ? [lang === 'vi' ? `Mọi thứ trong ${base.name.vi}` : `Everything in ${base.name.en}`, ...list] : list
	}
	const vi = pick('vi'), en = pick('en')
	return Object.fromEntries([0, 1, 2, 3].map((i) => [`f${i + 1}`, { vi: vi[i] ?? '', en: en[i] ?? '' }]))
}

function freeCard(interval) {
	return {
		title: { vi: 'Miễn phí', en: 'Free' },
		content: { vi: 'Hỏi thử trợ lý tư vấn ngay trên trang này', en: 'Try the consultant right on this page' },
		tab: interval === 'year' ? 'annual' : 'monthly',
		tabLabel: interval === 'year' ? { vi: 'Theo năm', en: 'Yearly' } : { vi: 'Theo tháng', en: 'Monthly' },
		meta: {
			currency: '$', price: '0',
			billing: { vi: '*không cần thẻ, không cần đăng ký', en: '*no card, no sign-up' },
			f1: { vi: 'Chat với trợ lý tư vấn mẫu', en: 'Chat with the sample consultant' },
			f2: { vi: 'Trả lời từ kiến thức chung của nền tảng', en: 'Answers from the platform\'s shared knowledge' },
			f3: { vi: 'Xem trước không gian làm việc', en: 'Preview the workspace' },
			f4: { vi: 'Nâng cấp bất cứ lúc nào', en: 'Upgrade any time' },
			btn: CTA.demo.label, badge: '', badgeStys: { display: 'none' },
			btnStys: btnGhost,
		},
	}
}

function planCard(plan, interval, cta) {
	const yearly = interval === 'year'
	const billing = yearly
		? { vi: `*thanh toán $${dollars(plan.prices.year.amount)}/năm · dùng thử ${trial} ngày`, en: `*billed $${dollars(plan.prices.year.amount)}/year · ${trial}-day trial` }
		: { vi: `*thanh toán hằng tháng · dùng thử ${trial} ngày`, en: `*billed monthly · ${trial}-day trial` }
	return {
		title: plan.name,
		content: plan.tagline,
		tab: yearly ? 'annual' : 'monthly',
		tabLabel: yearly ? { vi: 'Theo năm', en: 'Yearly' } : { vi: 'Theo tháng', en: 'Monthly' },
		meta: {
			currency: '$', price: monthly(plan, interval),
			billing,
			...featureSlots(plan),
			btn: cta.label,
			badge: plan.featured ? { vi: 'Trọn bộ', en: 'Full suite' } : '',
			badgeStys: plan.featured ? {} : { display: 'none' },
			btnStys: plan.featured ? btnPrimary : btnGhost,
		},
	}
}

const pricingTabs = ['month', 'year'].flatMap((interval) => [freeCard(interval), planCard(starter, interval, CTA.starter), planCard(pro, interval, CTA.pro)])

// ── 9 phòng ban — chép từ llm fn/base/<fn>.ts ─────────────────────────────────────
const DEPARTMENTS = [
	['strategy', { vi: 'Chiến lược & Quản trị', en: 'Strategy & Governance' }, { vi: 'Có nên làm không, theo hướng nào, trong giới hạn nào — phương án, mô hình kinh doanh, rủi ro và tiêu chí quyết định.', en: 'Whether to do it, which way and within which limits — options, business model, risks and decision criteria.' }, 'color-primary'],
	['product', { vi: 'Sản phẩm & Đổi mới', en: 'Product & Innovation' }, { vi: 'Phân tích khách hàng, thiết kế sản phẩm/dịch vụ, quy trình và tiêu chuẩn chất lượng.', en: 'Customer analysis, product/service design, process and quality bar.' }, 'color-secondary'],
	['marketing', { vi: 'Marketing & Tăng trưởng', en: 'Marketing & Growth' }, { vi: 'Phân tích khách hàng, chiến lược nội dung, bài viết SEO và ảnh minh hoạ.', en: 'Customer analysis, content strategy, SEO article and header image.' }, 'color-accent'],
	['commercial', { vi: 'Thương mại & Khách hàng', en: 'Commercial & Customer' }, { vi: 'Biến nhu cầu thành giao dịch: hành trình mua, gói chào bán, quy trình bán, xử lý phản đối và giữ chân khách.', en: 'Turns demand into sales: buying journey, offer, sales process, objection handling and retention.' }, 'color-info'],
	['operations', { vi: 'Vận hành & Giao hàng', en: 'Operations & Delivery' }, { vi: 'Biến lời hứa thành quy trình làm được, lặp lại được: sơ đồ quy trình, SOP, năng lực và giao hàng.', en: 'Turns the promise into a repeatable process: process map, SOP, capacity and delivery.' }, 'color-warning'],
	['supply', { vi: 'Cung ứng & Mua hàng', en: 'Supply & Procurement' }, { vi: 'Đúng đầu vào, đúng nhà cung cấp, đúng chi phí — đặc tả, tìm nguồn, tồn kho và phương án dự phòng.', en: 'Right input, supplier and cost — specs, sourcing, inventory and backup plans.' }, 'color-success'],
	['quality', { vi: 'Chất lượng & Hiệu suất', en: 'Quality & Performance' }, { vi: 'Tiêu chuẩn, tiêu chí nghiệm thu, kế hoạch QA/QC và bộ KPI đo được — chất lượng từ đầu.', en: 'Standards, acceptance criteria, QA/QC plans and measurable KPIs — quality built in.' }, 'color-primary'],
	['finance', { vi: 'Tài chính & Nhân sự', en: 'Finance & People' }, { vi: 'Kinh tế đơn vị, dòng tiền, rủi ro, đề xuất GO/NO-GO từ số liệu thật và kế hoạch nhân sự.', en: 'Unit economics, cash flow, risk, a GO/NO-GO call from real numbers and the workforce plan.' }, 'color-secondary'],
	['technology', { vi: 'Công nghệ & Dữ liệu', en: 'Technology & Intelligence' }, { vi: 'Phần mềm, dữ liệu, AI và tự động hoá phục vụ đúng bài toán — yêu cầu, kiến trúc, bảo mật, triển khai.', en: 'Software, data, AI and automation for the real problem — requirements, architecture, security, rollout.' }, 'color-accent'],
].map(([fn, title, content, color]) => ({ title, content, meta: { icon: FN_ICONS[fn], iconStyle: iconBg(color) } }))

export const views = [
	{
		text: PRODUCT,
		href: '/',
		iconMobile: 'ri:apps-ai-line',
		sections: [
			// ── 1. Hero ────────────────────────────────────────────────────────────────
			{
				id: 'heroSpatialNeatCenterApex',
				data: [{
					subtitle: { vi: 'AI OPERATIONS · STARTER & PRO', en: 'AI OPERATIONS · STARTER & PRO' },
					title: TAGLINE,
					description: {
						vi: 'Tự động hóa tương tác khách hàng, loại bỏ tác vụ lặp lại và điều phối 9 phòng ban bằng AI. Chuẩn hóa quy trình, giám sát hiệu suất theo thời gian thực và đo lường kết quả rõ ràng — giúp doanh nghiệp vận hành liền mạch 24/7, mở rộng hiệu quả, trong khi bạn luôn nắm quyền kiểm soát.',
						en: 'Automate customer interactions, eliminate repetitive tasks, and orchestrate 9 departments with AI. Standardize workflows, monitor performance in real time, and measure outcomes transparently — enabling seamless 24/7 operations and scalable growth while keeping you in control.',
					},
					meta: {
						titleHighlight: { vi: 'Tối ưu vận hành doanh nghiệp.', en: 'Optimize business operations.' },
						ctaPrimary: CTA.trial.label,
						ctaSecondary: CTA.docs.label,
						socialProof: { vi: `Dùng thử ${trial} ngày · huỷ bất cứ lúc nào · trợ lý mẫu ở góc phải màn hình`, en: `${trial}-day trial · cancel any time · a live sample assistant in the corner` },
					},
				}],
				config: (await import('@/sections/cards/heroNeatCenter.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 2. Con số của sản phẩm (không phải số liệu khách hàng) ─────────────────────
			{
				id: 'statCardRowApex',
				data: [{
					meta: { badge: { vi: 'TRONG MỖI GÓI', en: 'IN EVERY PLAN' } },
					stats: [
						{ value: '24/7', label: { vi: 'Trợ lý trả lời khách, không nghỉ', en: 'The consultant answers, around the clock' } },
						{ value: '1', label: { vi: 'Thẻ script để nhúng lên website', en: 'Script tag to embed it on your site' } },
						{ value: '9', label: { vi: 'Phòng ban AI trong gói Pro', en: 'AI departments in Pro' } },
						{ value: `${trial}`, label: { vi: 'Ngày dùng thử miễn phí', en: 'Days of free trial' } },
					],
				}],
				config: (await import('@/sections/cards/statRowApex.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 3. Hai sản phẩm trong một ────────────────────────────────────────────────
			{
				id: 'featureHoriIntroApex',
				data: [{
					subtitle: { vi: 'HAI LỚP, MỘT KHO KIẾN THỨC', en: 'TWO LAYERS, ONE KNOWLEDGE BASE' },
					meta: { heading: { vi: 'Bắt đầu với một trợ lý,\nlớn lên thành cả công ty', en: 'Start with one assistant,\ngrow into a whole company' } },
					cards: [
						{ title: { vi: 'Trợ lý tư vấn — svc-aide', en: 'The consultant — svc-aide' }, content: { vi: 'Khung chat nổi trên website, trả lời khách vãng lai từ kho kiến thức của bạn, kèm nguồn. Không cần khách đăng nhập. (Starter)', en: 'A floating chat on your website that answers visitors from your knowledge, with sources. No visitor sign-in. (Starter)' }, meta: { icon: CONSULT_ICON, iconStyle: iconBg('color-primary') } },
						{ title: { vi: 'Kho kiến thức riêng', en: 'Your own knowledge base' }, content: { vi: 'Nạp từ API JSON, hoặc để AI (Claude, Cursor…) nạp qua MCP — từ API, tệp hay văn bản. Tìm kiếm kết hợp vector + từ khoá. (Starter)', en: 'Load it from a JSON API, or let an AI (Claude, Cursor…) load it over MCP — from an API, a file or plain text. Hybrid vector + keyword search. (Starter)' }, meta: { icon: 'ri:book-open-line', iconStyle: iconBg('color-secondary') } },
						{ title: { vi: 'Thư ký AI — svc-talk', en: 'The AI Secretary — svc-talk' }, content: { vi: 'Sếp nhắn việc, Thư ký dựng bối cảnh, đề xuất phòng ban nào làm — bạn duyệt rồi Thư ký giao việc và theo dõi bàn giao. (Pro)', en: 'The boss sends the work; the Secretary frames it and proposes which departments take it — you approve, it routes and tracks handoffs. (Pro)' }, meta: { icon: SECRETARY_ICON, iconStyle: iconBg('color-accent') } },
						{ title: { vi: 'Trọn bộ 9 phòng ban', en: 'All 9 departments' }, content: { vi: 'Mỗi phòng có quy trình nhiều bước, đầu ra rõ ràng, đọc kiến thức đúng phạm vi của mình. Chạy cùng nhau hoặc từng phòng lẻ. (Pro)', en: 'Each runs a multi-step process with clear outputs and reads the knowledge scoped to it. Together, or one at a time. (Pro)' }, meta: { icon: 'ri:building-2-line', iconStyle: iconBg('color-info') } },
					],
				}],
				config: systemIntroConfig((await import('@/sections/cards/featureHoriIntroApex.js')).config),
				sort: 0, col: '12', container: true,
			},

			// ── 4. Cách hoạt động ─────────────────────────────────────────────────────────
			{
				id: 'processStepTimeline',
				data: [{
					subtitle: { vi: 'TỪ LÚC MUA ĐẾN LÚC TRẢ LỜI KHÁCH', en: 'FROM CHECKOUT TO THE FIRST ANSWER' },
					title: { vi: 'Lên website trong một buổi,\nkhông cần lập trình viên', en: 'Live on your site in an afternoon,\nno developer needed' },
					steps: [
						{ id: 'buy', title: { vi: 'Chọn gói, dùng thử', en: 'Pick a plan, start the trial' }, icon: 'ri:shopping-cart-2-line', content: { vi: `Thanh toán qua PayPal, ${trial} ngày đầu miễn phí. Email gửi ngay token MCP và đoạn mã nhúng của riêng bạn.`, en: `Pay with PayPal, the first ${trial} days free. An email brings your MCP token and your own embed code right away.` } },
						{ id: 'load', title: { vi: 'Nạp kiến thức', en: 'Load your knowledge' }, icon: 'ri:database-2-line', content: { vi: 'Dán đường dẫn API sản phẩm/FAQ — hệ thống tự đoán cột, xem trước rồi nạp. Hoặc bảo Claude/Cursor nạp qua MCP.', en: 'Paste your product/FAQ API — fields are guessed, you preview, then load. Or ask Claude/Cursor to load it over MCP.' } },
						{ id: 'embed', title: { vi: 'Nhúng 1 thẻ script', en: 'Drop in one script tag' }, icon: 'ri:code-s-slash-line', content: { vi: 'Thêm thẻ <script> và <svc-aide owner="…"> vào website — chạy trên mọi nền tảng: WordPress, Haravan, Shopify, HTML tĩnh.', en: 'Add a <script> tag and <svc-aide owner="…"> to your site — works on any platform: WordPress, Shopify, plain HTML.' } },
						{ id: 'answer', title: { vi: 'Trợ lý trả lời khách', en: 'The consultant answers' }, icon: 'ri:chat-smile-3-line', content: { vi: 'Khách hỏi, trợ lý tìm đúng đoạn kiến thức và trả lời kèm nguồn. Lịch sử chat nằm ở trình duyệt khách.', en: 'Visitors ask; the consultant finds the right passages and answers with sources. Chat history stays in the visitor\'s browser.' } },
						{ id: 'assign', title: { vi: 'Giao việc cho Thư ký (Pro)', en: 'Hand work to the Secretary (Pro)' }, icon: 'ri:task-line', content: { vi: 'Nhắn "lên kế hoạch ra mắt sản phẩm mới" — Thư ký đề xuất phòng ban, bạn duyệt, các phòng bắt tay vào làm.', en: 'Say "plan the launch of our new product" — the Secretary proposes departments, you approve, they get to work.' } },
						{ id: 'approve', title: { vi: 'Duyệt và bàn giao (Pro)', en: 'Approve and hand off (Pro)' }, icon: 'ri:checkbox-circle-line', content: { vi: 'Duyệt từng bước hoặc bật Tự động. Mỗi phòng bàn giao cho phòng kế tiếp, phòng Tích hợp rà chéo trước khi chốt.', en: 'Approve each step or switch on Auto. Each department hands off to the next; Integration cross-checks before the call.' } },
					],
				}],
				config: (await import('@/sections/steps/processTimeline.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 5. 9 phòng ban (Pro) ─────────────────────────────────────────────────────
			{
				id: 'featureCardWeb',
				data: [{
					subtitle: { vi: 'GÓI PRO · TRỌN BỘ PHÒNG BAN', en: 'PRO · EVERY DEPARTMENT' },
					description: {
						vi: 'Mỗi phòng là một chuyên gia AI có quy trình riêng. Thư ký chọn đúng phòng cho từng việc, phòng Tích hợp rà chéo bàn giao theo 14 tiêu chí và ra quyết định: duyệt, duyệt có điều kiện, tạm hoãn hay từ chối.',
						en: 'Each department is an AI specialist with its own process. The Secretary picks the right ones for each job; Integration cross-checks the handoffs on 14 dimensions and decides: approve, approve with conditions, hold or reject.',
					},
					meta: { heading: { vi: 'Chín phòng ban,\nmột Thư ký điều phối', en: 'Nine departments,\none Secretary to run them' } },
					cards: DEPARTMENTS,
				}],
				config: (await import('@/sections/masonries/featureWeb.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 6. So sánh ───────────────────────────────────────────────────────────────
			{
				id: 'benefitCardCompare',
				data: [{
					subtitle: { vi: 'SO SÁNH THẲNG THẮN', en: 'AN HONEST COMPARISON' },
					title: { vi: 'Khác gì một chatbot thông thường?', en: 'How is this different from a regular chatbot?' },
					description: {
						vi: 'Chatbot kịch bản chỉ trả lời câu đã soạn sẵn.\nAI Operations trả lời từ kiến thức thật của bạn — và làm việc thật cho bạn.',
						en: 'Scripted chatbots only answer what was written in advance.\nAI Operations answers from your real knowledge — and does real work for you.',
					},
					meta: {
						leftPanelTitle: PRODUCT,
						vsBadge: 'VS',
						rightPanelTitle: { vi: 'Chatbot kịch bản', en: 'Scripted chatbot' },
					},
					leftCards: [
						{ title: { vi: 'Trả lời từ kho kiến thức riêng, kèm nguồn', en: 'Answers from your own knowledge, with sources' } },
						{ title: { vi: 'Cập nhật bằng 1 lần nạp API hoặc qua MCP', en: 'Updated with one API load, or over MCP' } },
						{ title: { vi: 'Kiến thức tách theo ngành và phòng ban', en: 'Knowledge scoped per sector and department' } },
						{ title: { vi: 'Làm việc nhiều bước, có người duyệt (Pro)', en: 'Multi-step work with human approval (Pro)' } },
						{ title: { vi: 'Phòng ban bàn giao cho nhau, có rà chéo (Pro)', en: 'Departments hand off, with a cross-check (Pro)' } },
						{ title: { vi: 'Nhúng bằng 1 thẻ script, mọi nền tảng', en: 'One script tag, any platform' } },
					],
					rightCards: [
						{ title: { vi: 'Chỉ trả lời theo kịch bản soạn sẵn', en: 'Only answers from a pre-written script' } },
						{ title: { vi: 'Mỗi thay đổi là sửa tay từng luồng', en: 'Every change means editing flows by hand' } },
						{ title: { vi: 'Một bộ câu trả lời cho mọi tình huống', en: 'One answer set for every situation' } },
						{ title: { vi: 'Chỉ hỏi – đáp, không làm việc', en: 'Questions and answers only, no work' } },
						{ title: { vi: 'Không có quy trình, không có bàn giao', en: 'No process, no handoffs' } },
						{ title: { vi: 'Thường khoá vào một nền tảng', en: 'Often locked to one platform' } },
					],
				}],
				config: (await import('@/sections/cards/benefitCompare.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 7. Bảng giá — từ purchase/tool/plans.js ──────────────────────────────────
			{
				id: 'pricingTabPlansApex',
				data: [{
					subtitle: { vi: 'BẢNG GIÁ', en: 'PRICING' },
					description: { vi: `Giá theo USD, thanh toán qua PayPal. Dùng thử ${trial} ngày, huỷ bất cứ lúc nào.`, en: `Prices in USD, paid with PayPal. ${trial}-day trial, cancel any time.` },
					meta: { heading: { vi: 'Starter cho website.\nPro cho cả doanh nghiệp.', en: 'Starter for your website.\nPro for the whole company.' } },
					tabs: pricingTabs,
				}],
				config: (await import('@/sections/tabs/pricingPlansApex.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 8. Cam kết về dữ liệu & bảo mật — đều là cách hệ thống thật sự chạy ──────────
			{
				id: 'testimonialMasonryNeatApex',
				data: [{
					subtitle: { vi: 'DỮ LIỆU & BẢO MẬT', en: 'DATA & SECURITY' },
					meta: {
						sectionHeading: { vi: 'Kiến thức của bạn', en: 'Your knowledge' },
						sectionHeadingAccent: { vi: 'chỉ phục vụ bạn.', en: 'serves only you.' },
						sectionDescription: { vi: 'Không phải lời hứa: đây là cách hệ thống được xây.', en: 'Not a promise: this is how the system is built.' },
					},
					masonry: [
						{ title: { vi: '"Kho kiến thức tách riêng từng khách"', en: '"Every customer\'s knowledge is walled off"' }, content: { vi: 'Mỗi dòng kiến thức gắn với tài khoản của bạn; tìm kiếm vector chạy trong không gian riêng. Không ai đọc, ghi hay xoá được kiến thức của người khác.', en: 'Every row is tied to your account; vector search runs in its own namespace. No one can read, write or delete anyone else\'s knowledge.' }, pics: 'https://placehold.co/80x80/ffbb24/0d0d0d?text=01', meta: { name: { vi: 'Tách biệt', en: 'Isolation' }, handle: '#owner-scope' } },
						{ title: { vi: '"Token chỉ lưu dạng băm"', en: '"Tokens are stored only as hashes"' }, content: { vi: 'Token MCP chỉ gửi bạn 1 lần qua email; hệ thống chỉ giữ SHA-256. Lộ token thì cấp lại — token cũ hết hiệu lực ngay.', en: 'Your MCP token is emailed once; the system keeps only its SHA-256. Leaked? Reissue it — the old one stops working at once.' }, pics: 'https://placehold.co/80x80/de8daf/0d0d0d?text=02', meta: { name: { vi: 'Token', en: 'Tokens' }, handle: '#sha-256' } },
						{ title: { vi: '"Lịch sử chat nằm ở máy khách"', en: '"Chat history stays on the visitor\'s device"' }, content: { vi: 'Hội thoại của khách vãng lai lưu trong trình duyệt của chính họ, tự xoá sau 30 ngày. Máy chủ không giữ cuộc chat của khách.', en: 'Visitor conversations live in their own browser and clear after 30 days. The server keeps no visitor chats.' }, pics: 'https://placehold.co/80x80/8c87b0/0d0d0d?text=03', meta: { name: { vi: 'Riêng tư', en: 'Privacy' }, handle: '#browser-only' } },
						{ title: { vi: '"Chuyên môn nằm ở máy chủ"', en: '"The expertise stays on the server"' }, content: { vi: 'Prompt, quy trình và vai trò của các phòng ban chỉ ghép ở máy chủ — không bao giờ gửi xuống trình duyệt.', en: 'Department prompts, processes and roles are assembled on the server only — never sent to the browser.' }, pics: 'https://placehold.co/80x80/5691c9/0d0d0d?text=04', meta: { name: { vi: 'Máy chủ', en: 'Server-side' }, handle: '#no-prompt-leak' } },
						{ title: { vi: '"Bạn duyệt trước khi chốt"', en: '"You approve before it\'s final"' }, content: { vi: 'Thư ký đề xuất, bạn duyệt phân công; mỗi phòng dừng chờ duyệt ở bước quan trọng. Chế độ Tự động chỉ bật khi bạn muốn.', en: 'The Secretary proposes, you approve the routing; each department pauses for approval at the key steps. Auto runs only when you turn it on.' }, pics: 'https://placehold.co/80x80/70daa3/0d0d0d?text=05', meta: { name: { vi: 'Kiểm soát', en: 'Control' }, handle: '#human-in-the-loop' } },
						{ title: { vi: '"Hết gói là dừng, không giữ chân"', en: '"Plan ends, access ends — no lock-in"' }, content: { vi: 'Huỷ bất cứ lúc nào qua PayPal. Kiến thức nạp từ API của bạn vẫn là của bạn — nguồn gốc vẫn nằm ở hệ thống của bạn.', en: 'Cancel any time through PayPal. Knowledge loaded from your API stays yours — the source is still in your own systems.' }, pics: 'https://placehold.co/80x80/e19d69/0d0d0d?text=06', meta: { name: { vi: 'Linh hoạt', en: 'Freedom' }, handle: '#cancel-any-time' } },
					],
				}],
				config: (await import('@/sections/masonries/testimonialNeatApex.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 9. FAQ ────────────────────────────────────────────────────────────────────
			{
				id: 'faqExpansion',
				data: [{
					subtitle: { vi: 'HỎI THẲNG, ĐÁP THẬT', en: 'STRAIGHT QUESTIONS, HONEST ANSWERS' },
					description: { vi: 'Những điều khách hay hỏi trước khi chọn gói.', en: 'What people usually ask before picking a plan.' },
					title: { vi: 'Câu hỏi thường gặp', en: 'Frequently asked questions' },
					expansion: [
						{ title: { vi: 'Starter và Pro khác nhau thế nào?', en: 'What\'s the difference between Starter and Pro?' }, content: { vi: 'Starter là trợ lý tư vấn (svc-aide) với đủ tính năng: kho kiến thức riêng, nạp qua API/MCP, nhúng website. Pro gồm mọi thứ của Starter, cộng Thư ký AI (svc-talk) và trọn bộ 9 phòng ban làm việc nhiều bước cho bạn.', en: 'Starter is the consultant (svc-aide) with everything it does: your own knowledge base, loading over API/MCP, embedding on your site. Pro is all of Starter plus the AI Secretary (svc-talk) and all 9 departments doing multi-step work for you.' } },
						{ title: { vi: 'Có cần biết lập trình để nhúng không?', en: 'Do I need to code to embed it?' }, content: { vi: 'Không. Chỉ cần dán 2 dòng (thẻ script và thẻ svc-aide có sẵn owner của bạn, gửi trong email) vào phần HTML tuỳ chỉnh của website. Trang Hướng dẫn có từng bước cho WordPress, Shopify và HTML tĩnh.', en: 'No. Paste two lines (the script tag and the svc-aide tag with your owner, both in your email) into your site\'s custom HTML. The Guide walks through WordPress, Shopify and plain HTML.' } },
						{ title: { vi: 'Kiến thức nạp vào từ đâu?', en: 'Where does the knowledge come from?' }, content: { vi: 'Từ bất kỳ API JSON nào (sản phẩm, FAQ, chính sách…) — hệ thống tự đoán cột và cho xem trước; hoặc để AI như Claude, Cursor nạp qua MCP, kể cả từ tệp hay văn bản bạn đưa. Nạp lại cùng nguồn sẽ cập nhật, không nhân đôi.', en: 'Any JSON API (products, FAQ, policies…) — fields are guessed and previewed; or let an AI like Claude or Cursor load it over MCP, even from a file or text you hand it. Reloading a source updates it, never duplicates.' } },
						{ title: { vi: 'MCP là gì, tôi có cần không?', en: 'What is MCP, do I need it?' }, content: { vi: 'MCP là chuẩn để AI (Claude, Cursor, VS Code…) dùng công cụ bên ngoài. Có nó, bạn chỉ cần nói "nạp bảng giá mới vào trợ lý" và AI tự làm. Không bắt buộc — nạp từ API trong phần Cài đặt cũng đủ. Trang Hướng dẫn có nút cài 1 chạm.', en: 'MCP is the standard that lets AIs (Claude, Cursor, VS Code…) use outside tools. With it, just say "load the new price list into the assistant" and the AI does it. Optional — loading from an API in Settings works too. The Guide has one-click install.' } },
						{ title: { vi: 'Thư ký và các phòng ban chạy ở đâu?', en: 'Where do the Secretary and departments run?' }, content: { vi: 'Ở không gian làm việc trên canvas của bạn (/system/<ngành>), đăng nhập bằng tài khoản đã mua gói. Hiện ngành Thương mại điện tử đã mở; Giáo dục, F&B, Y tế, Bất động sản đang được chuyên gia rà soát trước khi mở.', en: 'In your canvas workspace (/system/<sector>), signed in with the account that bought the plan. E-commerce is open today; Education, F&B, Healthcare and Real Estate are under expert review before release.' } },
						{ title: { vi: 'Nâng cấp từ Starter lên Pro có mất gì không?', en: 'Do I lose anything upgrading from Starter to Pro?' }, content: { vi: 'Không. Kho kiến thức, token MCP và đoạn nhúng giữ nguyên; Thư ký và các phòng ban mở ngay sau khi nâng cấp, dùng luôn kho kiến thức đó.', en: 'No. Your knowledge base, MCP token and embed code stay the same; the Secretary and departments open right after the upgrade, using that same knowledge.' } },
						{ title: { vi: 'Hết hạn hoặc huỷ gói thì sao?', en: 'What happens if my plan lapses or I cancel?' }, content: { vi: 'Có 3 ngày ân hạn sau kỳ thanh toán. Sau đó trợ lý nhúng và MCP dừng phục vụ kho của bạn cho tới khi gia hạn.', en: 'There are 3 grace days past the billing period. After that the embedded consultant and MCP stop serving your knowledge until you renew.' } },
					],
				}],
				config: (await import('@/sections/expansions/faq.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},

			// ── 10. CTA ───────────────────────────────────────────────────────────────────
			{
				id: 'ctaSpatialNeatApex',
				data: [{
					subtitle: { vi: 'SẴN SÀNG BẮT ĐẦU', en: 'READY TO START' },
					title: { vi: 'Đặt trợ lý lên website hôm nay.\nGiao việc cho cả công ty khi bạn sẵn sàng.', en: 'Put the consultant on your site today.\nHand work to the whole company when you\'re ready.' },
					description: { vi: `Dùng thử ${trial} ngày. Email đầu tiên mang theo token MCP và đoạn mã nhúng — 10 phút là có trợ lý trả lời khách.`, en: `${trial}-day trial. Your first email brings the MCP token and embed code — ten minutes to a consultant answering visitors.` },
					pics: 'https://placehold.co/1400x400/ffbb24/0d0d0d?text=AI+Operations',
					meta: { ctaPrimaryLabel: CTA.trial.label, ctaSecondaryLabel: CTA.docs.label },
				}],
				config: (await import('@/sections/cards/ctaNeatApex.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
		],
	},
]

export default { variant, views }

// ── bar + menus + footer — công ty + mạng xã hội dùng chung (modules/company.js); bar mang nút đổi ngôn ngữ VI/EN ──
export const contact = companyContact({
	vi: 'AI Operations — tự động hóa tương tác khách hàng, tối ưu vận hành doanh nghiệp. \nStarter cho website, Pro cho cả doanh nghiệp.',
	en: 'AI Operations — automate customer engagement, optimize business operations. \nStarter for your website, Pro for the whole business.',
})

export const bar = companyBar(contact)

export const menuItems = [
	{
		iconMobile: 'ri:home-line',
		text: { vi: 'Sản phẩm', en: 'Product' },
		items: [
			{ text: { vi: 'Giới thiệu', en: 'Intro' }, href: '/#heroSpatialNeatCenterApex' },
			{ text: { vi: 'Hai lớp sản phẩm', en: 'Two layers' }, href: '/#featureHoriIntroApex' },
			{ text: { vi: 'Cách hoạt động', en: 'How it works' }, href: '/#processStepTimeline' },
			{ text: { vi: '9 phòng ban', en: '9 departments' }, href: '/#featureCardWeb' },
		],
	},
	{
		iconMobile: 'ri:price-tag-3-line',
		text: { vi: 'Bảng giá', en: 'Pricing' },
		items: [
			{ text: { vi: 'So sánh', en: 'Comparison' }, href: '/#benefitCardCompare' },
			{ text: { vi: 'Starter & Pro', en: 'Starter & Pro' }, href: '/#pricingTabPlansApex' },
			{ text: { vi: 'Dữ liệu & bảo mật', en: 'Data & security' }, href: '/#testimonialMasonryNeatApex' },
			{ text: { vi: 'Câu hỏi thường gặp', en: 'FAQ' }, href: '/#faqExpansion' },
			{ text: { vi: 'Mua & quản lý gói', en: 'Buy & manage' }, href: pricingHref('') },
		],
	},
	{
		iconMobile: 'ri:apps-ai-line',
		text: { vi: 'Không gian làm việc', en: 'Workspace' },
		// 1 mục / ngành — cùng nguồn SECTOR_FACES với getStaticPaths của pages/system/[sector].astro. Ngành chưa phát hành
		// vẫn vào được: page đó mở chế độ dùng thử cho mọi tài khoản đã đăng nhập (node/preset/config-sector.js).
		items: SECTOR_FACES.map((s) => ({
			text: s.title,
			href: sectorPath(s.id),
			target: '_blank', // không gian làm việc mở tab mới — giữ trang giới thiệu / hướng dẫn
		})),
	},
	{
		iconMobile: 'ri:puzzle-2-line',
		text: { vi: 'Tiện ích mở rộng', en: 'Extensions' },
		// 1 mục / extension zap-* — cùng nguồn ZAP_PRODUCTS với trang /system/extension/<ext> (packages/zap/products.js)
		items: Object.values(ZAP_PRODUCTS).map((p) => ({ text: p.tagline, href: p.page })),
	},
	{
		iconMobile: 'ri:book-2-line',
		text: { vi: 'Hướng dẫn', en: 'Guide' },
		href: '/system/docs',
	},
]

export const footerMenuItems = [...menuItems]

// Văn bản pháp lý (modules/system/legal.js → /system/legal/<slug>/) — nhãn ngắn `short`, tiêu đề đầy đủ ở trang.
export const policies = LEGAL_DOCS.map((d) => ({ text: d.short, href: legalPath(d.slug) }))

export const socials = companySocials
