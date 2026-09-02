// src/webs/media/svc-audio.js
//
// Standalone voice-message playback: play/pause button + a waveform (real decoded
// amplitude peaks, not decorative bars) + duration. Used both as the in-popover preview
// in svc-voice.js (before sending) and as the rendered attachment for a sent voice
// message in svc-chat.js (_rfAttachment, mime.startsWith('audio')). Not an extension of
// svc-media.js — that component only understands image/video (see design doc).
import { LitElement, html, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/webs/apex/web-button.js'
import { txtLingo, toastEmit } from '@/services/helper.js'
import styles from './styles/svc-audio.css?inline'

const TXT_STD = {
    vi: { playError: 'Không phát được đoạn ghi âm này' },
    en: { playError: "Couldn't play this recording" },
}

const PEAK_COUNT = 48

// Decode an audio URL into ~PEAK_COUNT amplitude peaks (0..1 each), one full decode per
// `src` (see _dcDecode) — acceptable cost for short voice clips, not run per frame.
//
// Uses OfflineAudioContext (never attached to a real audio-output device) instead of
// AudioContext purely as a decodeAudioData() host — a busy chat log can mount many
// <svc-audio> at once, and browsers (notably Safari) cap the number of LIVE
// AudioContext instances that can exist concurrently; OfflineAudioContext isn't subject
// to that ceiling. The (1, 1, 44100) args are throwaway placeholders — decodeAudioData()
// returns a fresh AudioBuffer at the source's own native format/rate regardless of the
// context's configured channels/length/sampleRate, and startRendering() is never called.
async function decodePeaks(src) {
    const res = await fetch(src)
    const buf = await res.arrayBuffer()
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext
    const ctx = new Ctx(1, 1, 44100)
    const audioBuffer = await ctx.decodeAudioData(buf)
    const channel = audioBuffer.getChannelData(0)
    const bucketSize = Math.max(1, Math.floor(channel.length / PEAK_COUNT))
    const peaks = []
    for (let i = 0; i < PEAK_COUNT; i++) {
        const start = i * bucketSize
        let max = 0
        for (let j = start; j < start + bucketSize && j < channel.length; j++) {
            max = Math.max(max, Math.abs(channel[j]))
        }
        peaks.push(max)
    }
    return peaks
}

const fmtTime = (s) => {
    const total = Math.max(0, Math.floor(s || 0))
    const m = Math.floor(total / 60)
    const sec = total % 60
    return `${m}:${String(sec).padStart(2, '0')}`
}

export class SvcAudio extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        src:      { type: String },
        // Thời lượng THẬT (giây) do nơi gọi tự đo lúc ghi âm (xem svc-voice.js's _elapsedMs) —
        // 0 (mặc định) = không biết trước, tự dò từ file như cũ (audio thường/không phải voice
        // message tự ghi). Cần prop này vì blob MediaRecorder (WebM/Opus) không đáng tin cho
        // CẢ HAI cách tự dò hiện có: audio.duration (container thường thiếu field duration thật
        // tới khi phát/seek hết) VÀ decodeAudioData (peaks rỗng — xem decodePeaks/_dcDecode —
        // cũng từng thất bại với đúng loại blob này trên thực tế, không chỉ lý thuyết).
        duration: { type: Number },
        width: { type: String },
        ui:    { type: String },
        theme: { type: String },
        lang:  { type: String },
        txt:   { type: Object }, // override i18n cho TXT_STD — xem txtLingo() trong helper.js
        _playing:  { state: true },
        _progress: { state: true }, // 0..1
        _duration: { state: true }, // seconds
        _peaks:    { state: true }, // number[0..1], ~PEAK_COUNT long, [] until decoded
    }

    constructor() {
        super()
        this.src = ''
        this.duration = 0
        this.width = '240px'
        this.ui = 'modern'
        this.theme = ''
        this.lang = 'vi'
        this.txt = null
        this._playing = false
        this._progress = 0
        this._duration = 0
        this._peaks = []
    }

    updated(changed) {
        if (changed.has('theme') && this.theme) this.setAttribute('data-theme', this.theme)
        else if (changed.has('theme') && !this.theme) this.removeAttribute('data-theme')
        if (changed.has('src')) this._dcDecode()
        if (changed.has('duration') && this.duration > 0) this._duration = this.duration
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

    // Native <audio> không phát được (định dạng lạ, blob hỏng...) — báo rõ cho người dùng thay
    // vì im lặng không làm gì (trước đây chỉ .catch(()=>{}) nuốt lỗi, tra không ra được vì sao).
    _dhPlayError() {
        toastEmit(this._txt.playError, 'error')
    }

    // Lifecycle reaction to `src` changing (not a DOM/user event) — _dc* per this codebase's
    // method-prefix convention (see svc-chat.js:_dcSyncIncomingDMs for the same precedent).
    async _dcDecode() {
        const forSrc = this.src
        this._playing = false
        this._progress = 0
        this._peaks = []
        if (!this.duration) this._duration = 0 // không có duration biết trước — chờ dò lại
        if (!forSrc) return
        try {
            const peaks = await decodePeaks(forSrc)
            if (this.src !== forSrc) return // src đổi trong lúc decode (vd preview → recording lại) — bỏ kết quả cũ
            this._peaks = peaks
        } catch {
            // Decode lỗi (định dạng lạ/CORS, hoặc chính blob MediaRecorder — xem comment prop
            // `duration`) — vẫn phát được qua thẻ <audio> gốc bên dưới, chỉ mất waveform
            // (renders .audio-wave-empty), không throw/crash cả component.
        }
    }

    _dhToggle() {
        const audio = this.shadowRoot.querySelector('audio')
        // !this.src: blob chưa sẵn sàng (vd tin nhắn thoại nhận qua P2P đang chờ blob tải về) —
        // audio.play() sẽ throw NotSupportedError ("no supported sources"). .catch() phòng thêm
        // trường hợp trình duyệt vẫn từ chối phát vì lý do khác (play() trả Promise, không bắt
        // sẽ thành unhandled rejection ồn ào ngoài console).
        if (!audio || !this.src) return
        if (this._playing) audio.pause()
        else audio.play().catch(() => this._dhPlayError())
    }

    // Chỉ tin audio.duration khi KHÔNG có prop `duration` biết trước — nếu nơi gọi đã tự đo
    // đúng lúc ghi âm (svc-voice.js), audio.duration không đáng tin cho blob MediaRecorder
    // (xem comment prop `duration` ở static properties) nên bỏ qua hẳn, không ghi đè giá trị đã
    // biết đúng.
    _dhLoadedMetadata(e) {
        if (this.duration) return
        this._duration = Number.isFinite(e.target.duration) ? e.target.duration : 0
    }

    _dhTimeUpdate(e) {
        this._progress = this._duration ? e.target.currentTime / this._duration : 0
    }

    _dhSeek(e) {
        const audio = this.shadowRoot.querySelector('audio')
        if (!audio || !this._duration) return
        const rect = e.currentTarget.getBoundingClientRect()
        const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
        audio.currentTime = frac * this._duration
    }

    _rbWaveform() {
        if (!this._peaks.length) return html`<div class="audio-wave-empty"></div>`
        return html`
            <div class="audio-wave" @click=${this._dhSeek}>
                ${this._peaks.map((p, i) => html`
                    <span class="audio-bar ${i / this._peaks.length <= this._progress ? 'played' : ''}"
                        style="height: ${Math.max(15, p * 100)}%"></span>
                `)}
            </div>
        `
    }

    render() {
        const elapsed = this._playing ? this._progress * this._duration : this._duration
        return html`
            <div class="audio-wrap" style="width: ${this.width}">
                <audio preload="metadata" src=${this.src}
                    @play=${() => { this._playing = true }}
                    @pause=${() => { this._playing = false }}
                    @ended=${() => { this._playing = false; this._progress = 0 }}
                    @loadedmetadata=${this._dhLoadedMetadata}
                    @timeupdate=${this._dhTimeUpdate}
                    @error=${() => { if (this.src) this._dhPlayError() }}
                ></audio>
                <web-button class="audio-play" type="soft" color="primary" rounded="50%" height="32px" square
                    ?disabled=${!this.src}
                    ui=${this.ui} theme=${this.theme} @clicked=${this._dhToggle}>
                    <iconify-icon icon=${this._playing ? 'ri:pause-fill' : 'ri:play-fill'} width="16px"></iconify-icon>
                </web-button>
                ${this._rbWaveform()}
                <span class="audio-duration">${fmtTime(elapsed)}</span>
            </div>
        `
    }
}

if (!customElements.get('svc-audio')) customElements.define('svc-audio', SvcAudio)

export default SvcAudio
