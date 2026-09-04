// src/services/photor.js
//
// Shared imgbb.com upload helpers. imgbb's `image` form field accepts EITHER base64 image data
// OR a URL (imgbb's own server fetches it) — uploadImageFromUrl uses the URL form specifically
// so callers passing an already-hosted-elsewhere image (eg an AI image-gen provider) never need
// to fetch the bytes into the browser first, sidestepping any cross-origin fetch/CORS concern.
const [IMGBB_KEY, IMGBB_URL] = (import.meta.env.PUBLIC_PHOTOR ?? '~').split('~')

async function _postImgbb(imageField) {
    const form = new FormData()
    form.append('key', IMGBB_KEY)
    form.append('image', imageField)

    const res = await fetch(IMGBB_URL, { method: 'POST', body: form })
    if (!res.ok) throw new Error(`imgbb ${res.status}`)
    const json = await res.json().catch(() => ({}))

    if (!json.success) throw new Error(json.error?.message ?? 'Upload thất bại')
    return json.data.url
}

/** Upload a Blob (eg a cropped canvas export) — converts to base64 then POSTs to imgbb. */
export async function uploadImageBlob(blob) {
    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
    return _postImgbb(dataUrl.split(',')[1])
}

/** Upload an image that's already hosted at some URL — imgbb fetches it server-side. */
export async function uploadImageFromUrl(url) {
    return _postImgbb(url)
}
