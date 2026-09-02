// src/webs/bay/svc-bay-call.js
//
// Thuần presentational — không giữ state cuộc gọi (svc-bay.js orchestrator giữ hết), chỉ nhận
// props + bắn event lên. Cùng pattern với svc-chat.js (webs/chat/). Không có coupling domain nào
// nên viết lại y hệt svc-channel-call.js, không import.
import { LitElement, html, unsafeCSS } from 'lit'
import 'iconify-icon'
import styles from './styles/svc-bay-call.css?inline'
import { txtLingo, emit } from '@/services/helper.js'

const TXT_STD = {
    vi: {
        ringingIn: 'đang gọi cho bạn…', ringingOut: 'đang đổ chuông…', connecting: 'Đang kết nối video…',
        decline: 'Từ chối', accept: 'Nhận', hangup: 'Hủy gọi', toggleMic: 'Tắt/mở mic', toggleCam: 'Tắt/mở camera', end: 'Kết thúc',
    },
    en: {
        ringingIn: 'is calling you…', ringingOut: 'ringing…', connecting: 'Connecting video…',
        decline: 'Decline', accept: 'Accept', hangup: 'Cancel call', toggleMic: 'Toggle mic', toggleCam: 'Toggle camera', end: 'End',
    },
}

export class SvcBayCall extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        ui:    { type: String },
        theme: { type: String },
        lang:  { type: String },
        txt:   { type: Object }, // override i18n cho TXT_STD — xem txtLingo() trong helper.js
        callState:    { type: String }, // 'ringing-out' | 'ringing-in' | 'active'
        peerName:     { type: String },
        localStream:  { type: Object },
        remoteStream: { type: Object },
        _muted:  { state: true },
        _camOff: { state: true },
    }

    constructor() {
        super()
        this.ui = 'spatial'; this.theme = 'dark'; this.lang = 'vi'; this.txt = null
        this.callState = 'ringing-out'
        this.peerName = ''
        this.localStream = null
        this.remoteStream = null
        this._muted = false
        this._camOff = false
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang) }

    updated(changed) {
        const d = this.shadowRoot?.querySelector('dialog.byc-dialog')
        if (d && !d.open) d.showModal()

        if (changed.has('localStream')) {
            const el = this.shadowRoot?.querySelector('.byc-local')
            if (el) el.srcObject = this.localStream
        }
        if (changed.has('remoteStream')) {
            const el = this.shadowRoot?.querySelector('.byc-remote')
            if (el) el.srcObject = this.remoteStream
        }
    }

    _dhToggleMute() {
        this._muted = !this._muted
        this.localStream?.getAudioTracks().forEach(t => { t.enabled = !this._muted })
    }

    _dhToggleCamera() {
        this._camOff = !this._camOff
        this.localStream?.getVideoTracks().forEach(t => { t.enabled = !this._camOff })
    }

    _emit(name) { emit(this, name) }

    render() {
        return html`
            <dialog class="byc-dialog" @cancel=${e => e.preventDefault()}>
                ${this.callState === 'ringing-in' ? this._rbRingingIn()
                : this.callState === 'ringing-out' ? this._rbRingingOut()
                : this._rbActive()}
            </dialog>
        `
    }

    _rbRingingIn() {
        return html`
            <div class="byc-ringing">
                <div class="byc-ringing-name">${this.peerName}</div>
                <div class="byc-ringing-sub">${this._txt.ringingIn}</div>
                <div class="byc-ringing-actions">
                    <button class="byc-btn decline" @click=${() => this._emit('call-decline')} aria-label=${this._txt.decline}>
                        <iconify-icon icon="ri:phone-fill" width="24px" style="transform:rotate(135deg)"></iconify-icon>
                    </button>
                    <button class="byc-btn accept" @click=${() => this._emit('call-accept')} aria-label=${this._txt.accept}>
                        <iconify-icon icon="ri:phone-fill" width="24px"></iconify-icon>
                    </button>
                </div>
            </div>
        `
    }

    _rbRingingOut() {
        return html`
            <div class="byc-ringing">
                <div class="byc-ringing-name">${this.peerName}</div>
                <div class="byc-ringing-sub">${this._txt.ringingOut}</div>
                <div class="byc-ringing-actions">
                    <button class="byc-btn hangup" @click=${() => this._emit('call-hangup')} aria-label=${this._txt.hangup}>
                        <iconify-icon icon="ri:phone-fill" width="24px" style="transform:rotate(135deg)"></iconify-icon>
                    </button>
                </div>
            </div>
        `
    }

    _rbActive() {
        const waitingForRemote = !this.remoteStream
        return html`
            <div class="byc-stage">
                <video class="byc-remote" autoplay playsinline></video>
                ${waitingForRemote ? html`<div class="byc-waiting">${this._txt.connecting}</div>` : ''}
                <video class="byc-local" autoplay playsinline muted></video>
                <div class="byc-controls">
                    <button class="byc-btn mute ${this._muted ? 'active' : ''}" @click=${this._dhToggleMute} aria-label=${this._txt.toggleMic}>
                        <iconify-icon icon=${this._muted ? 'ri:mic-off-fill' : 'ri:mic-fill'} width="20px"></iconify-icon>
                    </button>
                    <button class="byc-btn camera ${this._camOff ? 'active' : ''}" @click=${this._dhToggleCamera} aria-label=${this._txt.toggleCam}>
                        <iconify-icon icon=${this._camOff ? 'ri:camera-off-fill' : 'ri:camera-fill'} width="20px"></iconify-icon>
                    </button>
                    <button class="byc-btn hangup" @click=${() => this._emit('call-hangup')} aria-label=${this._txt.end}>
                        <iconify-icon icon="ri:phone-fill" width="24px" style="transform:rotate(135deg)"></iconify-icon>
                    </button>
                </div>
            </div>
        `
    }
}

if (!customElements.get('svc-bay-call')) customElements.define('svc-bay-call', SvcBayCall)
