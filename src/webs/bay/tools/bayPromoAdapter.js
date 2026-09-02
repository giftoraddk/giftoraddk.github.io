// src/webs/bay/tools/bayPromoAdapter.js
//
// Lưu trữ promo theo bay — dùng bởi 2 phía, mỗi phía 1 kiểu hàm khác nhau (mirror
// webs/channel/tools/channelPromoAdapter.js):
//
//   1. svc-bay.js (P2P broadcast/relay) — gọi hàm nhận bayId TRỰC TIẾP làm tham số, cùng quy
//      ước loadSections(bayId) trong tools/service.js.
//   2. svc-cart.js (webs/pay, qua prop `promosStore`) — component độc lập, KHÔNG biết gì về
//      "bay". Nó chỉ thấy interface generic { load, add, remove, use, subscribe }, nên store
//      trả về từ createPromosStore() phải tự đóng theo bay đang active — set qua setActiveBay()
//      (bayChannel.js), cùng kỹ thuật _bayId singleton mà tools/bayAdapter.js dùng cho products
//      (khác chỗ: products giờ scope theo Firestore filter, không qua bayChannel.js).
//
// addPromo/removePromo cục bộ (owner tạo/xoá từ svc-promo) và applyIncomingPromo/
// applyIncomingPromoRemove (nhận qua P2P) đều là CÙNG 1 hàm — mọi thay đổi đi qua putPromo()/
// deletePromo() rồi channel.notify() như nhau, nên mọi subscriber (svc-cart) luôn thấy đúng
// state mới nhất.
import { promosByBay, putPromo, deletePromo, bumpPromoUsage } from './baydb.js'
import { createBayChannel } from './bayChannel.js'

const channel = createBayChannel()

export const setActiveBay = channel.setActiveBay

export function loadPromos(bayId) { return promosByBay(bayId) }

export async function applyIncomingPromo(bayId, promo) {
    await putPromo({ ...promo, bay_id: bayId })
    await channel.notify(bayId, promosByBay)
}

export async function applyIncomingPromoRemove(bayId, code) {
    await deletePromo(bayId, code)
    await channel.notify(bayId, promosByBay)
}

export async function applyIncomingPromoUse(bayId, code) {
    await bumpPromoUsage(bayId, code)
    await channel.notify(bayId, promosByBay)
}

/** Store truyền vào <svc-cart> (webs/pay) qua prop `promosStore` — đóng theo bay đang active qua
 *  setActiveBay(), vì svc-cart không biết "bay" là gì. */
export function createPromosStore() {
    return {
        load: () => promosByBay(channel.getBayId()),
        add:  promo => applyIncomingPromo(channel.getBayId(), promo),
        remove: code => applyIncomingPromoRemove(channel.getBayId(), code),
        use:  code => applyIncomingPromoUse(channel.getBayId(), code),
        subscribe(listener) {
            const unsub = channel.addListener(listener)
            promosByBay(channel.getBayId()).then(listener)
            return unsub
        },
    }
}
