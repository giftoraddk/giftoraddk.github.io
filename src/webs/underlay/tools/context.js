// src/webs/underlay/gl/context.js

export const QUALITY_TIERS = {
    low: { particleBase: 50, dprCap: 1, glow: false },
    medium: { particleBase: 130, dprCap: 1.5, glow: true },
    high: { particleBase: 260, dprCap: 2, glow: true },
};

// Default `density` multiplier per concept, used whenever the `density` prop is left unset —
// tuned from how every existing preset actually used it (see tools/constant.js before this table
// existed): dots render as tiny 1-6px points and read as sparse/empty at the same particleBase
// used for other concepts, so they need roughly double the count by default; bubbles/stars/leaf/
// snowflake were already effectively defaulting to 1 (nearly every preset passed `density: 1`
// explicitly for no reason). Callers that want something denser/sparser than this still pass
// `density` explicitly — this only removes the need to restate the common case.
export const AUTO_DENSITY = { dots: 2, bubbles: 1, stars: 1, leaf: 1, snowflake: 1 };

// 7 floats per particle: seedX, seedY, phase, sizeSeed, r, g, b
export const STRIDE = 7;

let _supported = null;
export function supportsWebGL() {
    if (_supported !== null) return _supported;
    try {
        const c = document.createElement('canvas');
        _supported = !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
        _supported = false;
    }
    return _supported;
}

export function createGL(canvas) {
    const opts = {
        alpha: true,
        antialias: false,
        // Our blend setup (clearing to transparent black, then blending with
        // straight-alpha-weighted factors) naturally produces a premultiplied
        // framebuffer. Declaring premultipliedAlpha:false here was a lie the
        // browser took literally — it re-multiplied by alpha a second time
        // when compositing the canvas onto the page, darkening every partial-
        // alpha edge pixel toward gray/black instead of fading to the actual
        // page background. true tells it the buffer is already premultiplied,
        // so it composites with a single, correct multiply.
        premultipliedAlpha: true,
        powerPreference: 'low-power',
        // Required for the trail effect (see _tick's fade pass in
        // svc-underlay.js): with this false, the browser is free to discard
        // the canvas's contents between animation frames (a normal
        // optimization) — so there'd be nothing left for the next frame's
        // fade pass to fade, and no trail would ever appear. true forces the
        // browser to actually preserve the buffer, at a small compositing
        // cost paid on every instance regardless of whether trail is used.
        preserveDrawingBuffer: true,
    };
    let gl = canvas.getContext('webgl2', opts);
    let isWebGL2 = true;
    if (!gl) {
        gl = canvas.getContext('webgl', opts);
        isWebGL2 = false;
    }
    if (!gl) return null;
    return { gl, isWebGL2 };
}

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
}

export function createProgram(gl, vertSrc, fragSrc) {
    const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    let frag;
    try {
        frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    } catch (err) {
        gl.deleteShader(vert);
        throw err;
    }
    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        gl.deleteShader(vert);
        gl.deleteShader(frag);
        throw new Error(`Program link error: ${info}`);
    }
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    return program;
}

// Interleaves per-particle seed/phase/size/color into one Float32Array
// matching STRIDE, ready for a single gl.bufferData call.
export function buildParticleData(count, palette) {
    const data = new Float32Array(count * STRIDE);
    for (let i = 0; i < count; i++) {
        const o = i * STRIDE;
        data[o] = Math.random();
        data[o + 1] = Math.random();
        data[o + 2] = Math.random() * Math.PI * 2;
        data[o + 3] = Math.random();
        data[o + 4] = palette[i * 3];
        data[o + 5] = palette[i * 3 + 1];
        data[o + 6] = palette[i * 3 + 2];
    }
    return data;
}

// RGB uses a "screen" blend (ONE_MINUS_DST_COLOR, ONE — i.e.
// result = src + dst - src*dst) so overlapping particles lighten/brighten
// each other where they intersect instead of one just occluding the other;
// screening against the transparent-black clear color is a no-op, so a lone
// particle still renders at its own true color. Requires the fragment
// shader to premultiply its output (rgb already scaled by alpha) — otherwise
// low-alpha edges would screen-blend at full color and look wrong. The alpha
// channel always uses normal over-blending (dst factor ONE_MINUS_SRC_ALPHA)
// regardless of the RGB mode, so the canvas's own alpha accumulates
// correctly rather than compounding past 1 at overlaps.
export function applyBlendMode(gl) {
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ONE_MINUS_DST_COLOR, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
}

export function destroyGL(gl) {
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
}

// One oversized triangle ([-1,-1], [3,-1], [-1,3]) that fully covers the NDC
// square — cheaper than a 4-vertex quad (no second triangle, no index
// buffer). Used only by the trail fade pass (see FADE_VERTEX_SRC/
// FADE_FRAGMENT_SRC in shaders.js).
const FADE_TRIANGLE_VERTS = new Float32Array([-1, -1, 3, -1, -1, 3]);

export function createFadeQuad(gl) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, FADE_TRIANGLE_VERTS, gl.STATIC_DRAW);
    return buffer;
}
