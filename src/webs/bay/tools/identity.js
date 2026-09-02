// src/webs/bay/tools/identity.js
// device_id = ULID sinh 1 lần/thiết bị, độc lập với tài khoản đăng nhập (users.id).
// Dùng làm peer id trong mesh. Domain riêng của bay — không liên quan channel_device.

import Storager from '@/services/storager.js'
import { ulid } from '@/services/helper.js'

const DEVICE_KEY = 'bay_device'

export async function deviceId() {
    let d = await Storager.get(DEVICE_KEY)
    if (!d) {
        d = { id: ulid() }
        await Storager.set(DEVICE_KEY, d, 0) // ttl=0 — không hết hạn
    }
    return d.id
}
