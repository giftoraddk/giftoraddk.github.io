// src/webs/pay/tools/constant.js
//
// Domain `pay` độc lập hoàn toàn (xem hook/PAY.rst §1) — mọi hằng số dưới đây
// (PAY_METHODS/PROMO_CODES/NOTES...) không import từ domain nào khác.
export const MAJOR_STEPS = ['order', 'processing', 'delivery'];

export const SUB_STEPS = {
    order:      ['placing', 'paying'],
    processing: ['preparing', 'cancelled', 'done'],
    delivery:   ['packing', 'shipping', 'delivered', 'received', 'returned'],
};

export const PAYMENT_WINDOW_MS = 5 * 60 * 1000;

// Buyer không xác nhận "Đã nhận hàng" trong vòng 15 phút kể từ lúc SELLER/SHIPPER tự xác nhận
// "Xác nhận đã giao" (meta.delivered, KHÁC meta.shipping — xem confirmDeliveryDone() ở
// tools/service.js) -> tự động coi như đã hoàn tất (sub -> 'received'), xem autoConfirmReceived().
// Tách hằng số riêng dù trước đây cùng giá trị PAYMENT_WINDOW_MS — 2 deadline khác ý nghĩa, dài
// hơn payment window vì buyer cần thời gian thực tế nhận hàng từ shipper.
export const DELIVERY_CONFIRM_WINDOW_MS = 15 * 60 * 1000;

export const STEP_LABELS = {
    vi: {
        order:      { label: 'Đặt hàng',       placing: 'Đặt hàng',      paying: 'Thanh toán' },
        processing: { label: 'Xử lý đơn hàng', preparing: 'Đang chuẩn bị hàng', cancelled: 'Đã huỷ', done: 'Đã hoàn thành' },
        delivery:   { label: 'Vận chuyển',     packing: 'Đóng gói',     shipping: 'Giao hàng',      delivered: 'Đã giao hàng', received: 'Đã nhận hàng', returned: 'Trả hàng' },
    },
    en: {
        order:      { label: 'Order',      placing: 'Place order',   paying: 'Payment' },
        processing: { label: 'Processing', preparing: 'Preparing', cancelled: 'Cancelled', done: 'Completed' },
        delivery:   { label: 'Delivery',   packing: 'Packing',      shipping: 'Shipping', delivered: 'Delivered', received: 'Received', returned: 'Returned' },
    },
};

export const STEP_DESC = {
    vi: {
        placing: 'Chọn hình thức thanh toán và xác nhận đơn hàng.',
        paying: 'Thanh toán trong vòng 5 phút, sau đó chờ xác nhận từ 2 bên.',
        preparing: 'Người bán đang chuẩn bị hàng cho bạn.',
        cancelled: 'Đơn hàng đã bị huỷ.',
        done: 'Đơn hàng đã xử lý xong, chuẩn bị giao.',
        packing: 'Đơn hàng đang chờ được đóng gói và giao đi.',
        shipping: 'Đơn hàng đang được vận chuyển tới bạn.',
        delivered: 'Người bán đã giao hàng, chờ người mua xác nhận.',
        received: 'Người mua đã nhận hàng, giao dịch hoàn tất.',
        returned: 'Đơn hàng đang được trả lại.',
    },
    en: {
        placing: 'Pick a payment method and confirm the order.',
        paying: 'Pay within 5 minutes, then wait for both sides to confirm.',
        preparing: 'The seller is preparing your order.',
        cancelled: 'This order has been cancelled.',
        done: 'Processing complete, getting ready to ship.',
        packing: 'Order is waiting to be packed and shipped.',
        shipping: 'Order is on its way to you.',
        delivered: 'Seller marked this as delivered, waiting on buyer confirmation.',
        received: 'Buyer confirmed receipt — transaction complete.',
        returned: 'This order is being returned.',
    },
};

