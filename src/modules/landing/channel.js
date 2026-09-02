// src/services/modules/landing/channel.js
//
// Nội dung cho src/pages/channel/home.astro — trang giới thiệu tính năng "Kênh" (gian hàng kết
// nối trực tiếp, xem docs/CHANNEL.rst), KHÔNG phải app thật (đó là src/pages/channel/index.astro
// → <svc-bay>). Cùng khuôn mọi module khác trong thư mục này (landing-home.js, landing-page.js...):
// mỗi section tái dùng `config` (layout/animation/bg) từ 1 file src/sections/<domain>/<configKey>.js
// có sẵn, chỉ `data` là nội dung mới viết riêng cho trang này.
//
// Nội dung được viết cho người dùng phổ thông, KHÔNG rành công nghệ — mọi thuật ngữ kỹ thuật
// (P2P, WebRTC, mesh, Firestore, device_id/user_id, rate-limit, peer...) đều được diễn giải lại
// thành lợi ích/hành vi dễ hiểu, không dùng nguyên từ chuyên ngành.
export const variant = {
	theme: 'dark', // set default
	light: {
		ui: 'spatial',
		// teal(kết nối/trực tuyến) | indigo(hiện đại) | rose(nhấn) | cyan(thông tin) | amber(cảnh báo)
		mainColors: '#2dd4bf|#818cf8|#fb7185|#00c7d4|#fbbf24', // primary|secondary|accent|info|warning|success|error
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	dark: {
		ui: 'spatial',
		mainColors: '#2dd4bf|#818cf8|#fb7185|#00c7d4|#fbbf24', // primary|secondary|accent|info|warning|success|error
		bgColors: '', // --color-base-100|--color-base-200|--color-base-300
		textColor: '', // --color-base-content
		bgImage: '',
	},
	// dots = lưới điểm/nút mạng, khớp ý "kết nối trực tiếp/mesh" của trang — push để tương tác
	bg: {
		blur: true, quality: 'medium',
		concept: 'stars',
    tint: '#38bdf8',
    deg: 130,
    speed: 6,
    size: '1~4',
    limit: 40,
    trail: 70,
    gradient: true, total: 3, colorful: true, blobType: 'circleOverlap', blobMove: 'swap', distance: 110,
	},
};

// Nền icon vuông-bo-góc dùng chung cho card lưới tính năng — chỉ đổi màu nền qua color-mix
// (không hardcode hex ngoài các biến CSS hệ thống, xem CLAUDE.md "Color rule").
const iconBase = {
	width: '2.5rem', height: '2.5rem', display: 'flex',
	alignItems: 'center', justifyContent: 'center', borderRadius: '0.625rem',
};
const iconBg = (colorVar) => ({ ...iconBase, background: `color-mix(in oklab, var(--${colorVar}) 20%, transparent)` });

export const views = [
	{
		text: 'Kênh',
		href: '/channel/home',
		iconMobile: 'ri:store-2-line',
		sections: [
			// ── 1. Hero — mở đầu bằng lời hứa cụ thể, dễ hình dung ────────────────────────
			{
				id: 'heroSpatialNeatCenterApex',
				data: [{
					subtitle: 'SỐ HÓA ĐỜI SỐNG ĐƠN GIẢN HƠN BAO GIỜ HẾT',
					title: 'Kết nối và trải nghiệm trực tiếp sống động',
					description: 'Ứng dụng mang lại cảm giác tương tác của đời thực cho mọi loại hình kinh doanh — từ tô phở đầu hẻm, quán cà phê nhỏ, tiệm hoa gia đình cho đến cả một hội chợ triển lãm nhiều gian hàng cùng lúc.',
					meta: {
						titleHighlight: 'theo thời gian thực.',
						ctaPrimary: 'Tạo gian hàng miễn phí',
						ctaSecondary: 'Xem quy trình hoạt động',
						socialProof: 'Hệ thống chỉ giúp hai bên tìm thấy nhau — mọi nội dung luôn nằm trên chính thiết bị của bạn',
					},
				}],
				config: (await import('@/sections/hero/spatialNeatCenterApex.js')).config,
				sort: 0, col: '12', container: true,
				stys: { marginTop: '-4rem', paddingTop: '4rem' }, // only item first
			},

			// ── 2. Số liệu — thay cho số liệu bán hàng thường thấy ────────────────────────
			{
				id: 'statsSpatialCardRowApex',
				data: [{
					meta: { badge: 'NHỮNG CON SỐ BIẾT NÓI' },
					stats: [
						{ value: '∞', label: 'Không giới hạ số khách ghé thăm' },
						{ value: '0đ', label: 'Chi phí vận hành' },
						{ value: '100%', label: 'Nội dung trao đổi trực tiếp giữa hai bên' },
						{ value: '3 kênh', label: 'Chat, gọi video, đặt hàng cùng 1 chỗ' },
					],
				}],
				config: (await import('@/sections/stats/spatialCardRowApex.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 3. Tính năng nổi bật — 9/13 tính năng nêu ở docs/CHANNEL.rst § 3 ──────────
			{
				id: 'featuresSpatialCardWebApex',
				data: [{
					subtitle: 'TÍNH NĂNG NỔI BẬT',
					description: 'Những tính năng được thiết kế để 1 gian hàng vận hành mượt như có cả đội kỹ thuật đứng sau — mà bạn không cần lo bất kỳ điều gì.',
					meta: { heading: 'Mọi thứ 1 gian hàng\ncần, chi phí không đổi dù đông khách' },
					cards: [
						{ title: 'Không qua bất kỳ trung gian nào', content: 'Sản phẩm, tin nhắn, đơn hàng nằm ngay trên thiết bị của bạn — dù có bao nhiêu khách ghé thăm, chi phí vận hành vẫn không đổi.', meta: { icon: 'ri:cloud-off-line', iconStyle: iconBg('color-primary') } },
						{ title: 'Dựng trang bằng kéo-thả', content: '15 mẫu khối nội dung dựng sẵn — sản phẩm, giới thiệu, bảng giá, hỏi đáp, đội ngũ... không cần biết thiết kế hay lập trình vẫn ra trang chuyên nghiệp.', meta: { icon: 'ri:drag-drop-line', iconStyle: iconBg('color-secondary') } },
						{ title: 'Trợ lý AI viết nội dung giúp bạn', content: 'Chỉ cần vài từ khoá, trợ lý tự viết mô tả sản phẩm hoặc nội dung giới thiệu, có sẵn gợi ý theo từng ngành hàng.', meta: { icon: 'ri:magic-line', iconStyle: iconBg('color-accent') } },
						{ title: 'Giỏ hàng ngay trong khung chat', content: 'Khách thêm giỏ, thanh toán qua MoMo, nhận hoá đơn ngay lập tức — không cần rời trang hay cài thêm ứng dụng nào.', meta: { icon: 'ri:shopping-cart-2-line', iconStyle: iconBg('color-info') } },
						{ title: 'Thu hút khách hàng với mã giảm giá', content: 'Tạo mã công khai hoặc tặng riêng ngay trong tin nhắn — cả hai bên đều thấy hiệu ứng ăn mừng khi mã được dùng.', meta: { icon: 'ri:gift-2-line', iconStyle: iconBg('color-warning') } },
						{ title: 'Trò chuyện công khai và riêng tư', content: 'Trò chuyện chung với mọi khách đang ghé thăm, hoặc mở hẳn 1 cuộc trò chuyện riêng — gửi kèm ảnh, video ngay trong khung chat.', meta: { icon: 'ri:chat-3-line', iconStyle: iconBg('color-primary') } },
						{ title: 'Gọi video, gọi thoại riêng tư', content: 'Không cần cài Zoom hay bất kỳ ứng dụng nào khác — cuộc gọi kết nối thẳng, riêng tư giữa hai bên.', meta: { icon: 'ri:vidicon-line', iconStyle: iconBg('color-secondary') } },
						{ title: 'Biết ngay ai đang có mặt', content: 'Phát hiện NGAY khi có người rời đi hay mất kết nối đột ngột — không phải chờ vài phút như nhiều ứng dụng trò chuyện khác.', meta: { icon: 'ri:wifi-line', iconStyle: iconBg('color-accent') } },
						{ title: 'Tự khắc phục khi có trục trặc', content: 'Dù nhiều người cùng ghé thăm một lúc, hệ thống tự kết nối lại ngay nếu ai đó bị rớt mạng, không bỏ sót tin nhắn nào.', meta: { icon: 'ri:refresh-line', iconStyle: iconBg('color-info') } },
					],
				}],
				config: (await import('@/sections/features/spatialCardWebApex.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 4. Quy trình — flow tổng quát thật (docs/CHANNEL.rst § 2), diễn giải đời thường ──
			{
				id: 'processModernStepTimeline',
				data: [{
					subtitle: 'QUY TRÌNH',
					meta: { heroTitle: 'Từ đăng nhập tới trò chuyện\ntrực tiếp, tất cả tự động' },
					steps: [
						{ id: 'login', title: 'Đăng nhập', icon: 'ri:door-open-line', content: 'Bằng email hoặc tài khoản Google — nếu đã đăng nhập sẵn thì bỏ qua bước này, vào thẳng danh sách gian hàng.' },
						{ id: 'list', title: 'Danh sách gian hàng', icon: 'ri:list-check-2', content: 'Cập nhật tức thời, ưu tiên hiện gian hàng của bạn trước, rồi tới các gian hàng đang có chủ hoạt động.' },
						{ id: 'open', title: 'Mở gian hàng', icon: 'ri:door-lock-line', content: 'Toàn bộ nội dung đã lưu trước đó hiện ra ngay lập tức, rồi hệ thống tự động kết nối trực tiếp với những người khác đang có mặt.' },
						{ id: 'connect', title: 'Kết nối trực tiếp', icon: 'ri:link', content: 'Mọi người tự tìm thấy nhau và kết nối thẳng với nhau, không qua trung gian nào — ai bị mất kết nối sẽ được phát hiện ngay lập tức.' },
						{ id: 'sync', title: 'Đồng bộ nội dung', icon: 'ri:refresh-line', content: 'Tin nhắn, sản phẩm, đơn hàng, mã giảm giá — mọi thứ trao đổi thẳng giữa các bên, không đi qua bất kỳ trung gian nào.' },
						{ id: 'live', title: 'Trải nghiệm trực tiếp', icon: 'ri:live-line', content: 'Xem sản phẩm, đặt hàng, trò chuyện và gọi video ngay trong 1 khung duy nhất.' },
					],
				}],
				config: (await import('@/sections/process/modernStepTimeline.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 5. So sánh thẳng thắn — kết nối trực tiếp vs cách làm truyền thống ────────
			{
				id: 'benefitsModernCardCompare',
				data: [{
					subtitle: 'SO SÁNH THẲNG THẮN',
					title: 'Vì sao nên chọn kết nối trực tiếp?',
					description: 'Cách làm truyền thống buộc bạn trả tiền theo lượng khách ghé thăm, và luôn có 1 điểm có thể gặp sự cố khiến tất cả cùng gián đoạn.\nGian hàng của chúng tôi thay đổi hẳn cách vận hành đó.',
					meta: {
						leftPanelTitle: 'Gian hàng trực tiếp',
						vsBadge: 'VS',
						rightPanelTitle: 'Cách làm truyền thống',
					},
					leftCards: [
						{ title: 'Chi phí không đổi dù đông khách đến đâu' },
						{ title: 'Nội dung luôn nằm trên thiết bị của bạn' },
						{ title: 'Trò chuyện, gọi video hoàn toàn miễn phí' },
						{ title: 'Tự động khắc phục khi có gián đoạn' },
						{ title: 'Chỉ tài khoản thật, mỗi thiết bị rõ ràng' },
						{ title: 'Dựng trang bán hàng bằng kéo-thả dễ dàng' },
					],
					rightCards: [
						{ title: 'Chi phí tăng theo lượng khách truy cập' },
						{ title: 'Một sự cố là mất kết nối với tất cả khách' },
						{ title: 'Trò chuyện, gọi video cần đầu tư tốn kém' },
						{ title: 'Phải tự khắc phục mỗi khi gián đoạn' },
						{ title: 'Tự lo xác thực, chống giả mạo tài khoản' },
						{ title: 'Thuê người dựng cả trang bán hàng' },
					],
				}],
				config: (await import('@/sections/benefits/modernCardCompare.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 6. Hoá đơn & thanh toán — tính năng thật của <svc-pay>, kể lại bằng lợi ích
			// (xem src/webs/pay/svc-pay.js + docs/PAY.rst § 2/3.3/3.4/3.6) ────────────────
			{
				id: 'featuresModernHoriIntro',
				data: [{
					subtitle: 'HOÁ ĐƠN & THANH TOÁN',
					meta: { heading: 'Đặt hàng, thanh toán,\ntheo dõi minh bạch từng bước' },
					pics: 'https://i.ibb.co/RTpnntQD/bill.png',
					cards: [
						{ title: 'Theo dõi đơn hàng rõ từng bước', content: '3 giai đoạn rõ ràng — đặt hàng, xử lý, vận chuyển — mỗi giai đoạn lại có các bước nhỏ bên trong, luôn biết đơn đang ở đâu và ai đang xử lý.', meta: { icon: 'ri:route-line', iconStyle: iconBg('color-primary') } },
						{ title: 'Hoá đơn thật, tra cứu bằng mã QR', content: 'Ngay khi thanh toán được xác nhận, hệ thống tạo 1 hoá đơn thật kèm mã QR — quét lại bất cứ lúc nào để xem tình trạng đơn, không cần đăng nhập.', meta: { icon: 'ri:qr-code-line', iconStyle: iconBg('color-secondary') } },
						{ title: 'Tự nhắc thanh toán, tự xác nhận đúng hạn', content: 'Thanh toán có đồng hồ đếm ngược rõ ràng; sau khi được giao, nếu quên bấm xác nhận đã nhận hàng, hệ thống tự chuyển trạng thái sau một khoảng thời gian, không ai bị treo đơn mãi.', meta: { icon: 'ri:timer-line', iconStyle: iconBg('color-accent') } },
						{ title: 'Huỷ, trả hàng, hoàn tiền minh bạch', content: 'Muốn huỷ hay trả hàng đều phải nêu rõ lý do, người bán chấp nhận hoặc từ chối, rồi tự xác nhận đã hoàn tiền — mọi bước đều ghi lại rõ ai xử lý, vào lúc nào.', meta: { icon: 'ri:refund-2-line', iconStyle: iconBg('color-info') } },
					],
				}],
				config: (await import('@/sections/features/modernHoriIntro.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 7. Nỗ lực của chúng tôi — TÁI DÙNG layout testimonial nhưng KHÔNG bịa review/
			// khách hàng giả, đóng khung rõ là cam kết thật (docs/CHANNEL.rst § 1) ──────────
			{
				id: 'testimonialsSpatialMasonryNeatApex',
				data: [{
					subtitle: 'KHÔNG PHẢI LỜI QUẢNG CÁO',
					meta: {
						sectionHeading: 'Chúng tôi luôn nỗ lực',
						sectionHeadingAccent: 'giúp bạn an tâm sử dụng.',
						sectionDescription: 'Giá trị được thể hiện qua trải nghiệm thực tế, không nhằm mục đích quảng bá trả phí.',
					},
					masonry: [
						{ title: '"Người dùng thật, không có bot ảo"', content: 'Bắt buộc đăng nhập bằng tài khoản thật trước khi tạo, xem, mua hay trò chuyện — không có khách vãng lai giấu danh tính.', pics: 'https://placehold.co/80x80/2dd4bf/0d0d0d?text=01', meta: { name: 'Nỗ lực #1', handle: '#nguoi-dung-that' } },
						{ title: '"Không lưu trữ nội dung trò chuyện hay đơn hàng của bạn"', content: 'Hệ thống trung tâm chỉ giữ vài dòng thông tin hiển thị cơ bản để giúp hai bên tìm thấy nhau — không hề chứa sản phẩm, tin nhắn hay đơn hàng của bạn.', pics: 'https://placehold.co/80x80/818cf8/0d0d0d?text=02', meta: { name: 'Nỗ lực #2', handle: '#khong-luu-noi-dung' } },
						{ title: '"Toàn bộ nội dung nằm trên chính thiết bị của bạn"', content: 'Sản phẩm, tin nhắn, đơn hàng đều được lưu ngay trên máy của bạn, chỉ trao đổi trực tiếp giữa các bên khi cần.', pics: 'https://placehold.co/80x80/fb7185/0d0d0d?text=03', meta: { name: 'Nỗ lực #3', handle: '#du-lieu-cua-ban' } },
						{ title: '"Chỉ bạn mới có quyền chỉnh sửa gian hàng của mình"', content: 'Người ghé thăm luôn chỉ xem được sản phẩm/nội dung — riêng giỏ hàng thì ai cũng thao tác được, vì đó là lựa chọn của chính họ.', pics: 'https://placehold.co/80x80/fbbf24/0d0d0d?text=04', meta: { name: 'Nỗ lực #4', handle: '#chi-ban-duoc-sua' } },
						{ title: '"Dùng bao nhiêu thiết bị cùng lúc cũng không vấn đề gì"', content: 'Mở gian hàng trên điện thoại lẫn máy tính cùng lúc vẫn hoạt động mượt mà, không bị coi là xung đột hay trùng lặp.', pics: 'https://placehold.co/80x80/2dd4bf/0d0d0d?text=05', meta: { name: 'Nỗ lực #5', handle: '#nhieu-thiet-bi' } },
						{ title: '"Hệ thống tự khắc phục, không cần bạn can thiệp"', content: 'Tự tìm và kết nối lại với người bị gián đoạn, tự thử lại khi cần, tự bổ sung nội dung bị thiếu.', pics: 'https://placehold.co/80x80/818cf8/0d0d0d?text=06', meta: { name: 'Nỗ lực #6', handle: '#tu-khac-phuc' } },
					],
				}],
				config: (await import('@/sections/testimonials/spatialMasonryNeatApex.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 8. FAQ trung thực — dựng từ chính docs/CHANNEL.rst § 5 "Giới hạn & đánh đổi" ──
			{
				id: 'faqSpatialExpansionApex',
				data: [{
					subtitle: 'HỎI THẲNG, ĐÁP THẬT',
					description: 'Kể cả những giới hạn hiện tại — vì một gian hàng đáng tin là một gian hàng không giấu nhược điểm.',
					meta: { heroTitle: 'Câu hỏi thường gặp' },
					expansion: [
						{ title: 'Tôi có thể tạo bao nhiêu gian hàng?', content: 'Hiện tại mỗi tài khoản chỉ tạo tối đa 1 gian hàng. Giới hạn này có thể tăng thêm sau này mà không ảnh hưởng tới gian hàng bạn đã tạo.' },
						{ title: 'Đơn hàng có tự đồng bộ giữa nhiều thiết bị của tôi không?', content: 'Chưa — đơn hàng, hoá đơn hiện chỉ nằm trên thiết bị bạn dùng để đặt hàng, chưa tự đồng bộ sang thiết bị khác. Cũng chưa có màn hình riêng để xem lại lịch sử đơn hàng.' },
						{ title: 'Nếu tôi tắt hẳn ứng dụng, khách có biết tôi ngừng hoạt động ngay không?', content: 'Trạng thái "đang hoạt động" chỉ đúng khi gian hàng đang thật sự mở — tắt hẳn ứng dụng thì trạng thái đó tự hết sau một khoảng thời gian ngắn, chứ không biết ngay lập tức.' },
						{ title: 'Hệ thống có ngăn được người gửi spam hay phá rối không?', content: 'Có cơ chế tự động hạn chế những hành vi bất thường như gửi quá nhanh, quá nhiều — đây là lớp bảo vệ cơ bản đầu tiên ngay trên thiết bị người dùng đó. Nếu cần chặt chẽ hơn, đội ngũ vận hành có thể bổ sung thêm biện pháp bảo vệ ở tầng hệ thống.' },
						{ title: 'Dữ liệu của tôi có bị mất khi có người bị rớt mạng giữa chừng không?', content: 'Không — hệ thống tự phát hiện ngay khi có người mất kết nối, và tự động bổ sung lại phần nội dung bị thiếu ngay khi kết nối lại, không cần bạn làm gì thêm.' },
						{ title: 'Tôi có cần tự lo hạ tầng để trò chuyện hay gọi video không?', content: 'Không — trò chuyện, gửi ảnh/video và gọi điện đều kết nối thẳng giữa hai bên. Hệ thống trung tâm chỉ hỗ trợ đúng bước đầu tiên, giúp hai bên tìm thấy nhau.' },
					],
				}],
				config: (await import('@/sections/faq/spatialExpansionApex.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 9. Miễn trừ trách nhiệm — minh bạch trước khi dùng, đặt ngay trước CTA ────
			{
				id: 'privacyPolicy',
				data: [{
					subtitle: 'MIỄN TRỪ TRÁCH NHIỆM',
					title: 'Một vài điều cần biết\ntrước khi bạn bắt đầu',
					description: 'Đây là sản phẩm phát triển vì cộng đồng — chúng tôi muốn bạn hiểu rõ những điều dưới đây trước khi tạo gian hàng hay giao dịch.',
					cards: [
						{ title: 'Sản phẩm đang phi lợi nhuận, được xây dựng và duy trì vì cộng đồng.' },
						{ title: 'App vẫn đang trong giai đoạn phát triển — tính năng mới liên tục được bổ sung, một số phần có thể còn thay đổi hoặc chưa hoàn thiện.' },
						{ title: 'Sản phẩm đang trong quá trình đăng ký với Bộ Công Thương theo quy định về thương mại điện tử — thông tin sẽ được cập nhật ngay khi hoàn tất.' },
						{ title: 'Tính năng giao dịch trực tuyến (đặt hàng, thanh toán, mã giảm giá) đã hoạt động, nhưng bạn nên tự kiểm tra kỹ thông tin người bán/người mua trước khi giao dịch để tránh rủi ro lừa đảo — hệ thống chỉ hỗ trợ kết nối hai bên, không đứng ra bảo đảm giao dịch.' },
					],
				}],
				config: (await import('@/sections/benefits/modernCardList.js')).config,
				sort: 0, col: '12', container: true,
			},

			// ── 10. CTA đóng ───────────────────────────────────────────────────────────
			{
				id: 'ctaSpatialNeatApex',
				data: [{
					subtitle: 'BẮT ĐẦU NGAY HÔM NAY',
					title: 'Gian hàng của riêng bạn,\nsẵn sàng trong vài phút.',
					description: 'Đăng nhập, đặt tên gian hàng, kéo-thả vài khối nội dung — vậy là xong.\nKhông cần thẻ tín dụng, không cần cài đặt phức tạp.',
					pics: 'https://i.ibb.co/W43HMBcC/beach.jpg',
					meta: { ctaPrimaryLabel: 'Tạo gian hàng miễn phí', ctaSecondaryLabel: 'Xem lại tính năng' },
				}],
				config: (await import('@/sections/cta/spatialNeatApex.js')).config,
				sort: 0, col: '12', container: true,
				// stys: { backgroundColor: 'var(--color-base-200)' },
			},
		],
	},
];

export const menuItems = [
	{
		iconMobile: 'ri:home-line',
		text: 'Tổng quan',
		items: [
			{ text: 'Chatzui - Giới thiệu', href: '#heroSpatialNeatCenterApex' },
			{ text: 'Con số', href: '#statsSpatialCardRowApex' },
			{ text: 'Quy trình', href: '#processModernStepTimeline' },
		],
	},
	{
		iconMobile: 'ri:apps-2-line',
		text: 'Tính năng',
		items: [
			{ text: 'Tính năng nổi bật', href: '#featuresSpatialCardWebApex' },
			{ text: 'Hoá đơn & thanh toán', href: '#featuresModernHoriIntro' },
			{ text: 'So sánh', href: '#benefitsModernCardCompare' },
		],
	},
	{
		iconMobile: 'ri:question-line',
		text: 'Hỏi đáp',
		items: [
			{ text: 'Nỗ lực của chúng tôi', href: '#testimonialsSpatialMasonryNeatApex' },
			{ text: 'Câu hỏi thường gặp', href: '#faqSpatialExpansionApex' },
			{ text: 'Miễn trừ trách nhiệm', href: '#benefitsModernCardList' },
		],
	},
	{
		iconMobile: 'ri:door-open-line',
		text: 'Vào kênh ngay',
		href: '/channel',
	},
];

export default { variant, views, menuItems };
