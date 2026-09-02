// src/services/modules/landing/goldenkey.js
export const variant = {
	theme: 'dark', // set default
	light: {
		ui: 'spatial',
		mainColors: '#ffbb24|#de8daf|#8c87b0|#5691c9|#e19d69|#70daa3|#e57e70', // primary|secondary|accent|info|warning|success|error
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	dark: {
		ui: 'spatial',
		mainColors: '#ffbb24|#de8daf|#8c87b0|#5691c9|#e19d69|#70daa3|#e57e70', // primary|secondary|accent|info|warning|success|error
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	// stars + trail = lấp lánh vàng, khớp tên "Golden Key" — colorful:false giữ tông vàng nhất quán, không lệch rainbow
	bg: {
		blur: true, quality: 'medium',
		concept: 'stars',
    tint: '#ffbb24',
    deg: 45,
    speed: 5,
    size: '1~5',
    limit: 40,
    trail: 60,
    gradient: true, total: 3, colorful: false, blobType: 'circleOverlap', blobMove: 'swap', distance: 108,
	},
};

const iconBase = {
	width: '2.5rem', height: '2.5rem', display: 'flex',
	alignItems: 'center', justifyContent: 'center', borderRadius: '0.625rem',
};
const iconBg = (colorVar) => ({ ...iconBase, background: `color-mix(in oklab, var(--${colorVar}) 20%, transparent)` });

export const views = [
	{
		text: { vi: 'Golden Key', en: 'Golden Key' },
		href: '/landing/goldenkey-software/',
		iconMobile: 'ri:key-2-line',
		sections: [
			// ── 1. Hero ────────────────────────────────────────────────────────────────
			{
				id: 'heroSpatialNeatCenterApex',
				data: [{
					subtitle: { vi: 'GOLDEN KEY SOFTWARE', en: 'GOLDEN KEY SOFTWARE' },
					title: {
						vi: 'Biến mọi yêu cầu phần mềm thành sản phẩm thực tế, nhanh chóng và đáng tin cậy',
						en: 'Turning any software requirement into a real product, fast and reliably',
					},
					description: {
						vi: 'Đội ngũ kỹ sư giàu kinh nghiệm, làm chủ mọi công nghệ từ web, mobile đến hệ thống doanh nghiệp — chúng tôi giải quyết bài toán khó, xây dựng đúng như bạn hình dung và bàn giao đúng tiến độ.',
						en: 'A team of experienced engineers mastering everything from web and mobile to enterprise systems — we take on hard problems, build exactly what you envisioned, and ship on time.',
					},
					meta: {
						titleHighlight: { vi: 'nhanh chóng và đáng tin cậy.', en: 'fast and reliably.' },
						ctaPrimary: { vi: 'Nhận tư vấn miễn phí', en: 'Get a free consultation' },
						ctaSecondary: { vi: 'Xem năng lực của chúng tôi', en: 'See our capabilities' },
						socialProof: { vi: 'Được 80+ doanh nghiệp tin tưởng xây dựng phần mềm riêng', en: 'Trusted by 80+ businesses to build custom software' },
					},
				}],
				config: (await import('@/sections/hero/spatialNeatCenterApex.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 2. Stats ───────────────────────────────────────────────────────────────
			{
				id: 'statsSpatialCardRowApex',
				data: [{
					meta: { badge: { vi: 'NĂNG LỰC BẰNG CON SỐ', en: 'CAPABILITY IN NUMBERS' } },
					stats: [
						{ value: '10+', label: { vi: 'Năm kinh nghiệm phát triển phần mềm', en: 'Years delivering software' } },
						{ value: '120+', label: { vi: 'Dự án đã bàn giao thành công', en: 'Projects successfully delivered' } },
						{ value: '98%', label: { vi: 'Dự án đúng tiến độ', en: 'Projects delivered on schedule' } },
						{ value: '24/7', label: { vi: 'Hỗ trợ & bảo trì sau bàn giao', en: 'Post-launch support & maintenance' } },
					],
				}],
				config: (await import('@/sections/stats/spatialCardRowApex.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 3. Technology stack ─────────────────────────────────────────────────────
			{
				id: 'trustedSpatialSlideLogosLTR',
				data: [
					{ name: 'React', logo: 'https://placehold.co/10/8B8680/8B8680' },
					{ name: 'Next.js', logo: 'https://placehold.co/10/8B8680/8B8680' },
					{ name: 'Node.js', logo: 'https://placehold.co/10/8B8680/8B8680' },
					{ name: 'Flutter', logo: 'https://placehold.co/10/8B8680/8B8680' },
					{ name: '.NET', logo: 'https://placehold.co/10/8B8680/8B8680' },
					{ name: 'PostgreSQL', logo: 'https://placehold.co/10/8B8680/8B8680' },
					{ name: 'Docker', logo: 'https://placehold.co/10/8B8680/8B8680' },
					{ name: 'Kubernetes', logo: 'https://placehold.co/10/8B8680/8B8680' },
					{ name: 'AWS', logo: 'https://placehold.co/10/8B8680/8B8680' },
				],
				config: (await import('@/sections/trusted/spatialSlideLogos.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 4. Process ─────────────────────────────────────────────────────────────
			{
				id: 'processModernStepTimeline',
				data: [{
					subtitle: { vi: 'CÁCH CHÚNG TÔI LÀM VIỆC', en: 'HOW WE WORK' },
					meta: { heroTitle: { vi: 'Từ ý tưởng đến sản phẩm,\nrõ ràng từng bước', en: 'From idea to product,\nclear at every step' } },
					steps: [
						{ id: 'brief', title: { vi: 'Khám phá yêu cầu', en: 'Discovery' }, icon: 'ri:file-list-3-line', content: { vi: 'Chúng tôi lắng nghe vấn đề thực tế, phân tích nhu cầu kinh doanh và chốt phạm vi rõ ràng trước khi bắt tay xây dựng.', en: 'We listen to the real problem, analyze your business needs, and lock in a clear scope before any building starts.' } },
						{ id: 'design', title: { vi: 'Thiết kế giải pháp', en: 'Solution design' }, icon: 'ri:pencil-ruler-2-line', content: { vi: 'Chúng tôi thiết kế kiến trúc hệ thống và giao diện phù hợp với quy mô, ngân sách và định hướng phát triển của bạn.', en: 'We architect the system and interface to fit your scale, budget, and growth trajectory.' } },
						{ id: 'build', title: { vi: 'Phát triển', en: 'Development' }, icon: 'ri:code-s-slash-line', content: { vi: 'Kỹ sư triển khai theo từng sprint ngắn, cập nhật tiến độ minh bạch mỗi tuần.', en: 'Engineers deliver in short sprints, with transparent progress updates every week.' } },
						{ id: 'test', title: { vi: 'Kiểm thử', en: 'Testing' }, icon: 'ri:bug-line', content: { vi: 'Mọi tính năng đều được kiểm thử tự động và thủ công trước khi đến buổi demo review của bạn.', en: 'Every feature is automated- and manual-tested before it reaches your demo review.' } },
						{ id: 'deploy', title: { vi: 'Triển khai', en: 'Deployment' }, icon: 'ri:rocket-2-line', content: { vi: 'Chúng tôi đưa hệ thống lên production và đào tạo đội vận hành của bạn cách sử dụng.', en: 'We ship to production and train your operating team on how to use it.' } },
						{ id: 'support', title: { vi: 'Hỗ trợ & phát triển', en: 'Support & growth' }, icon: 'ri:tools-line', content: { vi: 'Chúng tôi đồng hành lâu dài — sửa lỗi, nâng cấp và mở rộng tính năng khi doanh nghiệp bạn phát triển.', en: 'We stay on — fixing issues, upgrading, and extending features as your business grows.' } },
					],
				}],
				config: (await import('@/sections/process/modernStepTimeline.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 5. Core capabilities ───────────────────────────────────────────────────
			{
				id: 'featuresSpatialHoriIntroApex',
				data: [{
					subtitle: { vi: 'NĂNG LỰC CỐT LÕI', en: 'CORE CAPABILITIES' },
					meta: { heading: { vi: 'Một đội ngũ,\nmọi bài toán phần mềm', en: 'One team,\nevery kind of software challenge' } },
					cards: [
						{ title: { vi: 'Nền tảng web & doanh nghiệp', en: 'Web & enterprise platforms' }, content: { vi: 'Hệ thống quản trị, ERP và CRM được xây dựng theo đúng cách vận hành thực tế của doanh nghiệp bạn.', en: 'Admin systems, ERP, and CRM built around how your business actually operates.' }, meta: { icon: 'ri:global-line', iconStyle: iconBg('color-primary') } },
						{ title: { vi: 'Ứng dụng di động', en: 'Mobile applications' }, content: { vi: 'Ứng dụng iOS/Android hiệu năng cao với đồng bộ dữ liệu thời gian thực.', en: 'High-performance iOS/Android apps with real-time data sync.' }, meta: { icon: 'ri:smartphone-line', iconStyle: iconBg('color-secondary') } },
						{ title: { vi: 'Tích hợp & tự động hoá', en: 'Integrations & automation' }, content: { vi: 'Kết nối API và tự động hoá quy trình giúp giảm thao tác thủ công cho đội vận hành.', en: 'API connections and workflow automation that cut manual work for your operations team.' }, meta: { icon: 'ri:git-merge-line', iconStyle: iconBg('color-accent') } },
						{ title: { vi: 'Hạ tầng & bảo mật', en: 'Infrastructure & security' }, content: { vi: 'Triển khai cloud, CI/CD, giám sát và bảo mật cho hệ thống vận hành liên tục không gián đoạn.', en: 'Cloud deployment, CI/CD, monitoring, and security built for systems that never stop running.' }, meta: { icon: 'ri:shield-keyhole-line', iconStyle: iconBg('color-info') } },
					],
				}],
				config: (await import('@/sections/features/spatialHoriIntroApex.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 6. Why choose Golden Key ───────────────────────────────────────────────
			{
				id: 'featuresSpatialCardWebApex',
				data: [{
					subtitle: { vi: 'VÌ SAO CHỌN GOLDEN KEY', en: 'WHY CHOOSE GOLDEN KEY' },
					description: {
						vi: 'Từ startup giai đoạn đầu đến doanh nghiệp đang mở rộng, chúng tôi mang lại năng lực triển khai như một đội kỹ thuật in-house thực thụ.',
						en: 'From early-stage startups to scaling enterprises, we bring the delivery power of a genuine in-house engineering team.',
					},
					meta: { heading: { vi: 'Mạnh mẽ, linh hoạt,\nsẵn sàng cho mọi yêu cầu', en: 'Powerful, flexible,\nready for any requirement' } },
					cards: [
						{ title: { vi: 'Đội ngũ full-stack', en: 'Full-stack engineering team' }, content: { vi: 'Chúng tôi làm chủ toàn bộ stack công nghệ — không phụ thuộc vào một mắt xích duy nhất.', en: 'We own the entire technology stack — no single point of failure.' }, meta: { icon: 'ri:team-line', iconStyle: iconBg('color-primary') } },
						{ title: { vi: 'Giao hàng nhanh theo sprint', en: 'Fast, sprint-based delivery' }, content: { vi: 'Thấy tiến độ thực tế mỗi tuần thay vì chờ đến lúc bàn giao cuối cùng.', en: 'See real progress every week instead of waiting for a single final handoff.' }, meta: { icon: 'ri:speed-line', iconStyle: iconBg('color-secondary') } },
						{ title: { vi: 'Kiến trúc rõ ràng, dễ mở rộng', en: 'Clear, scalable architecture' }, content: { vi: 'Hệ thống được thiết kế để phát triển thêm tính năng, không phải xây lại từ đầu.', en: 'Systems designed to grow with new features, not be rebuilt from scratch.' }, meta: { icon: 'ri:stack-line', iconStyle: iconBg('color-accent') } },
						{ title: { vi: 'Chi phí minh bạch', en: 'Transparent pricing' }, content: { vi: 'Phạm vi và chi phí rõ ràng ngay từ đầu — không phát sinh ẩn trong quá trình làm.', en: 'Scope and cost are clear from day one — no hidden costs along the way.' }, meta: { icon: 'ri:price-tag-3-line', iconStyle: iconBg('color-info') } },
						{ title: { vi: 'Bảo mật & sao lưu mặc định', en: 'Security & backups by default' }, content: { vi: 'Bảo mật và sao lưu được tích hợp ngay từ giai đoạn thiết kế hệ thống.', en: 'Security and backup practices are built in from the system design stage.' }, meta: { icon: 'ri:lock-2-line', iconStyle: iconBg('color-warning') } },
						{ title: { vi: 'Hỗ trợ sau bàn giao', en: 'Support after handoff' }, content: { vi: 'Bàn giao không phải là kết thúc — chúng tôi tiếp tục sửa lỗi và nâng cấp.', en: 'Handoff isn\'t the end — we stay on to fix issues and ship upgrades.' }, meta: { icon: 'ri:customer-service-2-line', iconStyle: iconBg('color-primary') } },
						{ title: { vi: 'Toàn bộ mã nguồn & tài liệu', en: 'Full source code & documentation' }, content: { vi: 'Bạn sở hữu toàn bộ mã nguồn cùng tài liệu kỹ thuật rõ ràng để đội của bạn tự vận hành.', en: 'You get full ownership of the source code, with clear technical docs so your team can run it independently.' }, meta: { icon: 'ri:file-copy-2-line', iconStyle: iconBg('color-secondary') } },
						{ title: { vi: 'Làm việc trực tiếp với kỹ sư', en: 'Direct access to engineers' }, content: { vi: 'Một đầu mối kỹ thuật xuyên suốt dự án — không qua nhiều tầng trung gian.', en: 'One technical point of contact throughout the project — no layers of middlemen.' }, meta: { icon: 'ri:chat-check-line', iconStyle: iconBg('color-accent') } },
						{ title: { vi: 'Xây dựng theo cách bạn vận hành', en: 'Built around how you operate' }, content: { vi: 'Phần mềm phù hợp với cách doanh nghiệp bạn đang vận hành, thay vì bắt bạn thích nghi theo nó.', en: 'Software fits the way your business already runs, instead of forcing you to adapt to it.' }, meta: { icon: 'ri:settings-4-line', iconStyle: iconBg('color-info') } },
					],
				}],
				config: (await import('@/sections/features/spatialCardWebApex.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 7. Honest comparison ────────────────────────────────────────────────────
			{
				id: 'benefitsModernCardCompare',
				data: [{
					subtitle: { vi: 'SO SÁNH THẲNG THẮN', en: 'AN HONEST COMPARISON' },
					title: { vi: 'Vì sao nên chọn một đội ngũ đồng hành trọn vẹn hành trình?', en: 'Why choose one team that owns the whole journey?' },
					description: {
						vi: 'Ghép nối nhiều freelancer thường khiến dự án đứt gãy giữa chừng.\nGolden Key mang đến một đội ngũ cam kết, đồng hành từ đầu đến cuối.',
						en: 'Piecing together freelancers often breaks a project halfway through.\nGolden Key gives you one committed team, from start to finish.',
					},
					meta: {
						leftPanelTitle: 'Golden Key Software',
						vsBadge: 'VS',
						rightPanelTitle: { vi: 'Thuê ngoài rời rạc', en: 'Scattered outsourcing' },
					},
					leftCards: [
						{ title: { vi: 'Một đội ngũ cố định xuyên suốt dự án', en: 'A fixed team throughout the project' } },
						{ title: { vi: 'Tiến độ bàn giao rõ ràng, có hợp đồng đảm bảo', en: 'Clear delivery timeline, backed by contract' } },
						{ title: { vi: 'Một đầu mối chịu trách nhiệm toàn bộ', en: 'One point of contact owns everything' } },
						{ title: { vi: 'Bàn giao đầy đủ mã nguồn và tài liệu', en: 'Full source code and documentation handoff' } },
						{ title: { vi: 'Có gói bảo trì dài hạn', en: 'Long-term maintenance plans available' } },
						{ title: { vi: 'Chi phí trọn gói, minh bạch ngay từ đầu', en: 'Transparent, all-in pricing from day one' } },
					],
					rightCards: [
						{ title: { vi: 'Nhân sự thay đổi liên tục giữa các giai đoạn', en: 'People rotate constantly between phases' } },
						{ title: { vi: 'Tiến độ phụ thuộc vào từng freelancer', en: 'Timeline depends on individual freelancers' } },
						{ title: { vi: 'Không ai chịu trách nhiệm xuyên suốt dự án', en: 'No one owns the project end-to-end' } },
						{ title: { vi: 'Tài liệu bàn giao thiếu hoặc rời rạc', en: 'Handoff docs are patchy or missing' } },
						{ title: { vi: 'Hỗ trợ chấm dứt ngay khi hết hợp đồng', en: 'Support ends the moment the contract does' } },
						{ title: { vi: 'Chi phí phát sinh khó kiểm soát', en: 'Costs creep up in ways hard to control' } },
					],
				}],
				config: (await import('@/sections/benefits/modernCardCompare.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 8. Featured work — illustrative, swap in real case studies once available ─
			{
				id: 'showcaseModernHoriCase',
				data: [{
					subtitle: { vi: 'DỰ ÁN TIÊU BIỂU', en: 'FEATURED WORK' },
					description: { vi: 'Một vài lát cắt về hệ thống Golden Key đã trực tiếp xây dựng cùng khách hàng.', en: 'A few snapshots of systems Golden Key has built directly with clients.' },
					meta: { heading: { vi: 'Sản phẩm thật.\nKết quả thật.', en: 'Real products.\nReal results.' }, ctaLabel: { vi: 'Xem thêm dự án →', en: 'View more projects →' } },
					slider: [
						{
							pics: 'https://placehold.co/600x300/eab308/1e1e1e?text=Retail',
							title: { vi: 'Hệ thống bán hàng cho chuỗi bán lẻ', en: 'Point-of-sale system for a retail chain' },
							content: { vi: 'Đồng bộ tồn kho và đơn hàng thời gian thực giữa nhiều chi nhánh.', en: 'Real-time inventory and order sync across multiple branches.' },
							meta: { category: { vi: 'BÁN LẺ', en: 'RETAIL' } },
						},
						{
							pics: 'https://placehold.co/600x300/1e40af/f5f5f5?text=Clinic',
							title: { vi: 'Nền tảng đặt lịch cho phòng khám', en: 'Booking platform for a medical clinic' },
							content: { vi: 'Giảm thời gian chờ và sai sót lịch hẹn cho đội lễ tân.', en: 'Cut wait times and reduced scheduling errors for the front-desk team.' },
							meta: { category: { vi: 'Y TẾ', en: 'HEALTHCARE' } },
						},
						{
							pics: 'https://placehold.co/600x300/14b8a6/1e1e1e?text=Logistics',
							title: { vi: 'Ứng dụng theo dõi vận chuyển', en: 'Shipment tracking app for logistics' },
							content: { vi: 'Theo dõi vị trí đơn hàng và tài xế trên bản đồ theo thời gian thực.', en: 'Real-time map tracking for shipments and drivers.' },
							meta: { category: { vi: 'HẬU CẦN', en: 'LOGISTICS' } },
						},
					],
				}],
				config: (await import('@/sections/showcase/modernHoriCase.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 9. Engagement models ─────────────────────────────────────────────────────
			{
				id: 'pricingSpatialTabPlansApex',
				data: [{
					subtitle: { vi: 'MÔ HÌNH HỢP TÁC', en: 'ENGAGEMENT MODELS' },
					description: { vi: 'Tính phí theo phạm vi thực tế. Không phí ẩn.', en: 'Priced against real scope. No hidden fees.' },
					meta: { heading: { vi: 'Chọn cách bạn muốn hợp tác với chúng tôi', en: 'Choose the way you want to work with us' } },
					tabs: [
						// ── Per project ─────────────────────────────────────────────────────
						{
							title: { vi: 'Website & Landing Page', en: 'Website & Landing Page' },
							content: { vi: 'Ra mắt website marketing hoặc landing page bán hàng nhanh chóng', en: 'Launch a marketing site or sales landing page fast' },
							tab: 'monthly', tabLabel: { vi: 'Theo dự án', en: 'Per project' },
							meta: {
								currency: '', price: { vi: 'Liên hệ báo giá', en: 'Contact us' },
								billing: { vi: '*tính phí theo số trang & yêu cầu thiết kế', en: '*priced by page count & design requirements' },
								f1: { vi: 'Thiết kế giao diện riêng', en: 'Custom UI design' },
								f2: { vi: 'Trang tối ưu hiệu năng', en: 'Performance-optimized pages' },
								f3: { vi: 'Bàn giao đầy đủ mã nguồn', en: 'Full source code handoff' },
								f4: { vi: 'Hỗ trợ 30 ngày sau khi ra mắt', en: '30-day post-launch support' },
								btn: { vi: 'Nhận báo giá', en: 'Get a quote' }, badge: '', badgeStys: { display: 'none' },
								btnStys: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '48px', borderRadius: '2rem', cursor: 'pointer', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '500', border: '1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent)', color: 'var(--color-base-content)', width: '100%', boxSizing: 'border-box' },
							},
						},
						{
							title: { vi: 'Ứng dụng Web & Mobile', en: 'Web & mobile application' },
							content: { vi: 'Sản phẩm hoàn chỉnh cho startup và doanh nghiệp đang phát triển', en: 'A complete product for startups and growing businesses' },
							tab: 'monthly', tabLabel: { vi: 'Theo dự án', en: 'Per project' },
							meta: {
								currency: '', price: { vi: 'Liên hệ báo giá', en: 'Contact us' },
								billing: { vi: '*tính phí theo phạm vi tính năng & thời gian', en: '*priced by feature scope & timeline' },
								f1: { vi: 'Kiến trúc hệ thống rõ ràng', en: 'Clear system architecture' },
								f2: { vi: 'Web + mobile đồng bộ dữ liệu', en: 'Web + mobile with synced data' },
								f3: { vi: 'Kiểm thử kỹ trước mỗi lần bàn giao', en: 'Tested before every handoff' },
								f4: { vi: 'Hỗ trợ 90 ngày sau khi ra mắt', en: '90-day post-launch support' },
								btn: { vi: 'Nhận báo giá', en: 'Get a quote' }, badge: { vi: 'Phổ biến nhất', en: 'Most popular' }, badgeStys: {},
								btnStys: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '48px', borderRadius: '2rem', cursor: 'pointer', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '700', background: 'var(--color-primary)', color: 'var(--color-base-100)', width: '100%', boxSizing: 'border-box' },
							},
						},
						{
							title: { vi: 'Hệ thống doanh nghiệp', en: 'Enterprise system' },
							content: { vi: 'ERP, CRM và nền tảng vận hành theo đúng yêu cầu của bạn', en: 'ERP, CRM, and operating platforms built to your requirements' },
							tab: 'monthly', tabLabel: { vi: 'Theo dự án', en: 'Per project' },
							meta: {
								currency: '', price: { vi: 'Liên hệ báo giá', en: 'Contact us' },
								billing: { vi: '*tính phí theo quy trình nghiệp vụ & quy mô hệ thống', en: '*priced by business process & system scale' },
								f1: { vi: 'Phân tích nghiệp vụ chuyên sâu', en: 'In-depth business analysis' },
								f2: { vi: 'Tích hợp với hệ thống hiện có', en: 'Integration with existing systems' },
								f3: { vi: 'Phân quyền & bảo mật theo chuẩn', en: 'Standards-based access & security' },
								f4: { vi: 'Đào tạo đội vận hành', en: 'Operating team training' },
								btn: { vi: 'Nhận báo giá', en: 'Get a quote' }, badge: '', badgeStys: { display: 'none' },
								btnStys: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '48px', borderRadius: '2rem', cursor: 'pointer', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '500', border: '1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent)', color: 'var(--color-base-content)', width: '100%', boxSizing: 'border-box' },
							},
						},

						// ── Long-term partnership ───────────────────────────────────────────
						{
							title: { vi: 'Bảo trì hệ thống', en: 'Core maintenance' },
							content: { vi: 'Giữ hệ thống hiện có ổn định, xử lý sự cố kịp thời', en: 'Keep your existing system stable, with issues fixed promptly' },
							tab: 'annual', tabLabel: { vi: 'Hợp tác dài hạn', en: 'Long-term partnership' },
							meta: {
								currency: '', price: { vi: 'Liên hệ báo giá', en: 'Contact us' },
								billing: { vi: '*phí hàng tháng, cam kết thời gian phản hồi', en: '*monthly retainer, with committed response times' },
								f1: { vi: 'Sửa lỗi', en: 'Bug fixes' },
								f2: { vi: 'Giám sát hệ thống định kỳ', en: 'Scheduled system monitoring' },
								f3: { vi: 'Sao lưu dữ liệu định kỳ', en: 'Regular data backups' },
								f4: { vi: 'Báo cáo tình trạng hàng tháng', en: 'Monthly status reporting' },
								btn: { vi: 'Liên hệ tư vấn', en: 'Talk to us' }, badge: '', badgeStys: { display: 'none' },
								btnStys: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '48px', borderRadius: '2rem', cursor: 'pointer', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '500', border: '1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent)', color: 'var(--color-base-content)', width: '100%', boxSizing: 'border-box' },
							},
						},
						{
							title: { vi: 'Đội ngũ mở rộng', en: 'Extended team' },
							content: { vi: 'Kỹ sư Golden Key làm việc như một phần của đội ngũ bạn', en: 'Golden Key engineers embedded as part of your own team' },
							tab: 'annual', tabLabel: { vi: 'Hợp tác dài hạn', en: 'Long-term partnership' },
							meta: {
								currency: '', price: { vi: 'Liên hệ báo giá', en: 'Contact us' },
								billing: { vi: '*tính phí theo số lượng kỹ sư & thời gian cam kết', en: '*priced by engineer count & commitment length' },
								f1: { vi: 'Kỹ sư cam kết theo tháng/quý', en: 'Engineers committed monthly/quarterly' },
								f2: { vi: 'Tham gia trực tiếp vào sprint của bạn', en: 'Direct participation in your sprints' },
								f3: { vi: 'Linh hoạt tăng giảm quy mô', en: 'Flexible to scale up or down' },
								f4: { vi: 'Một đầu mối phối hợp cố định', en: 'One fixed coordination point' },
								btn: { vi: 'Liên hệ tư vấn', en: 'Talk to us' }, badge: { vi: 'Được chọn nhiều nhất', en: 'Most chosen' }, badgeStys: {},
								btnStys: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '48px', borderRadius: '2rem', cursor: 'pointer', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '700', background: 'var(--color-primary)', color: 'var(--color-base-100)', width: '100%', boxSizing: 'border-box' },
							},
						},
						{
							title: { vi: 'Đối tác công nghệ toàn diện', en: 'Full technology partner' },
							content: { vi: 'Golden Key vận hành như bộ phận công nghệ của doanh nghiệp bạn', en: 'Golden Key operates as your company\'s technology arm' },
							tab: 'annual', tabLabel: { vi: 'Hợp tác dài hạn', en: 'Long-term partnership' },
							meta: {
								currency: '', price: { vi: 'Liên hệ báo giá', en: 'Contact us' },
								billing: { vi: '*cam kết dài hạn, phạm vi tuỳ theo nhu cầu của bạn', en: '*long-term commitment, scope tailored to your needs' },
								f1: { vi: 'Tư vấn chiến lược công nghệ', en: 'Technology strategy consulting' },
								f2: { vi: 'Chủ động đề xuất cải tiến hệ thống', en: 'Proactive system improvement proposals' },
								f3: { vi: 'Ưu tiên xử lý sự cố khẩn cấp', en: 'Priority handling for urgent incidents' },
								f4: { vi: 'Báo cáo định kỳ & trao đổi với ban lãnh đạo', en: 'Regular reporting & leadership syncs' },
								btn: { vi: 'Liên hệ tư vấn', en: 'Talk to us' }, badge: '', badgeStys: { display: 'none' },
								btnStys: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '48px', borderRadius: '2rem', cursor: 'pointer', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '500', border: '1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent)', color: 'var(--color-base-content)', width: '100%', boxSizing: 'border-box' },
							},
						},
					],
				}],
				config: (await import('@/sections/pricing/spatialTabPlansApex.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 10. Our commitments — NOT fabricated reviews/fake clients ─────────────────
			{
				id: 'testimonialsSpatialMasonryNeatApex',
				data: [{
					subtitle: { vi: 'CAM KẾT CỦA CHÚNG TÔI', en: 'OUR COMMITMENTS' },
					meta: {
						sectionHeading: { vi: 'Chúng tôi không chỉ hứa —', en: 'We don\'t just promise —' },
						sectionHeadingAccent: { vi: 'chúng tôi cam kết bằng văn bản.', en: 'we commit to it in writing.' },
						sectionDescription: { vi: 'Đây là những điều đội ngũ Golden Key luôn giữ vững trong mọi dự án, dù lớn hay nhỏ.', en: 'These are the things Golden Key\'s team upholds on every project, big or small.' },
					},
					masonry: [
						{ title: { vi: '"Chúng tôi bám sát phạm vi đã thống nhất"', en: '"We stick to the agreed scope"' }, content: { vi: 'Mọi thay đổi phạm vi giữa dự án đều được báo trước, đánh giá lại thời gian và chi phí minh bạch — không bao giờ âm thầm thêm vào.', en: 'Any change to scope mid-project is flagged upfront, with time and cost re-evaluated transparently — never added silently.' }, pics: 'https://placehold.co/80x80/eab308/1e1e1e?text=01', meta: { name: { vi: 'Cam kết #1', en: 'Commitment #1' }, handle: '#scope-integrity' } },
						{ title: { vi: '"Toàn quyền sở hữu sản phẩm"', en: '"Full ownership of your product"' }, content: { vi: 'Sau khi thanh toán, bạn nhận toàn bộ mã nguồn, tài liệu kỹ thuật và toàn quyền sử dụng — không phụ thuộc vào chúng tôi.', en: 'Once payment is settled, you get the complete source code, technical documentation, and full rights to use it — with no dependency on us.' }, pics: 'https://placehold.co/80x80/1e40af/f5f5f5?text=02', meta: { name: { vi: 'Cam kết #2', en: 'Commitment #2' }, handle: '#full-ownership' } },
						{ title: { vi: '"Một đầu mối kỹ thuật xuyên suốt"', en: '"One technical contact, start to finish"' }, content: { vi: 'Bạn luôn làm việc với cùng một người phụ trách xuyên suốt dự án — không bị chuyển qua lại giữa nhiều người.', en: 'You always work with the same person owning the project end-to-end — never bounced between different people.' }, pics: 'https://placehold.co/80x80/3b82f6/1e1e1e?text=03', meta: { name: { vi: 'Cam kết #3', en: 'Commitment #3' }, handle: '#single-point-of-contact' } },
						{ title: { vi: '"Chi phí không phát sinh bất ngờ"', en: '"Pricing with no hidden surprises"' }, content: { vi: 'Chi phí được thống nhất rõ ràng trước khi ký hợp đồng — công việc ngoài phạm vi sẽ được báo giá riêng, không âm thầm cộng dồn.', en: 'Cost is agreed clearly before the contract is signed — any work outside scope is quoted separately, never bundled in quietly.' }, pics: 'https://placehold.co/80x80/14b8a6/1e1e1e?text=04', meta: { name: { vi: 'Cam kết #4', en: 'Commitment #4' }, handle: '#no-hidden-fees' } },
						{ title: { vi: '"Hỗ trợ không dừng lại sau bàn giao"', en: '"Support doesn\'t end at handoff"' }, content: { vi: 'Bàn giao không phải là điểm kết thúc — mỗi dự án đều có thời gian bảo hành, cùng gói bảo trì dài hạn nếu bạn cần.', en: 'Handoff isn\'t the finish line — every project comes with a warranty period, plus a long-term maintenance plan if you need it.' }, pics: 'https://placehold.co/80x80/f97316/1e1e1e?text=05', meta: { name: { vi: 'Cam kết #5', en: 'Commitment #5' }, handle: '#post-handoff-support' } },
						{ title: { vi: '"Tiến độ minh bạch mỗi tuần"', en: '"Weekly progress, fully visible"' }, content: { vi: 'Bạn luôn biết dự án đang ở đâu qua báo cáo tình trạng định kỳ — không chỉ đến ngày bàn giao cuối cùng.', en: 'You always know where the project stands through regular status reports — not just at the final handoff date.' }, pics: 'https://placehold.co/80x80/eab308/1e1e1e?text=06', meta: { name: { vi: 'Cam kết #6', en: 'Commitment #6' }, handle: '#weekly-transparency' } },
					],
				}],
				config: (await import('@/sections/testimonials/spatialMasonryNeatApex.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 11. FAQ ────────────────────────────────────────────────────────────────
			{
				id: 'faqSpatialExpansionApex',
				data: [{
					subtitle: { vi: 'HỎI THẲNG, ĐÁP THẬT', en: 'STRAIGHT QUESTIONS, HONEST ANSWERS' },
					description: { vi: 'Những câu hỏi khách hàng thường đặt ra trước khi bắt đầu hợp tác.', en: 'Questions clients usually ask before we start working together.' },
					meta: { heroTitle: { vi: 'Câu hỏi thường gặp', en: 'Frequently asked questions' } },
					expansion: [
						{ title: { vi: 'Golden Key có nhận dự án nhỏ, 1-2 tháng không?', en: 'Does Golden Key take on small, 1-2 month projects?' }, content: { vi: 'Có — chúng tôi nhận cả dự án ngắn hạn có phạm vi cụ thể lẫn hợp tác dài hạn dưới hình thức đội ngũ mở rộng hoặc đối tác công nghệ toàn diện.', en: 'Yes — we take on short-term projects with a specific scope as well as long-term partnerships as an extended team or full technology partner.' } },
						{ title: { vi: 'Chi phí dự án phần mềm riêng được tính như thế nào?', en: 'How is the cost of a custom software project calculated?' }, content: { vi: 'Dựa trên phạm vi công việc, độ phức tạp nghiệp vụ và thời gian bàn giao. Chi phí được chốt rõ ràng trước khi ký hợp đồng — không phát sinh ẩn giữa dự án.', en: 'Based on scope of work, business complexity, and delivery timeline. Pricing is locked in clearly before the contract is signed — no hidden costs mid-project.' } },
						{ title: { vi: 'Sau khi bàn giao, ai chịu trách nhiệm xử lý sự cố phát sinh?', en: 'After handoff, who\'s responsible for fixing issues that come up?' }, content: { vi: 'Mỗi dự án đều có thời gian bảo hành; sau đó bạn có thể chọn gói bảo trì dài hạn với thời gian phản hồi cam kết trong hợp đồng.', en: 'Every project includes a warranty period; afterward, you can choose a long-term maintenance plan with response times committed in the contract.' } },
						{ title: { vi: 'Chúng tôi có được toàn quyền sở hữu mã nguồn không?', en: 'Do we get full ownership of the source code?' }, content: { vi: 'Có — sau khi hoàn tất thanh toán, bạn nhận toàn bộ mã nguồn, tài liệu kỹ thuật và toàn quyền sở hữu để sử dụng.', en: 'Yes — once payment is complete, you receive the full source code, technical documentation, and complete ownership rights for your own use.' } },
						{ title: { vi: 'Golden Key có làm việc trực tiếp với đội kỹ thuật nội bộ của chúng tôi không?', en: 'Does Golden Key work directly with our in-house technical team?' }, content: { vi: 'Có — luôn có một đầu mối kỹ thuật làm việc trực tiếp, sát sao với đội của bạn xuyên suốt dự án.', en: 'Yes — there\'s always one technical point of contact working directly and closely with your team throughout the project.' } },
						{ title: { vi: 'Nếu yêu cầu cần thay đổi giữa dự án thì sao?', en: 'What if requirements need to change mid-project?' }, content: { vi: 'Thay đổi phạm vi sẽ được đánh giá lại minh bạch về thời gian và chi phí trước khi tiếp tục — không bao giờ áp dụng âm thầm mà không thông báo.', en: 'Scope changes are re-evaluated transparently for time and cost before we continue — never applied silently without notice.' } },
					],
				}],
				config: (await import('@/sections/faq/spatialExpansionApex.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},

			// ── 12. Closing CTA ────────────────────────────────────────────────────────
			{
				id: 'ctaSpatialNeatApex',
				data: [{
					subtitle: { vi: 'SẴN SÀNG BẮT ĐẦU', en: 'READY TO START' },
					title: { vi: 'Bạn có ý tưởng phần mềm?\nĐể Golden Key hiện thực hoá nó.', en: 'Have a software idea?\nLet Golden Key bring it to life.' },
					description: { vi: 'Kể cho chúng tôi nghe vấn đề của bạn — đội ngũ Golden Key sẽ đề xuất giải pháp và báo giá cụ thể trong vòng 24 giờ.', en: 'Tell us about your problem — the Golden Key team will propose a solution and a concrete quote within 24 hours.' },
					pics: 'https://placehold.co/1400x400/eab308/1e1e1e?text=Golden+Key+Software',
					meta: { ctaPrimaryLabel: { vi: 'Nhận tư vấn miễn phí', en: 'Get a free consultation' }, ctaSecondaryLabel: { vi: 'Xem lại năng lực của chúng tôi', en: 'Review our capabilities' } },
				}],
				config: (await import('@/sections/cta/spatialNeatApex.js')).config,
				sort: 0, col: '12', container: true,
				stys: { backgroundColor: 'color-mix(in oklab, var(--color-base-content) 3%, transparent)' },
			},
		],
	},
];

export default { variant, views };

// ── bar + menus + footer ─────────────────────────────────────────────────────────────────
// TODO: taxNumber/email/address/hotline hiện là placeholder — chủ shop sẽ tự điền số liệu thật.
export const contact = {
  name: { vi: 'Công ty TNHH Golden Key Software', en: 'Golden Key Software Co., Ltd.' },
  taxNumber: '',
  email: 'sales@goldenkeysoftware.com',
	address: 'Quận 1, TP.HCM',
	hotline: '0900000000',
  info: {
    vi: 'Đội ngũ kỹ sư phần mềm giàu kinh nghiệm, xây dựng hệ thống web, mobile và doanh nghiệp theo đúng yêu cầu thực tế — từ dự án nhỏ đến đối tác công nghệ dài hạn. \nGiao đúng thứ bạn cần, đúng tiến độ cam kết.',
    en: 'An experienced software engineering team building web, mobile, and enterprise systems tailored to real business needs — from small projects to long-term technology partnerships. \nWe deliver exactly what you need, on the timeline we commit to.',
  },
}
export const bar = {
  ...contact,
	hotlineLabel: { vi: 'Hotline / Zalo', en: 'Hotline / Zalo' },
	socialsLabel: { vi: 'Mạng xã hội', en: 'Follow us' },
	socials: [
		{ icon: 'ri:facebook-fill', href: '#', text: 'Facebook' },
		{ icon: 'ri:tiktok-fill', href: '#', text: 'TikTok' },
	],
};

export const menuSpecials = []

export const menuItems = [
	{
		iconMobile: 'ri:home-line',
		text: { vi: 'Tổng quan', en: 'Overview' },
		items: [
			{ text: { vi: 'Giới thiệu', en: 'Intro' },      href: '#heroSpatialNeatCenterApex' },
			{ text: { vi: 'Con số ấn tượng', en: 'By the numbers' }, href: '#statsSpatialCardRowApex'   },
			{ text: { vi: 'Công nghệ', en: 'Technology' }, href: '#trustedSpatialSlideLogosLTR' },
		],
	},
	{
		iconMobile: 'ri:route-line',
		text: { vi: 'Quy trình & Năng lực', en: 'Process & Capabilities' },
		items: [
			{ text: { vi: 'Quy trình', en: 'Process' },           href: '#processModernStepTimeline'      },
			{ text: { vi: 'Năng lực cốt lõi', en: 'Core capabilities' }, href: '#featuresSpatialHoriIntroApex'   },
			{ text: { vi: 'Vì sao chọn chúng tôi', en: 'Why choose us' },     href: '#featuresSpatialCardWebApex'     },
		],
	},
	{
		iconMobile: 'ri:briefcase-4-line',
		text: { vi: 'Dự án & Hợp tác', en: 'Work & Partnership' },
		items: [
			{ text: { vi: 'So sánh', en: 'Comparison' },    href: '#benefitsModernCardCompare'     },
			{ text: { vi: 'Dự án tiêu biểu', en: 'Featured work' }, href: '#showcaseModernHoriCase'        },
			{ text: { vi: 'Mô hình hợp tác', en: 'Engagement models' }, href: '#pricingSpatialTabPlansApex'    },
		],
	},
	{
		iconMobile: 'ri:question-line',
		text: { vi: 'Hỗ trợ', en: 'Support' },
		items: [
			{ text: { vi: 'Cam kết của chúng tôi', en: 'Our commitments' },       href: '#testimonialsSpatialMasonryNeatApex' },
			{ text: { vi: 'Câu hỏi thường gặp', en: 'Frequently asked questions' }, href: '#faqSpatialExpansionApex'        },
		],
	},
	{
		iconMobile: 'ri:send-plane-line',
		text: { vi: 'Liên hệ', en: 'Contact us' },
		href: '#ctaSpatialNeatApex',
	},
  {
		iconMobile: 'ri:file-search-line',
		text: { vi: 'Tài liệu', en: 'Docs' },
    href: '/docs'
  },
  {
		iconMobile: 'ri:apps-ai-line',
		text: { vi: 'Thành phần giao diện', en: 'Components UI' },
    href: '/ui'
  }
];

// footer dùng menuItems trước, menuSpecials xếp dưới cùng (chiếm trọn hàng) — menu top nav vẫn giữ nguyên menuItems
export const footerMenuItems = [...menuItems, ...menuSpecials];

export const policies = [
	{ text: { vi: 'Điều khoản', en: 'Terms' },          href: '#' },
	{ text: { vi: 'Chính sách bảo mật', en: 'Privacy Policy' }, href: '#' },
]

export const socials = [
	{ text: 'Twitter',   href: '#', icon: 'ri:twitter-x-fill'   },
	{ text: 'GitHub',    href: '#', icon: 'ri:github-fill'    },
	{ text: 'Facebook',  href: '#', icon: 'ri:facebook-fill'  },
	{ text: 'Instagram', href: '#', icon: 'ri:instagram-line' },
	{ text: 'LinkedIn',  href: '#', icon: 'ri:linkedin-box-fill'  },
]