// UI microcopy (buttons/placeholders/notes) — dùng qua txtLingo(this.txt, TXT_STD, this.lang),
// cùng pattern get _txt() lặp ở mọi component của domain này. Tách khỏi STEP_LABELS/STEP_DESC vì
// đây là flat key->string, còn 2 dict trên keyed theo major/sub.
export const TXT_STD = {
    vi: {
        roleLabel: 'Xem với vai trò', roleBuyer: 'Người mua', roleSeller: 'Người bán',
        continueToPayment: 'Tiếp tục thanh toán',
        countdownLabel: 'Thời gian còn lại',
        countdownExpired: 'Đã hết thời gian thanh toán',
        completeProcessing: 'Hoàn thành xử lý',
        sellerPreparingNote: 'Người bán đang chuẩn bị hàng.',
        cancelOrder: 'Huỷ đơn',
        cancelHint: 'Đơn hàng có thể được huỷ bởi người bán hoặc người mua.',
        cancelledBy: 'Huỷ bởi',
        cancelReasonPh: 'Lý do huỷ đơn...',
        sellerCancelHint: 'Bạn có thể chủ động huỷ đơn này nếu cần.',
        sellerCancelReasonPh: 'Lý do huỷ đơn (phía người bán)...',
        sellerCancelOrder: 'Huỷ đơn này',
        confirmCancel: 'Xác nhận huỷ',
        reasonLabel: 'Lý do',
        refundPendingNote: 'Đơn hàng cần được hoàn tiền lại cho người mua.',
        refundDoneNote: 'Đã hoàn tiền cho người mua.',
        confirmRefundLabel: 'Xác nhận đã hoàn tiền',
        continueToDelivery: 'Chuyển sang đóng gói',
        confirmPacked: 'Đóng gói và chuyển cho đơn vị giao hàng',
        confirmShipped: 'Đang giao hàng',
        confirmReceived: 'Đã nhận hàng',
        sellerPackingNote: 'Người bán đang đóng gói hàng.',
        courierShippingNote: 'Đơn vị giao hàng đang giao đơn hàng của bạn.',
        shipperCallHint: 'Shipper có thể gọi điện khi đến giao hàng — vui lòng chú ý điện thoại.',
        confirmDelivery: 'Xác nhận đã giao',
        returnOrder: 'Trả hàng',
        returnReasonPh: 'Lý do trả hàng...',
        confirmReturn: 'Xác nhận trả hàng',
        returnedNote: 'Đơn hàng đã được trả lại',
        orderPreparedNote: 'Đơn hàng đã chuẩn bị xong.',
        transactionDone: 'Giao dịch đã hoàn tất.',
        orderItemsEmpty: 'Chưa có sản phẩm nào trong đơn.',
        totalLabel: 'Tổng tiền',
        backToCart: '← Quay lại giỏ hàng',
        myOrder: 'Đơn của tôi',
        autoConfirmLabel: 'Tự động xác nhận đã nhận hàng sau',
        invoiceLookupHint: 'Quét mã QR hoặc lưu lại mã đơn để tra cứu đơn hàng bất cứ lúc nào.',
        deliveryToggleLabel: 'Giao hàng',
        customerRequiredHint: 'Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng ở trên để tiếp tục.',
        pastStepDoneAt: ts => `Hoàn tất lúc ${ts}`,
        handlerNamePh: 'Tên người xử lý (tuỳ chọn)',
        handlerPhonePh: 'Số điện thoại (tuỳ chọn)',
        handlerNotePh: 'Ghi chú (tuỳ chọn)...',
        returnMediaPh: 'Dán/upload ảnh minh chứng hàng trả (tuỳ chọn)',
        deliveryMediaPh: 'Dán/upload ảnh minh chứng đã giao (tuỳ chọn)',
        handledByLabel: 'Xử lý bởi',
        deliveredByLabel: 'Đã giao hàng bởi',
        quickFillLabel: 'Điền nhanh',
    },
    en: {
        roleLabel: 'View as', roleBuyer: 'Buyer', roleSeller: 'Seller',
        continueToPayment: 'Continue to payment',
        countdownLabel: 'Time remaining',
        countdownExpired: 'Payment window expired',
        completeProcessing: 'Complete processing',
        sellerPreparingNote: 'The seller is preparing your order.',
        cancelOrder: 'Cancel order',
        cancelHint: 'Either the seller or the buyer can cancel this order.',
        cancelledBy: 'Cancelled by',
        cancelReasonPh: 'Reason for cancelling...',
        sellerCancelHint: 'You can cancel this order yourself if needed.',
        sellerCancelReasonPh: 'Reason for cancelling (seller side)...',
        sellerCancelOrder: 'Cancel this order',
        confirmCancel: 'Confirm cancel',
        reasonLabel: 'Reason',
        refundPendingNote: 'This order needs to be refunded to the buyer.',
        refundDoneNote: 'The buyer has been refunded.',
        confirmRefundLabel: 'Confirm refund sent',
        continueToDelivery: 'Move to packing',
        confirmPacked: 'Packed and handed over to the carrier',
        confirmShipped: 'Out for delivery',
        confirmReceived: 'Received',
        sellerPackingNote: 'The seller is packing your order.',
        courierShippingNote: 'The carrier is delivering your order.',
        shipperCallHint: 'The shipper may call you on arrival — please keep an eye on your phone.',
        confirmDelivery: 'Confirm delivered',
        returnOrder: 'Return order',
        returnReasonPh: 'Reason for return...',
        confirmReturn: 'Confirm return',
        returnedNote: 'This order has been returned',
        orderPreparedNote: 'The order has been prepared.',
        transactionDone: 'Transaction complete.',
        orderItemsEmpty: 'No items in this order yet.',
        totalLabel: 'Total',
        backToCart: '← Back to cart',
        myOrder: 'My order',
        autoConfirmLabel: 'Auto-confirm received in',
        invoiceLookupHint: 'Scan the QR code or save this order code to look it up anytime.',
        deliveryToggleLabel: 'Delivery',
        customerRequiredHint: 'Please fill in full name, phone, and delivery address above to continue.',
        pastStepDoneAt: ts => `Completed at ${ts}`,
        handlerNamePh: 'Handler name (optional)',
        handlerPhonePh: 'Phone number (optional)',
        handlerNotePh: 'Note (optional)...',
        returnMediaPh: 'Paste/upload proof photo (optional)',
        deliveryMediaPh: 'Paste/upload delivery proof photo (optional)',
        handledByLabel: 'Handled by',
        deliveredByLabel: 'Delivered by',
        quickFillLabel: 'Use existing info',
    },
};

