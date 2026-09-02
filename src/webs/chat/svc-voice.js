// src/webs/chat/svc-voice.js
//
// Voice-message recorder. Same pattern as svc-emoji.js: self-contained Lit component
// wrapping its own <web-popover>, emits one semantic event up (`voice-send`) instead of
// exposing recording internals to the caller. See docs/superpowers/specs/2026-07-30-
// voice-message-design.md for the full state-machine rationale.
//
// IMPORTANT — the trigger button doubles as the record/stop toggle (per the product
// spec: ONE button that says "Ghi âm" → becomes "Đang ghi âm" on click → stop on a
// second click). Because that button lives in <web-popover>'s `slot="trigger"`, a raw
// click on it bubbles (composed) through web-popover's own `.web-popover-trigger`
// wrapper in ITS shadow root, which has its own unconditional `@click=${this._toggle}`
// flipping `open`. Left alone, every click on our button would ALSO flip the popover's
// open state — fine on the very first click (idle → recording, popover should open
// anyway), wrong on the second click (recording → stopped should NOT close the
// popover). Fix: stopPropagation() on our own trigger wrapper div (stops the native
// click before it reaches web-popover's ancestor listener — this does NOT prevent our
// own <web-button>'s "clicked" custom event, which is a separate dispatched event), and
// manage `popover.open` ourselves explicitly everywhere (see _dfStartRecording/_dhReset).
import { LitElement, html, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/webs/apex/web-popover.js'
import '@/webs/apex/web-button.js'
import '@/webs/media/svc-audio.js'
import { txtLingo, emit, toastEmit } from '@/services/helper.js'
import styles from './styles/svc-voice.css?inline'

const MAX_RECORD_MS = 5 * 60 * 1000
const RECORD_MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
// Blob rỗng/gần rỗng (chỉ có header container, không có frame âm thanh thật) vẫn có thể vài
// trăm byte — 500 bytes an toàn dưới cả 1 giây audio thật (thoại ~16-32kbps ≈ vài KB/giây) nhưng
// đủ cao để chặn blob hỏng dù _elapsedMs > 0 (đồng hồ đếm độc lập với việc mic có thực sự thu
// được gì hay không).
const MIN_BLOB_BYTES = 500

const TXT_STD = {
    vi: {
        recording: mmss => `Đang ghi âm ${mmss}`,
        edit: 'Chỉnh sửa', send: 'Gửi', cancel: 'Hủy',
        micError: 'Không thể truy cập micro',
    },
    en: {
        recording: mmss => `Recording ${mmss}`,
        edit: 'Edit', send: 'Send', cancel: 'Cancel',
        micError: "Couldn't access the microphone",
    },
}

const fmtMmss = (ms) => {
    const total = Math.floor((ms || 0) / 1000)
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${m}:${String(s).padStart(2, '0')}`
}

function pickMimeType() {
    for (const type of RECORD_MIME_CANDIDATES) {
        if (window.MediaRecorder?.isTypeSupported?.(type)) return type
    }
    return ''
}

export class SvcVoice extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        ui:        { type: String },
        theme:     { type: String },
        lang:      { type: String },
        txt:       { type: Object },
        height:    { type: String }, // trigger button size, default '45px' (matches attach/call buttons)
        placement: { type: String }, // passed through to web-popover, default 'top-start'
        _state:     { state: true }, // 'idle' | 'recording' | 'stopped'
        _elapsedMs: { state: true }, // live recording timer, +1000 every interval tick
    }

    constructor() {
        super()
        this.ui = 'modern'
        this.theme = ''
        this.lang = 'vi'
        this.txt = null
        this.height = '45px'
        this.placement = 'top-start'
        this._state = 'idle'
        this._elapsedMs = 0
        // Plain instance fields, NOT reactive — MediaRecorder plumbing + the recorded
        // blob/its object URL don't need to trigger re-renders on their own; only
        // `_state`/`_elapsedMs` do (blobUrl is read directly in render() off `this._blobUrl`
        // is intentionally NOT reactive either — see Step 3 note on why re-render is driven
        // by `_state` alone, not by the blob arriving).
        this._stream = null
        this._recorder = null
        this._chunks = []
        this._blob = null
        this._blobUrl = ''
        this._timer = null
    }

    // `chc-action-row` (nơi gọi component này) có thể tự ẩn (nút "Thêm" bấm lại, hoặc bắt
    // đầu cuộc gọi qua _dhCallPeer()) — nếu ẩn trong lúc _state !== 'idle', Lit unmount
    // hẳn component này, disconnectedCallback() dọn sạch NHƯNG bản ghi/đoạn đang ghi bị
    // mất trắng không cảnh báo, vô hiệu hoá mục đích của `persistent` (chặn đóng do click
    // ngoài nhưng không chặn được việc unmount do ancestor ẩn action row). Báo lên nơi gọi
    // qua event để nơi gọi tự quyết định giữ action row mở trong lúc đang bận.
    updated(changed) {
        if (changed.has('_state')) emit(this, 'voice-busy-change', { busy: this._state !== 'idle' })
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        clearInterval(this._timer)
        // Nếu đang ghi âm dở khi component unmount, MediaRecorder.stop() (bên trong
        // _dfStopTracks() không gọi stop — chỉ tắt track — nhưng tắt track cũng khiến
        // recorder tự bắn onstop bất đồng bộ) vẫn sẽ fire onstop sau khi hàm này đã
        // return, gọi _dfFinalizeRecording() tạo blobUrl KHÔNG BAO GIỜ được revoke (component
        // đã chết, disconnectedCallback không chạy lại lần 2). Null hoá handler trước,
        // giống hệt _dhCancel(), để chặn đứng việc đó.
        if (this._recorder && this._recorder.state !== 'inactive') {
            this._recorder.ondataavailable = null
            this._recorder.onstop = null
        }
        this._dfStopTracks()
        if (this._blobUrl) URL.revokeObjectURL(this._blobUrl)
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

    _dfStopTracks() {
        this._stream?.getTracks().forEach(t => t.stop())
        this._stream = null
    }

    _dhToggleRecord() {
        if (this._state === 'idle') this._dfStartRecording()
        else if (this._state === 'recording') this._dfStopRecording()
    }

    // Returns true if recording actually started (mic permission granted), false otherwise —
    // callers (including _dhEdit) use this to decide whether it's safe to discard the
    // previous recording.
    async _dfStartRecording() {
        let stream
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch {
            toastEmit(this._txt.micError, 'error')
            return false
        }
        this._stream = stream
        this._chunks = []
        const mimeType = pickMimeType()
        this._recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        this._recorder.ondataavailable = e => { if (e.data.size) this._chunks.push(e.data) }
        this._recorder.onstop = () => this._dfFinalizeRecording()
        // timeslice 250ms — flush ondataavailable đều đặn trong lúc ghi, không dồn hết vào 1
        // chunk cuối lúc .stop() (cách gọn hơn nhưng rủi ro hơn ở vài trình duyệt — chunk cuối
        // có thể rỗng/thiếu nếu có gì bất thường ngay lúc dừng).
        this._recorder.start(250)
        this._elapsedMs = 0
        this._state = 'recording'
        // Explicitly open the popover ourselves — see the file-header comment on why we
        // can't rely on web-popover's own trigger-click toggle for this.
        const popover = this.shadowRoot.querySelector('web-popover')
        if (popover) popover.open = true
        this._timer = setInterval(() => {
            this._elapsedMs += 1000
            if (this._elapsedMs >= MAX_RECORD_MS) this._dfStopRecording()
        }, 1000)
        return true
    }

    _dfStopRecording() {
        clearInterval(this._timer)
        this._recorder?.stop() // → fires the recorder's onstop → _dfFinalizeRecording()
    }

    _dfFinalizeRecording() {
        this._dfStopTracks()
        const mimeType = this._recorder?.mimeType || 'audio/webm'
        this._blob = new Blob(this._chunks, { type: mimeType })
        this._chunks = []
        if (this._blobUrl) URL.revokeObjectURL(this._blobUrl)
        this._blobUrl = URL.createObjectURL(this._blob)
        this._state = 'stopped' // triggers re-render — _blobUrl itself isn't reactive, _state's change is what matters
    }

    // "Chỉnh sửa": discard the current recording and start a new one immediately — but
    // only discard the OLD blob/URL once the NEW recording actually starts (mic
    // permission could fail on retry), so a permission failure here doesn't leave the
    // user stuck with a blank, unplayable preview and a `stopped` state that no longer
    // has a real recording behind it.
    async _dhEdit() {
        const oldUrl = this._blobUrl
        const started = await this._dfStartRecording()
        if (started) {
            if (oldUrl) URL.revokeObjectURL(oldUrl)
            this._blobUrl = ''
            this._blob = null
        }
    }

    _dhSend() {
        // _elapsedMs === 0: bấm dừng ngay khi vừa bấm ghi (chưa qua nổi 1 giây). _blob.size quá
        // nhỏ: đồng hồ đếm vẫn chạy (_elapsedMs > 0) nhưng mic/recorder không thực sự thu được
        // gì (blob gần rỗng, chỉ có header) — cả 2 trường hợp đều chặn, không cho gửi bản ghi
        // không nghe được gì.
        if (!this._blob || this._elapsedMs === 0 || this._blob.size < MIN_BLOB_BYTES) return
        const file = new File([this._blob], 'voice-message.webm', { type: this._blob.type })
        // duration (giây) — tự đo bằng _elapsedMs (setInterval), gửi kèm để nơi nhận hiển thị
        // đúng ngay, không cần tự dò lại từ file (audio.duration/decodeAudioData không đáng tin
        // cho blob MediaRecorder — xem comment prop `duration` trong svc-audio.js).
        emit(this, 'voice-send', { file, duration: this._elapsedMs / 1000 })
        this._dhReset()
    }

    // Cancel — discards whatever's in progress and closes. If a MediaRecorder is still
    // active (mid-recording), its `onstop`/`ondataavailable` handlers are cleared BEFORE
    // calling stop() — otherwise the recorder's own async onstop would still fire
    // _dfFinalizeRecording() afterward, silently re-creating a 'stopped' state with a
    // blob the user just explicitly discarded.
    _dhCancel() {
        clearInterval(this._timer)
        if (this._recorder && this._recorder.state !== 'inactive') {
            this._recorder.ondataavailable = null
            this._recorder.onstop = null
            this._recorder.stop()
        }
        this._dfStopTracks()
        this._chunks = []
        this._dhReset()
    }

    _dhReset() {
        if (this._blobUrl) URL.revokeObjectURL(this._blobUrl)
        this._blobUrl = ''
        this._blob = null
        this._chunks = []
        this._elapsedMs = 0
        this._state = 'idle'
        const popover = this.shadowRoot.querySelector('web-popover')
        if (popover) popover.open = false
    }

    _rbTrigger() {
        const recording = this._state === 'recording'
        return html`
            <web-button class="voice-trigger-btn" type="soft" color=${recording ? 'error' : 'secondary'}
                rounded="50%" height=${this.height} square ui=${this.ui} theme=${this.theme}
                ?disabled=${this._state === 'stopped'}
                @clicked=${this._dhToggleRecord}>
                <iconify-icon icon=${recording ? 'ri:stop-circle-fill' : 'ri:mic-line'} width="20px"></iconify-icon>
            </web-button>
        `
    }

    _rbPanel() {
        if (this._state === 'idle') return ''
        return html`
            <div class="voice-panel">
                ${this._state === 'recording' ? html`
                    <span class="voice-label">${this._txt.recording(fmtMmss(this._elapsedMs))}</span>
                ` : html`
                    <div class="voice-stopped">
                        <web-button type="soft" color="secondary" rounded="50%" height="36px" square
                            ui=${this.ui} theme=${this.theme} title=${this._txt.edit} @clicked=${this._dhEdit}>
                            <iconify-icon icon="ri:refresh-line" width="18"></iconify-icon>
                        </web-button>
                        <svc-audio src=${this._blobUrl} duration=${this._elapsedMs / 1000} width="180px" ui=${this.ui} theme=${this.theme} lang=${this.lang}></svc-audio>
                        <web-button type="fill" color="primary" rounded="50%" height="36px" square
                            ?disabled=${this._elapsedMs === 0 || (this._blob?.size ?? 0) < MIN_BLOB_BYTES}
                            ui=${this.ui} theme=${this.theme} title=${this._txt.send} @clicked=${this._dhSend}>
                            <iconify-icon icon="ri:send-plane-2-fill" width="18px"></iconify-icon>
                        </web-button>
                    </div>
                `}
                <web-button type="soft" color="base-content" rounded="50%" height="36px" square
                    ui=${this.ui} theme=${this.theme} title=${this._txt.cancel} @clicked=${this._dhCancel}>
                    <iconify-icon icon="ri:close-line" width="20"></iconify-icon>
                </web-button>
            </div>
        `
    }

    render() {
        return html`
            <web-popover ui=${this.ui} theme=${this.theme} placement=${this.placement} ?persistent=${this._state !== 'idle'}>
                <div slot="trigger" @click=${e => e.stopPropagation()}>
                    ${this._rbTrigger()}
                </div>
                ${this._rbPanel()}
            </web-popover>
        `
    }
}

if (!customElements.get('svc-voice')) customElements.define('svc-voice', SvcVoice)

export default SvcVoice
