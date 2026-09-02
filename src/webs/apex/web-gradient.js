import { LitElement, html, css } from 'lit'

export class WebGradient extends LitElement {
    static properties = {
        type: { type: String }, // gradient, rotate45, radial, radialDouble, aurora, mesh
        mainColors: { type: String }, // comma separated colors
        limit: { type: Number }, // limit number of items
    }

    static styles = css`
        :host {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            width: 100%;
            height: 100%;
            background-color: transparent;
        }

        .bg-container {
            position: absolute;
            inset: 0;
            height: 100%;
            width: 100%;
            overflow: hidden;
            background-color: transparent;
        }

        /* Noise Texture - Critical for Smoothing Banding */
        .noise-overlay {
            position: absolute;
            inset: -200%;
            width: 400%;
            height: 400%;
            background-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#noiseFilter)"/></svg>');
            opacity: 0.04;
            pointer-events: none;
            z-index: 5;
            mix-blend-mode: overlay;
        }

        /* Parallax Wrapper */
        .parallax-wrap {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            transition: transform 1.2s cubic-bezier(0.1, 0.5, 0.1, 1);
            will-change: transform;
        }

        /* Aurora Mode Styling */
        .aurora-wrap {
            position: absolute;
            inset: 0;
            filter: blur(120px);
            opacity: 0.7;
        }

        .aurora-shape {
            position: absolute;
            width: 140%;
            height: 140%;
            top: -20%;
            left: -20%;
            border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
            animation: aurora-drift 40s ease-in-out infinite alternate;
        }

        @keyframes aurora-drift {
            0% { transform: translate(0, 0) rotate(0deg); opacity: 0.5; }
            50% { transform: translate(8%, 10%) rotate(15deg); opacity: 0.8; }
            100% { transform: translate(-5%, 5%) rotate(-10deg); opacity: 0.4; }
        }

        /* Mesh Mode Styling */
        .mesh-wrap {
            position: absolute;
            inset: 0;
            filter: blur(140px);
        }

        .mesh-pin {
            position: absolute;
            width: 45rem;
            height: 45rem;
            border-radius: 50%;
            opacity: 0.6;
            transition: transform 2s cubic-bezier(0.2, 0.4, 0.2, 1);
        }

        /* Unified Pulsing for other types - Scale Free */
        .pulse-layer {
            position: absolute;
            inset: -10%;
            width: 120%;
            height: 120%;
            animation: drift-slow 20s ease-in-out infinite alternate;
        }

        @keyframes drift-slow {
            0% { transform: translate3d(0, 0, 0); opacity: 0.4; filter: blur(100px); }
            50% { transform: translate3d(4%, 5%, 0); opacity: 0.7; filter: blur(80px); }
            100% { transform: translate3d(-3%, -4%, 0); opacity: 0.3; filter: blur(120px); }
        }
    `;

    constructor() {
        super();
        this.type = 'aurora';
        this.mainColors = '#e1f163,#af3ed5,#e248ec,#3bc8f6,#14b8a6';
        this.limit = 5;
        this._handleMouseMove = this._handleMouseMove.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        window.addEventListener("mousemove", this._handleMouseMove);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener("mousemove", this._handleMouseMove);
    }

    _handleMouseMove(event) {
        if (this.type === 'mesh') {
            const pins = this.shadowRoot.querySelectorAll('.mesh-pin');
            const moves = [0.8, -0.6, 0.9, -0.4, 0.7, -0.8];
            pins.forEach((pin, i) => this._parallaxElement(event, pin, moves[i % moves.length], 180));
        } else {
            const wrap = this.shadowRoot.querySelector('.parallax-wrap');
            if (wrap) this._parallaxElement(event, wrap, 0.6, 120);
        }
    }

    _parallaxElement(e, element, move = 0.5, radius = 50) {
        if (!element) return;
        const { clientX, clientY } = e;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Offset from center (-1 to 1)
        const x = (clientX - centerX) / centerX;
        const y = (clientY - centerY) / centerY;
        
        const tx = x * move * radius;
        const ty = y * move * radius;
        element.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    }

    render() {
        const colors = (this.mainColors || '').split('|').map(c => c.trim()).slice(0, this.limit);
        
        const wrapWithNoise = (content) => html`
            <div class="bg-container">
                <div class="noise-overlay"></div>
                ${content}
            </div>
        `;

        switch (this.type) {
            case 'aurora':
            case 'mesh':
                const isMesh = this.type === 'mesh';
                const meshPositions = [
                    { top: '10%', left: '10%' }, { top: '15%', right: '15%' },
                    { bottom: '20%', left: '20%' }, { bottom: '10%', right: '10%' },
                    { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
                    { top: '40%', right: '40%' }
                ];
                return wrapWithNoise(html`
                    <div class="${isMesh ? 'mesh-wrap' : 'parallax-wrap'}">
                        ${isMesh ? colors.map((color, i) => html`
                            <div class="mesh-pin" style="background: ${color}bb; ${Object.entries(meshPositions[i] || {}).map(([k, v]) => `${k}:${v}`).join(';')}"></div>
                        `) : html`
                            <div class="aurora-wrap">
                                <div class="aurora-shape" style="background: 
                                    radial-gradient(circle at 20% 30%, ${colors[0]}cc, transparent), 
                                    radial-gradient(circle at 80% 70%, ${colors[1] || colors[0]}88, transparent), 
                                    radial-gradient(circle at 50% 50%, ${colors[2] || colors[0]}96, transparent)">
                                </div>
                            </div>
                        `}
                    </div>
                `);

            case 'gradient':
                return wrapWithNoise(html`
                    <div class="parallax-wrap">
                        <div class="pulse-layer" style="background: linear-gradient(135deg, ${colors[0]}dd, ${colors[1] || colors[0]}aa, ${colors[2] || colors[0]}dd)"></div>
                    </div>
                `);

            case 'radialDouble':
                return wrapWithNoise(html`
                    <div class="parallax-wrap">
                        <div class="pulse-layer" style="background: 
                            radial-gradient(circle at 20% 30%, ${colors[0]}44, transparent 60%), 
                            radial-gradient(circle at 80% 70%, ${colors[1] || colors[0]}55, transparent 60%)">
                        </div>
                    </div>
                `);

            case 'rotate45':
                return wrapWithNoise(html`
                    <div class="parallax-wrap">
                         <div class="pulse-layer" style="background: linear-gradient(143deg, ${colors[0]}00 40%, ${colors[1] || colors[0]}55 60%, ${colors[2] || colors[0]}00 90%)"></div>
                    </div>
                `);

            case 'radial':
            default:
                return wrapWithNoise(html`
                    <div class="parallax-wrap">
                        <div class="pulse-layer" style="background: radial-gradient(circle at center, ${colors[0]}44 0%, ${colors[1] || colors[0]}33 45%, transparent 100%)"></div>
                    </div>
                `);
        }
    }
}

if (!customElements.get('web-gradient')) {
    customElements.define('web-gradient', WebGradient)
}

export default WebGradient