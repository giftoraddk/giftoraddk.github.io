// 5 trang dịch vụ dưới menu "Dịch vụ" — mỗi service tự định nghĩa `sections` riêng (tái dùng
// section module chung trong src/sections/**) nên có thể tự do phối layout khác nhau, nhưng vẫn
// data-driven từ 1 file duy nhất (giống pattern src/modules/policies.js). Render bởi
// src/pages/gift/service/[slug].astro qua <web-board>, cùng layout CoreShop/menu/footer với các
// trang gift khác.

// Override đúng aspectRatio ảnh hero riêng cho trang dịch vụ (21/12 thay vì 21/9 mặc định) —
// không đụng vào modernSlideNeat.js dùng chung toàn site, chỉ deep-clone đúng nhánh
// tiers[0][0].makes chứa make 'pics' để đổi field lồng sâu opt.stys.aspectRatio.
const baseHeroConfig = (await import('@/sections/showcase/modernSlideNeat.js')).config;
const heroConfig = {
	...baseHeroConfig,
	tiers: [
		[{
			...baseHeroConfig.tiers[0][0],
			makes: baseHeroConfig.tiers[0][0].makes.map((group) =>
				group.map((item) => item.bit === 'pics'
					? { ...item, opt: { ...item.opt, stys: { ...item.opt.stys, aspectRatio: '21/12' } } }
					: item
				)
			),
		}],
		baseHeroConfig.tiers[1],
	],
};
const processConfig = (await import('@/sections/process/modernStepCentered.js')).config;
const galleryConfig = (await import('@/sections/showcase/modernGalleryStrip.js')).config;