// ── Cancel / warden copy — dùng bởi svc-pay.js (banner) + svc-pay-warden.js (action list) ──────
export const CANCEL_TXT = {
    vi: {
        cancelPendingBanner: 'Yêu cầu huỷ đơn đang chờ người bán xử lý.',
        cancelRejectedBanner: 'Người bán đã từ chối yêu cầu huỷ đơn.',
        cancelRejectReasonLabel: 'Lý do từ chối',
        cancelRetry: 'Gửi lại yêu cầu huỷ',
        wardenTitle: 'Danh sách đơn hàng',
        wardenEmpty: 'Chưa có đơn hàng nào đã thanh toán.',
        wardenColInvoice: 'Mã đơn', wardenColItems: 'Sản phẩm', wardenColBuyer: 'Người nhận',
        wardenColSeller: 'Người bán',
        wardenColStep: 'Quy trình', wardenColActions: 'Hành động',
        wardenConfirmPayment: 'Xác nhận đã nhận thanh toán',
        wardenConfirmReceived: 'Xác nhận đã nhận hàng',
        wardenAcceptCancel: 'Chấp nhận huỷ', wardenRejectCancel: 'Từ chối huỷ',
        wardenRejectReasonPh: 'Lý do từ chối huỷ đơn...',
        wardenCancelPending: 'Khách yêu cầu huỷ',
        wardenViewDetail: 'Xem chi tiết',
        wardenOpenTab: 'Mở ở tab mới',
        notApplicablePickup: 'Đơn nhận tại quầy — không qua bước này.',
        wardenNewOrderToast: 'Có đơn hàng mới cần xử lý!',
        wardenSellerCancelledToast: 'Người bán đã huỷ đơn hàng của bạn.',
        wardenCancelRejectedToast: 'Người bán đã từ chối yêu cầu huỷ đơn của bạn.',
        wardenCancelAcceptedToast: 'Yêu cầu huỷ đơn của bạn đã được chấp nhận.',
        wardenConfirmRefund: 'Xác nhận đã hoàn tiền',
    },
    en: {
        cancelPendingBanner: 'Cancellation request pending seller review.',
        cancelRejectedBanner: 'The seller rejected the cancellation request.',
        cancelRejectReasonLabel: 'Rejection reason',
        cancelRetry: 'Request cancellation again',
        wardenTitle: 'Orders',
        wardenEmpty: 'No paid orders yet.',
        wardenColInvoice: 'Invoice', wardenColItems: 'Items', wardenColBuyer: 'Buyer',
        wardenColSeller: 'Seller',
        wardenColStep: 'Progress', wardenColActions: 'Actions',
        wardenConfirmPayment: 'Confirm payment received',
        wardenConfirmReceived: 'Confirm received',
        wardenAcceptCancel: 'Accept cancel', wardenRejectCancel: 'Reject cancel',
        wardenRejectReasonPh: 'Reason for rejecting the cancellation...',
        wardenCancelPending: 'Buyer requested cancellation',
        wardenViewDetail: 'View detail',
        wardenOpenTab: 'Open in new tab',
        notApplicablePickup: 'Pickup order — this step is skipped.',
        wardenNewOrderToast: 'New order needs processing!',
        wardenSellerCancelledToast: 'The seller cancelled your order.',
        wardenCancelRejectedToast: 'The seller rejected your cancellation request.',
        wardenCancelAcceptedToast: 'Your cancellation request was accepted.',
        wardenConfirmRefund: 'Confirm refund sent',
    },
};

