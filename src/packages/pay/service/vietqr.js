// src/packages/pay/service/vietqr.js
//
// Gọi VietQR tạo mã chuyển khoản động — trả nguyên JSON (`code === '00'` là thành công, `data.qrDataURL`).
const VIETQR_API = 'https://api.vietqr.io/v2/generate';

export async function generateVietQr({ clientId, apiKey, accountNo, accountName, acqId, amount, addInfo }) {
    const res = await fetch(VIETQR_API, {
        method: 'POST',
        headers: { 'x-client-id': clientId ?? '', 'x-api-key': apiKey ?? '', 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNo, accountName: accountName ?? '', acqId, amount, addInfo, format: 'text', template: 'compact2' }),
    });
    return res.json();
}
