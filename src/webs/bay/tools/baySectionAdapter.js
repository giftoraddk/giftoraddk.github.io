// src/webs/bay/tools/baySectionAdapter.js
// DbAdapter (hook/CRUD.rst) backed bởi IndexedDB `sectionItems` — dùng cho svc-admin của các
// section KHÔNG phải products (hero/contact/...). Products giờ lưu Firestore thật, xem
// tools/bayAdapter.js (không còn dùng bayChannel.js — Firestore onSnapshot tự lo real-time).
// Scaffolding _bayId/_listeners/notify dùng chung qua bayChannel.js — _sectionId là state RIÊNG
// của module này.
import { registerAdapter } from '@/services/crud.js'
import { ulid } from '@/services/helper.js'
import { sectionItemsBySection, putSectionItem, putSectionItems } from './baydb.js'
import { createBayChannel, applyListOpts } from './bayChannel.js'

const channel = createBayChannel()
let _sectionId = null
let _onBroadcast = null

export const setActiveBay = channel.setActiveBay
export function setActiveSection(sectionId) { _sectionId = sectionId }
export function setSectionBroadcastHandler(fn) { _onBroadcast = fn }

const _itemsByBay = bayId => sectionItemsBySection(bayId, _sectionId)

/** Gọi khi nhận SECTION_ITEM_EVENT / SYNC_RESPONSE.sectionItems từ mesh — ghi thẳng, không
 *  broadcast lại (tránh vòng lặp phát lại chính message vừa nhận). */
export async function applyIncomingSectionItems(rows) {
    await putSectionItems(rows)
    await channel.notify(channel.getBayId(), _itemsByBay)
}

export class BaySectionAdapter {
    async now() { return Date.now() }

    async find(_table, opts = {}) {
        return applyListOpts(await sectionItemsBySection(channel.getBayId(), _sectionId), opts)
    }

    async findById(_table, id) {
        return (await sectionItemsBySection(channel.getBayId(), _sectionId)).find(r => r.id === id) ?? null
    }

    async add(_table, data) {
        const bayId = channel.getBayId()
        const row = { id: ulid(), ...data, bay_id: bayId, section_id: _sectionId, updated_at: Date.now() }
        await putSectionItem(row)
        this._broadcast(row)
        await channel.notify(bayId, _itemsByBay)
        return row
    }

    async set(_table, id, data) {
        const bayId = channel.getBayId()
        const row = { ...data, id, bay_id: bayId, section_id: _sectionId, updated_at: Date.now() }
        await putSectionItem(row)
        this._broadcast(row)
        await channel.notify(bayId, _itemsByBay)
    }

    async put(table, id, data) {
        const bayId = channel.getBayId()
        const existing = await this.findById(table, id)
        const row = { ...existing, ...data, id, bay_id: bayId, section_id: _sectionId, updated_at: Date.now() }
        await putSectionItem(row)
        this._broadcast(row)
        await channel.notify(bayId, _itemsByBay)
    }

    async batch(table, items) {
        for (const { id, data } of items) await this.put(table, id, data)
    }

    async listen(table, opts, onNext) {
        const push = async () => onNext(await this.find(table, opts))
        const unsub = channel.addListener(push)
        push()
        return unsub
    }

    _broadcast(row) { _onBroadcast?.(row) }
}

registerAdapter('baySection', new BaySectionAdapter())
