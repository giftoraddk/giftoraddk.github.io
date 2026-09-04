// 5 danh mục quà tặng doanh nghiệp — dùng cho menu "Quà tặng doanh nghiệp" và route tĩnh
// src/pages/gift/[occasions].astro. Thay thế hoàn toàn danh mục occasions cá nhân (sinh nhật,
// valentine, đám cưới...) cũ vì site định vị quà tặng doanh nghiệp B2B, không phải quà cá nhân.
export const corporateGiftCategories = {
  "vi": {
    "employee": "Quà nhân viên",
    "customer": "Quà khách hàng",
    "event": "Quà sự kiện",
    "appreciation": "Quà tri ân",
    "tet": "Quà Tết",
  },
  "en": {
    "employee": "Employee Gifts",
    "customer": "Customer Gifts",
    "event": "Event Gifts",
    "appreciation": "Appreciation Gifts",
    "tet": "Tet Gifts",
  },
}

export const colorTypes = {
  "vi": {
    "beige": "Be",
    "black": "Đen",
    "red": "Đỏ",
    "pink": "Hồng",
    "brown": "Nâu",
    "purple": "Tím",
    "white": "Trắng",
    "yellow": "Vàng",
    "gray": "Xám",
    "blue": "Xanh dương",
    "green": "Xanh lá"
  },
  "en": {
    "beige": "Beige",
    "black": "Black",
    "red": "Red",
    "pink": "Pink",
    "brown": "Brown",
    "purple": "Purple",
    "white": "White",
    "yellow": "Yellow",
    "gray": "Gray",
    "blue": "Blue",
    "green": "Green"
  }
}