// ── Payment methods ──────────────────────────────────────────────────────────────────────────
// Tiền mặt luôn đứng đầu — momo/bank chỉ hiện thêm nếu wallet đã có cấu hình tương ứng.
export const PAY_METHODS = [
    { value: 'cash', label: 'Tiền mặt',     icon: 'ion:cash-outline' },
    { value: 'momo', label: 'MoMo',         icon: 'ri:heart-2-line'  },
    { value: 'bank', label: 'Chuyển khoản', icon: 'ri:bank-line'     },
];

export const hasWalletAccount = (wallet, method) => {
    if (method === 'cash') return true;
    const account = wallet?.[method] ?? {};
    return !!(account.accountNo ?? account.phone);
};

// Số tài khoản/số điện thoại nhận tiền theo method — momo dùng `phone`, bank dùng `accountNo`.
// Dùng chung bởi svc-pay-booking.js/svc-pay-valider.js (trước đây mỗi file tự viết 1 biểu thức
// hơi khác nhau, rủi ro lệch nếu shape wallet đổi).
export const resolveAccountNo = (method, account = {}) => method === 'momo' ? (account.phone ?? '') : (account.accountNo ?? '');

// ── Promo / notes (bản clone độc lập cho svc-cart/svc-promo) ───────────────────────────────────
export const PROMO_CODES = [
    { code: 'CAFE10',    type: 'percent', discount: 10,    label: 'Giảm 10%', minOrder: 100000, maxDiscount: 20000 },
    { code: 'CAFE20',    type: 'percent', discount: 20,    label: 'Giảm 20%', minOrder: 200000, maxDiscount: 40000 },
    { code: 'GIAM50K',   type: 'fixed',   discount: 50000, label: 'Giảm 50.000đ', minOrder: 300000 },
    { code: 'FLASHSALE', type: 'fixed',   discount: 30000, label: 'Giảm 30.000đ', minOrder: 300000 },
];

export const SPECIAL_PROMO_CODES = [
    { code: 'FREE100', type: 'percent', discount: 100, label: 'Miễn phí 100%' },
    { code: 'FREE50',  type: 'percent', discount: 50,  label: 'Miễn phí 50%' },
];

export const NOTES = {
    vi: ['Hỗ trợ tư vấn sau mua hàng', 'Gọi trước khi giao hàng'],
    en: ['Post-purchase support available', 'Call before delivery'],
};