export const services = [
	{
		slug: 'in-logo',
		title: { vi: 'In logo', en: 'Logo Printing' },
		seo: {
			title: 'Dịch Vụ In Logo Quà Tặng Doanh Nghiệp Chuyên Nghiệp',
			description: 'In logo thương hiệu lên quà tặng doanh nghiệp: sổ tay, bình nước, túi xách, hộp quà... Sắc nét, bền màu, giao số lượng lớn đúng tiến độ.',
		},
		sections: [
			{
				id: 'serviceHero',
				data: [{
					title: { vi: 'In Logo Thương Hiệu Sắc Nét, Bền Đẹp', en: 'Sharp, Long-Lasting Logo Printing' },
					slider: [{ pics: '/images/common/gift-custom.webp' }, { pics: '/images/common/gift-service.webp' }, { pics: '/images/common/gift-corporate.webp' }, { pics: '/images/common/gift-package.webp' }, { pics: '/images/common/gift-ship.webp' }],
				}],
				config: heroConfig, sort: 0, col: '12', container: true, stys: { marginTop: '1rem' },
			},
			{
				id: 'serviceProcess',
				data: [{
					subtitle: 'QUY TRÌNH',
					title: { vi: 'In logo chỉ trong 4 bước đơn giản', en: 'Logo printing in 4 simple steps' },
					steps: [
						{ id: 'receive', title: { vi: 'Tiếp nhận yêu cầu', en: 'Request received' }, icon: 'ri:file-text-line', content: { vi: 'Gửi logo, màu sắc thương hiệu và số lượng cần in, đội ngũ tư vấn sẽ báo giá trong 24h.', en: 'Send us your logo, brand colors and quantity — we quote within 24 hours.' } },
						{ id: 'design', title: { vi: 'Duyệt bản in mẫu', en: 'Approve mockup' }, icon: 'ri:palette-line', content: { vi: 'Nhận file mockup in logo trên sản phẩm thực tế, chỉnh sửa đến khi khách hàng ưng ý.', en: 'Receive a mockup on the actual product, revised until you are satisfied.' } },
						{ id: 'produce', title: { vi: 'Sản xuất & kiểm tra', en: 'Produce & inspect' }, icon: 'ri:settings-3-line', content: { vi: 'In ấn bằng công nghệ UV / ép nhiệt / khắc laser tuỳ chất liệu, kiểm tra 100% trước khi đóng gói.', en: 'Printed with UV / heat-press / laser engraving depending on material, 100% inspected before packing.' } },
						{ id: 'deliver', title: { vi: 'Giao hàng đúng hẹn', en: 'On-time delivery' }, icon: 'ri:truck-line', content: { vi: 'Đóng gói cẩn thận và giao đến kho hoặc trực tiếp sự kiện của doanh nghiệp.', en: 'Carefully packed and delivered to your warehouse or directly to the event.' } },
					],
				}],
				config: processConfig, sort: 1, col: '12', container: true,
			},
			{
				id: 'serviceGallery',
				data: [{
					title: { vi: 'Một số sản phẩm đã in logo', en: 'Logo-printed products' },
					description: { vi: '"Mỗi logo là một dấu ấn thương hiệu trên từng món quà"', en: '"Every logo is a brand mark on every gift"' },
					slider: [{ pics: '/images/common/gift-a.webp' }, { pics: '/images/common/gift-b.webp' }, { pics: '/images/common/gift-c.webp' }, { pics: '/images/common/gift-d.webp' }, { pics: '/images/common/gift-e.webp' }],
				}],
				config: galleryConfig, sort: 2, col: '12', container: true,
			},
		],
	},
	{
		slug: 'thiet-ke-qua-tang',
		title: { vi: 'Thiết kế quà tặng', en: 'Gift Design' },
		seo: {
			title: 'Thiết Kế Bộ Quà Tặng Doanh Nghiệp Theo Yêu Cầu',
			description: 'Tư vấn và thiết kế bộ quà tặng doanh nghiệp riêng theo nhận diện thương hiệu, ngân sách và mục đích tặng. Từ ý tưởng đến sản phẩm hoàn chỉnh.',
		},
		sections: [
			{
				id: 'serviceHero',
				data: [{
					title: { vi: 'Thiết Kế Quà Tặng Theo Dấu Ấn Riêng', en: 'Gift Design With Your Own Mark' },
          slider: [{ pics: '/images/common/gift-service.webp' }, { pics: '/images/common/gift-custom.webp' }, { pics: '/images/common/gift-corporate.webp' }, { pics: '/images/common/gift-package.webp' }, { pics: '/images/common/gift-ship.webp' }],
				}],
				config: heroConfig, sort: 0, col: '12', container: true, stys: { marginTop: '1rem' },
			},
			{
				id: 'serviceProcess',
				data: [{
					subtitle: 'QUY TRÌNH',
					title: { vi: 'Từ ý tưởng đến bộ quà hoàn chỉnh', en: 'From concept to finished gift set' },
					steps: [
						{ id: 'brief', title: { vi: 'Tiếp nhận brief', en: 'Gather brief' }, icon: 'ri:questionnaire-line', content: { vi: 'Trao đổi mục đích tặng quà, đối tượng nhận và ngân sách dự kiến.', en: 'Discuss the gifting purpose, recipients and expected budget.' } },
						{ id: 'concept', title: { vi: 'Đề xuất concept', en: 'Propose concepts' }, icon: 'ri:lightbulb-line', content: { vi: 'Gợi ý 2–3 phương án phối set quà phù hợp nhận diện thương hiệu.', en: 'Suggest 2–3 gift-set concepts matching your brand identity.' } },
						{ id: 'sample', title: { vi: 'Làm mẫu thực tế', en: 'Produce sample' }, icon: 'ri:box-3-line', content: { vi: 'Sản xuất mẫu thật để khách hàng kiểm tra chất lượng, màu sắc trước khi đặt số lượng lớn.', en: 'Produce a real sample for you to check quality and color before bulk order.' } },
						{ id: 'finalize', title: { vi: 'Hoàn thiện đơn hàng', en: 'Finalize order' }, icon: 'ri:checkbox-circle-line', content: { vi: 'Chốt mẫu, sản xuất hàng loạt và bàn giao đúng tiến độ.', en: 'Confirm the sample, mass-produce and deliver on schedule.' } },
					],
				}],
				config: processConfig, sort: 1, col: '12', container: true,
			},
			{
				id: 'serviceGallery',
				data: [{
					title: { vi: 'Bộ quà tặng theo yêu cầu', en: 'Custom gift sets' },
					description: { vi: '"Thiết kế riêng cho từng thương hiệu, từng dịp tặng"', en: '"Designed for every brand, every occasion"' },
					slider: [{ pics: '/images/common/gift-a.webp' }, { pics: '/images/common/gift-b.webp' }, { pics: '/images/common/gift-c.webp' }, { pics: '/images/common/gift-d.webp' }, { pics: '/images/common/gift-e.webp' }],
				}],
				config: galleryConfig, sort: 2, col: '12', container: true,
			},
		],
	},
	{
		slug: 'gift-box',
		title: { vi: 'Gift box', en: 'Gift Box' },
		seo: {
			title: 'Gift Box – Hộp Quà Tặng Doanh Nghiệp Sang Trọng',
			description: 'Đa dạng mẫu gift box cao cấp, tuỳ chỉnh kích thước và phong cách theo thương hiệu. Phù hợp quà tặng khách hàng, đối tác và sự kiện doanh nghiệp.',
		},
		sections: [
			{
				id: 'serviceHero',
				data: [{
					title: { vi: 'Gift Box Sang Trọng, Đúng Chất Thương Hiệu', en: 'Premium Gift Boxes, On-Brand' },
          slider: [{ pics: '/images/common/gift-corporate.webp' }, { pics: '/images/common/gift-custom.webp' }, { pics: '/images/common/gift-service.webp' }, { pics: '/images/common/gift-package.webp' }, { pics: '/images/common/gift-ship.webp' }],
				}],
				config: heroConfig, sort: 0, col: '12', container: true, stys: { marginTop: '1rem' },
			},
			{
				id: 'serviceProcess',
				data: [{
					subtitle: 'QUY TRÌNH',
					title: { vi: 'Chọn Gift Box theo 4 bước', en: 'Choose a gift box in 4 steps' },
					steps: [
						{ id: 'select', title: { vi: 'Chọn mẫu hộp', en: 'Pick a box style' }, icon: 'ri:gift-line', content: { vi: 'Tham khảo thư viện mẫu gift box đa dạng chất liệu: giấy, gỗ, kim loại.', en: 'Browse our gift-box library in paper, wood or metal.' } },
						{ id: 'customize', title: { vi: 'Tuỳ chỉnh nội dung', en: 'Customize contents' }, icon: 'ri:edit-2-line', content: { vi: 'Sắp xếp sản phẩm bên trong theo chủ đề, thêm thiệp và phụ kiện trang trí.', en: 'Arrange the products by theme, add a card and decorative accessories.' } },
						{ id: 'brand', title: { vi: 'Cá nhân hoá thương hiệu', en: 'Brand it' }, icon: 'ri:price-tag-3-line', content: { vi: 'In logo, dán tem hoặc khắc tên lên hộp quà theo nhận diện doanh nghiệp.', en: 'Print your logo, add stickers, or engrave names to match your identity.' } },
						{ id: 'pack', title: { vi: 'Đóng hộp hoàn thiện', en: 'Final packing' }, icon: 'ri:archive-line', content: { vi: 'Đóng gói cẩn thận, niêm phong sẵn sàng vận chuyển hoặc trao tặng trực tiếp.', en: 'Carefully packed and sealed, ready to ship or hand-deliver.' } },
					],
				}],
				config: processConfig, sort: 1, col: '12', container: true,
			},
			{
				id: 'serviceGallery',
				data: [{
					title: { vi: 'Mẫu Gift Box tiêu biểu', en: 'Signature gift boxes' },
					description: { vi: '"Sang trọng từ trong ra ngoài"', en: '"Elegant, inside and out"' },
					slider: [{ pics: '/images/common/gift-a.webp' }, { pics: '/images/common/gift-b.webp' }, { pics: '/images/common/gift-c.webp' }, { pics: '/images/common/gift-d.webp' }, { pics: '/images/common/gift-e.webp' }],
				}],
				config: galleryConfig, sort: 2, col: '12', container: true,
			},
		],
	},
	{
		slug: 'dong-goi',
		title: { vi: 'Đóng gói', en: 'Packaging' },
		seo: {
			title: 'Dịch Vụ Đóng Gói Quà Tặng Doanh Nghiệp Chuyên Nghiệp',
			description: 'Đóng gói quà tặng doanh nghiệp tỉ mỉ, thẩm mỹ cao, bảo vệ sản phẩm trong vận chuyển. Nhận đóng gói số lượng lớn theo yêu cầu.',
		},
		sections: [
			{
				id: 'serviceHero',
				data: [{
					title: { vi: 'Đóng Gói Tỉ Mỉ, Bảo Vệ Từng Món Quà', en: 'Meticulous Packing, Every Gift Protected' },
          slider: [{ pics: '/images/common/gift-package.webp' }, { pics: '/images/common/gift-custom.webp' }, { pics: '/images/common/gift-service.webp' }, { pics: '/images/common/gift-corporate.webp' }, { pics: '/images/common/gift-ship.webp' }],
				}],
				config: heroConfig, sort: 0, col: '12', container: true, stys: { marginTop: '1rem' },
			},
			{
				id: 'serviceProcess',
				data: [{
					subtitle: 'QUY TRÌNH',
					title: { vi: 'Quy trình đóng gói 4 bước', en: 'A 4-step packing process' },
					steps: [
						{ id: 'inspect', title: { vi: 'Kiểm tra sản phẩm', en: 'Inspect products' }, icon: 'ri:search-eye-line', content: { vi: 'Kiểm tra chất lượng, số lượng sản phẩm trước khi đóng gói.', en: 'Check quality and quantity before packing.' } },
						{ id: 'wrap', title: { vi: 'Bọc lót & tạo hình', en: 'Cushion & arrange' }, icon: 'ri:hand-heart-line', content: { vi: 'Bọc lót chống sốc, xếp đặt sản phẩm gọn gàng, thẩm mỹ.', en: 'Shock-absorbing cushioning, neatly and elegantly arranged.' } },
						{ id: 'decorate', title: { vi: 'Trang trí hoàn thiện', en: 'Finishing touches' }, icon: 'ri:sparkling-2-line', content: { vi: 'Thêm ruy băng, thiệp chúc và phụ kiện trang trí theo yêu cầu.', en: 'Add ribbons, greeting cards and decorative accessories on request.' } },
						{ id: 'seal', title: { vi: 'Niêm phong & dán nhãn', en: 'Seal & label' }, icon: 'ri:shield-check-line', content: { vi: 'Niêm phong chắc chắn, dán nhãn thông tin sẵn sàng giao hoặc lưu kho.', en: 'Securely sealed and labeled, ready to ship or store.' } },
					],
				}],
				config: processConfig, sort: 1, col: '12', container: true,
			},
			{
				id: 'serviceGallery',
				data: [{
					title: { vi: 'Hình ảnh đóng gói thực tế', en: 'Packaging in practice' },
					description: { vi: '"Từng chi tiết đều được chăm chút"', en: '"Every detail, carefully handled"' },
					slider: [{ pics: '/images/common/gift-a.webp' }, { pics: '/images/common/gift-b.webp' }, { pics: '/images/common/gift-c.webp' }, { pics: '/images/common/gift-d.webp' }, { pics: '/images/common/gift-e.webp' }],
				}],
				config: galleryConfig, sort: 2, col: '12', container: true,
			},
		],
	},
	{
		slug: 'giao-hang-doanh-nghiep',
		title: { vi: 'Giao hàng doanh nghiệp', en: 'Corporate Delivery' },
		seo: {
			title: 'Giao Hàng Quà Tặng Doanh Nghiệp Số Lượng Lớn',
			description: 'Giao hàng quà tặng doanh nghiệp nhanh chóng, đúng hẹn trên toàn quốc. Hỗ trợ giao số lượng lớn đến nhiều địa điểm, đúng ngày sự kiện.',
		},
		sections: [
			{
				id: 'serviceHero',
				data: [{
					title: { vi: 'Giao Hàng Đúng Hẹn, Đúng Địa Điểm', en: 'On Time, To The Right Place' },
          slider: [{ pics: '/images/common/gift-ship.webp' }, { pics: '/images/common/gift-custom.webp' }, { pics: '/images/common/gift-service.webp' }, { pics: '/images/common/gift-corporate.webp' }, { pics: '/images/common/gift-package.webp' }],
				}],
				config: heroConfig, sort: 0, col: '12', container: true, stys: { marginTop: '1rem' },
			},
			{
				id: 'serviceProcess',
				data: [{
					subtitle: 'QUY TRÌNH',
					title: { vi: 'Giao hàng doanh nghiệp qua 4 bước', en: 'Corporate delivery in 4 steps' },
					steps: [
						{ id: 'confirm', title: { vi: 'Xác nhận đơn hàng', en: 'Confirm order' }, icon: 'ri:file-list-3-line', content: { vi: 'Xác nhận số lượng, địa điểm và thời gian giao hàng mong muốn.', en: 'Confirm quantity, delivery locations and desired timing.' } },
						{ id: 'schedule', title: { vi: 'Lên lịch vận chuyển', en: 'Schedule shipment' }, icon: 'ri:calendar-check-line', content: { vi: 'Sắp xếp phương tiện phù hợp với khối lượng và khoảng cách giao hàng.', en: 'Arrange the right vehicle for the volume and distance.' } },
						{ id: 'deliver', title: { vi: 'Giao hàng toàn quốc', en: 'Nationwide delivery' }, icon: 'ri:truck-line', content: { vi: 'Giao đến một hoặc nhiều địa điểm theo yêu cầu, kể cả ngoài giờ hành chính.', en: 'Delivered to one or many locations on request, even outside office hours.' } },
						{ id: 'confirm-received', title: { vi: 'Xác nhận đã nhận', en: 'Confirm receipt' }, icon: 'ri:checkbox-circle-line', content: { vi: 'Khách hàng kiểm tra và xác nhận tình trạng hàng hoá khi nhận.', en: 'You inspect and confirm the condition of the goods on arrival.' } },
					],
				}],
				config: processConfig, sort: 1, col: '12', container: true,
			},
			{
				id: 'serviceGallery',
				data: [{
					title: { vi: 'Giao hàng doanh nghiệp toàn quốc', en: 'Nationwide corporate delivery' },
					description: { vi: '"Đúng hẹn dù số lượng lớn"', en: '"On time, no matter the volume"' },
					slider: [{ pics: '/images/common/gift-a.webp' }, { pics: '/images/common/gift-b.webp' }, { pics: '/images/common/gift-c.webp' }, { pics: '/images/common/gift-d.webp' }, { pics: '/images/common/gift-e.webp' }],
				}],
				config: galleryConfig, sort: 2, col: '12', container: true,
			},
		],
	},
];
