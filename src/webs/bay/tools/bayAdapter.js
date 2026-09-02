// src/webs/bay/tools/bayAdapter.js
// DbAdapter (docs/CRUD.rst) cho products — Firestore THẬT (collection `products`, project
// PUBLIC_DB, xem services/firestore.js), KHÔNG còn IndexedDB + P2P mesh (PRODUCT_EVENT/
// SYNC_RESPONSE.products) như trước: Firestore onSnapshot đã tự lo real-time cho mọi thiết bị/
// peer, khỏi cần tự dựng lại qua mesh. Field `bay_id` do adapter này tự thêm khi ghi + tự lọc khi
// đọc theo bay đang active (setActiveBay(), gọi từ svc-bay.js._dhOpenBay/_dhLeaveBay) — để
// svc-admin (domain-agnostic, xem webs/auth/svc-admin.js) không cần biết gì về "bay" cả.
// find()/listen() CHỈ gửi xuống Firestore đúng 1 equality-filter (bay_id, luôn tự có index sẵn),
// rồi filter/search/sort/limit (opts.filters/searchField/sortBy/maxCount) THỦ CÔNG ở client qua
// applyListOpts() (bayChannel.js) — cùng cách BayLocalAdapter cũ (IndexedDB) đã làm. Cố tình
// KHÔNG đẩy sortBy/searchField xuống Firestore: kết hợp equality-filter với orderBy/range trên
// field khác (vd svc-admin's `orderable` → sortBy:'index', xem _comQueryOpts() trong
// svc-admin.js) sẽ bắt buộc composite index tạo thủ công trên Firestore Console mới chạy được
// (xem docs/CRUD.rst § "Lưu ý Firestore index") — tránh hẳn phụ thuộc đó cho products.
import { registerAdapter } from '@/services/crud.js'
import { firestoreAdapter } from '@/services/firestore.js'
import { applyListOpts } from './bayChannel.js'

let _bayId = null
export function setActiveBay(bayId) { _bayId = bayId }

export class BayProductsAdapter {
    now() { return firestoreAdapter.now() }

    // Không có bay đang active (chưa mở bay nào, hoặc vừa rời) — trả rỗng thay vì lỡ query
    // xuyên mọi bay (thiếu filter bay_id).
    async find(table, opts = {}) {
        if (!_bayId) return []
        const rows = await firestoreAdapter.find(table, { filters: { bay_id: _bayId } })
        return applyListOpts(rows, opts)
    }

    findById(table, id) { return firestoreAdapter.findById(table, id) }

    add(table, data) { return firestoreAdapter.add(table, { ...data, bay_id: _bayId }) }

    set(table, id, data) { return firestoreAdapter.set(table, id, { ...data, bay_id: _bayId }) }

    // Partial update — bay_id đã đúng sẵn trên doc (id do add()/set() cấp), khỏi ghi đè lại.
    put(table, id, data) { return firestoreAdapter.put(table, id, data) }

    batch(table, items) { return firestoreAdapter.batch(table, items) }

    listen(table, opts, onNext, onError) {
        if (!_bayId) { onNext([]); return Promise.resolve(() => {}) }
        return firestoreAdapter.listen(table, { filters: { bay_id: _bayId } },
            rows => onNext(applyListOpts(rows, opts)), onError)
    }
}

registerAdapter('bayProducts', new BayProductsAdapter())
