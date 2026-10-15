// src/modules/company.js — pháp nhân + mạng xã hội của giftoraddk.com, DÙNG CHUNG cho mọi trang: UtilityBar (`bar` — kèm
// nút đổi ngôn ngữ VI/EN), footer (`contact`), JSON-LD Organization (components/Head/Base.astro) và Store của trang chủ.
// Mỗi trang chỉ thêm `info` (đoạn giới thiệu dưới logo) riêng của nó — xem companyContact().
// Tên / địa chỉ / số điện thoại phải giống hệt nhau ở mọi nơi (footer, chính sách, JSON-LD, public/data/gift.json) —
// Google và AI Search đối chiếu chúng để gắn đúng 1 doanh nghiệp. Đây cũng là NGƯỜI BÁN trên hoá đơn (modules/gift/shop.js
// `shop.seller` dựng từ đây) — sửa thông tin công ty ở đúng file này, mọi nơi tự khớp.

export const company = {
	name: { vi: 'Công ty TNHH Giftora DDK', en: 'Giftora DDK Co., Ltd.' },
	taxNumber: '0319681025',
	email: 'sales@giftoraddk.com',
	address: '670/59/10 Đoàn Văn Bơ, Khu phố 16, Phường Xóm Chiếu, TP. HCM',
	hotline: '0934561501',
}

// Địa chỉ dạng schema.org PostalAddress — cùng `company.address` ở trên.
export const companyPostalAddress = {
	'@type': 'PostalAddress',
	streetAddress: '670/59/10 Đoàn Văn Bơ, Khu phố 16, Phường Xóm Chiếu',
	addressLocality: 'Thành phố Hồ Chí Minh',
	addressCountry: 'VN',
}

// Giờ làm việc — footer (modules/gift/shop.js menuSpecials) và openingHoursSpecification của Store (pages/index.astro).
export const companyHours = [
	{ days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:00', closes: '17:30' },
	{ days: ['Saturday'], opens: '08:00', closes: '12:00' },
]

// Tài khoản chính thức — bar, footer, và `sameAs` của JSON-LD Organization (chỉ link http(s) thật mới vào sameAs).
export const companySocials = [
	{ text: 'Facebook', href: 'https://www.facebook.com/giftoraddk', icon: 'ri:facebook-fill' },
	{ text: 'TikTok', href: '#', icon: 'ri:tiktok-fill' },
]

/** Footer contact = công ty + đoạn giới thiệu `info` ({ vi, en }) của trang. */
export const companyContact = (info) => ({ ...company, info })

/** UtilityBar (Core `bar`) — hotline / Zalo, mạng xã hội, nút VI/EN. */
export const companyBar = (contact) => ({
	...contact,
	hotlineLabel: { vi: 'Hotline / Zalo', en: 'Hotline / Zalo' },
	socialsLabel: { vi: 'Mạng xã hội', en: 'Follow us' },
	socials: companySocials,
})
