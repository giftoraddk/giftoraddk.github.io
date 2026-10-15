// src/webs/underlay/gl/shaders.js
// GLSL ES 1.00 (attribute/varying) — valid under both WebGL1 and WebGL2 contexts,
// so the same source works regardless of which one createGL() ends up with.

export const CONCEPTS = { dots: 0, bubbles: 1, stars: 2, leaf: 3, snowflake: 4 };

export const VERTEX_SRC = `
precision mediump float;

attribute vec2 a_seed;
attribute float a_phase;
attribute float a_sizeSeed;
attribute vec3 a_color;

uniform float u_time;
uniform mediump int u_concept; // precision pinned explicitly — GLSL ES 1.00 defaults int to highp in the vertex stage but mediump in the fragment stage, and this uniform is now read in both (see FRAGMENT_SRC); a bare "uniform int" here would silently mismatch the fragment shader's default and fail to link the whole program.
uniform float u_deg;
uniform float u_speed;
uniform float u_sizeMin;
uniform float u_sizeMax;
uniform vec2 u_resolution;
uniform float u_dpr;
uniform vec2 u_pointer;
uniform float u_pushEnabled;
uniform float u_pushRadius;
uniform float u_pushStrength;

varying vec3 v_color;
varying float v_alpha;
varying float v_rot;
varying float v_size;

void main() {
    float rad = radians(u_deg);
    vec2 dir = vec2(sin(rad), cos(rad));

    vec2 pos = a_seed * 2.0 - 1.0;
    float t = u_time * 0.001 * u_speed;
    float size = mix(u_sizeMin, u_sizeMax, a_sizeSeed);
    float alpha = 1.0;
    v_rot = 0.0;

    if (u_concept == 1) {
        // bubbles: rise along dir, wrap, gentle wobble, slow alpha pulse.
        // travel wraps via fract() — a hard positional teleport once per
        // cycle. edgeFade fades alpha to 0 just before/after that wrap point
        // so the teleport happens while invisible instead of visibly popping.
        // Phase driven by a_phase, NOT a_seed.x — a_seed.x also sets this
        // particle's static pos.x below, and at dir.x == -1 exactly (deg=270)
        // the two uses of a_seed.x cancelled out algebraically, collapsing
        // every particle onto the same x each frame (a visible vertical line
        // instead of a scattered field). a_phase is an independent per-particle
        // random value, so no direction can ever reintroduce that cancellation.
        float travel = fract(t * 0.05 + a_phase);
        pos += dir * (travel * 2.0 - 1.0);
        pos.x += sin(t * 1.3 + a_phase) * 0.04;
        float edgeFade = smoothstep(0.0, 0.08, travel) * smoothstep(1.0, 0.92, travel);
        // Floor raised to 0.6 (was 0.35) so bubbles read as solid-ish colored
        // circles against a light background instead of a washed/pastel
        // blob whose low-alpha core blends heavily with whatever is behind it.
        alpha = (0.6 + 0.4 * (0.5 + 0.5 * sin(t * 2.0 + a_phase))) * edgeFade;
    } else if (u_concept == 2) {
        // stars: drift + gentle twinkle. The mod() wrap below can teleport a
        // star to the opposite edge on either axis — edgeFade fades alpha out
        // near whichever edge is closest so that teleport also happens while
        // invisible, same idea as the bubbles wrap above. Drift coefficient
        // (0.06, was 0.01) is fast enough to actually be visible at speed=1 —
        // the old value was so slow it read as static even over many seconds,
        // and a comet-trail look (trail prop, see the fade pass in JS) needs
        // real per-frame motion to leave a visible streak.
        pos += dir * t * 0.06;
        pos = mod(pos + 1.0, 2.0) - 1.0;
        // Twinkle: wide alpha/size range + a livelier frequency so stars visibly
        // sparkle/blink rather than just gently pulse.
        float tw = 0.5 + 0.5 * sin(t * 2.4 + a_phase * 3.0);
        float edgeDist = min(1.0 - abs(pos.x), 1.0 - abs(pos.y));
        float edgeFade = smoothstep(0.0, 0.06, edgeDist);
        alpha = (0.4 + 0.6 * tw) * edgeFade;
        size *= 0.7 + 0.35 * tw;
    } else if (u_concept == 3) {
        // leaf: falls/drifts along dir like bubbles, but with a wider,
        // slower side-to-side sway (a leaf catches more air than a bubble)
        // and a per-particle tumble rotation — a_sizeSeed picks each leaf's
        // spin speed/direction (some barely turn, some spin either way) so
        // the field doesn't read as uniform. The fragment shader uses v_rot
        // to draw the actual leaf silhouette rotated to this angle.
        // Phase driven by a_phase, not a_seed.x — see the bubbles branch above.
        float travel = fract(t * 0.045 + a_phase);
        pos += dir * (travel * 2.0 - 1.0);
        pos.x += sin(t * 0.9 + a_phase) * 0.09;
        float edgeFade = smoothstep(0.0, 0.08, travel) * smoothstep(1.0, 0.92, travel);
        // Flat, near-opaque (no pulse, unlike bubbles) — a leaf should read
        // as a solid, crisp cutout, not a softly breathing/translucent blob.
        alpha = 0.98 * edgeFade;
        float rotSpeed = (a_sizeSeed - 0.5) * 1.2;
        v_rot = a_phase + t * rotSpeed + sin(t * 0.7 + a_phase) * 0.5;
    } else if (u_concept == 4) {
        // snowflake: falls almost straight down along dir with only a light
        // sway (snow drifts far less than a leaf catching air) and a slow,
        // steady spin — real snowflakes turn gently rather than tumbling.
        // The fragment shader draws the actual snowflake linework rotated
        // to v_rot.
        // Phase driven by a_phase, not a_seed.x — see the bubbles branch above.
        float travel = fract(t * 0.04 + a_phase);
        pos += dir * (travel * 2.0 - 1.0);
        pos.x += sin(t * 0.6 + a_phase) * 0.035;
        float edgeFade = smoothstep(0.0, 0.08, travel) * smoothstep(1.0, 0.92, travel);
        alpha = 0.9 * edgeFade;
        float rotSpeed = (a_sizeSeed - 0.5) * 0.4;
        v_rot = a_phase + t * rotSpeed;
    } else {
        // dots: no built-in motion of its own — a faint static field. The
        // universal pointer-push below (its defining look) is what brings it
        // to life; without push enabled it just sits at this quiet baseline.
        alpha = 0.25;
    }

    // Universal pointer-repel push — opt-in via u_pushEnabled (the push
    // prop), layered on top of whichever concept motion ran above so ANY
    // concept (not just dots) can react to the pointer, with radius/strength
    // configurable via u_pushRadius/u_pushStrength (the pushRadius/
    // pushStrength props). Stateless: displacement and the size/alpha boost
    // are purely a function of the CURRENT distance to u_pointer — no
    // persisted velocity/spring state — so this stays O(1) JS cost regardless
    // of particle count (mirrors the "push away from cursor" read of
    // web-bg's pushFx without its per-tile spring integration, which would
    // need an O(particle-count) JS loop every frame). Snaps back the instant
    // the pointer moves away rather than bouncing/overshooting.
    //
    // u_pointer is in DOM/canvas pixel space (y=0 at top, growing downward);
    // NDC y grows upward, so the ndc<->pixel conversion here flips y to
    // match — a plain (ndc*0.5+0.5) would leave the push mirrored vertically.
    if (u_pushEnabled > 0.5) {
        vec2 px = vec2(pos.x * 0.5 + 0.5, 1.0 - (pos.y * 0.5 + 0.5)) * u_resolution;
        vec2 toDot = px - u_pointer;
        float dist = length(toDot);
        float pushRadius = u_pushRadius * u_dpr;
        float prox = 1.0 - smoothstep(0.0, pushRadius, dist);
        vec2 pdir = toDot / max(dist, 1.0);
        px += pdir * prox * prox * u_pushStrength * u_dpr;
        vec2 n = px / u_resolution;
        pos = vec2(n.x * 2.0 - 1.0, (1.0 - n.y) * 2.0 - 1.0);
        size *= 1.0 + prox * 1.8;
        alpha = clamp(alpha + prox * 0.55, 0.0, 1.0);
    }

    gl_Position = vec4(pos, 0.0, 1.0);
    gl_PointSize = max(1.0, size * u_dpr);
    v_color = a_color;
    v_alpha = clamp(alpha, 0.0, 1.0);
    v_size = gl_PointSize;
}
`;

export const FRAGMENT_SRC = `
precision mediump float;

uniform float u_glow;
uniform mediump int u_concept; // must match VERTEX_SRC's precision exactly — see comment there

varying vec3 v_color;
varying float v_alpha;
varying float v_rot;
varying float v_size;

// Distance from p to the segment a-b — shared by any custom shape that
// needs to draw thin lines (e.g. shapeLeaf's vein below).
float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

// Baseline particle shape — a soft-edged circle. This is dots' own look,
// and doubles as the shared default for every concept that doesn't define
// its own (bubbles, stars) — only u_glow (quality-tier dependent) varies
// the edge softness. To give a NEW concept a custom look: write its own
// shapeXxx(p, ...) below (see shapeLeaf for the pattern — it may also
// touch color, unlike this one) and add one branch for it in main().
//
// AA band width is derived from v_size (the point's actual on-screen pixel
// diameter) rather than a fixed fraction of the shape's normalized radius —
// a fixed band only spans a fraction of a screen pixel on large points
// (e.g. big bubbles), which reads as a jagged/stair-stepped edge. Deriving
// it from v_size keeps the feather pinned to ~1.5 screen pixels regardless
// of how large or small the point is rendered.
float shapeCircle(vec2 p) {
    float dist = length(p) * 2.0;
    float glowBoost = u_glow > 0.5 ? 1.6 : 1.0;
    float aa = clamp(3.0 * glowBoost / v_size, 0.006, 0.5);
    return 1.0 - smoothstep(1.0 - aa, 1.0, dist);
}

// Custom shape for u_concept == 3 (leaf): a vesica (two overlapping circles,
// centers offset on X) pointed top/bottom, plus a short vein anchored at
// one tip. p arrives already centered on the point (gl_PointCoord - 0.5);
// rot is v_rot from the vertex stage, so the field looks like leaves
// tumbling rather than a grid of identical shapes. Tints color in place
// for the vein — custom shapes are free to touch color, not just the mask.
float shapeLeaf(vec2 p, float rot, inout vec3 color) {
    float s = sin(rot);
    float c = cos(rot);
    p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    float r = 0.42;
    float k = 0.30;
    float d1 = length(p - vec2(k, 0.0)) - r;
    float d2 = length(p - vec2(-k, 0.0)) - r;
    float d = max(d1, d2);
    // Tighter AA band than shapeCircle's, and tighter still than before
    // (0.006 vs 0.01) — reads as a crisp, sharply-edged cutout.
    float falloff = 1.0 - smoothstep(-0.006, 0.006, d);

    // Vein: just a midrib (side veins read as too busy at particle scale),
    // anchored AT the tip and tapering to nothing at veinLen. The vein is
    // always a vertical segment at x=0, so distance-to-segment collapses to
    // a plain y-clamp instead of general segment math.
    float tipY = sqrt(r * r - k * k);
    float veinLen = tipY * 1.4;
    float veinBaseY = tipY - veinLen;
    float ey = clamp(p.y, veinBaseY, tipY);
    float taper = (ey - veinBaseY) / veinLen; // 1 at tip, 0 at veinLen
    float outerR = mix(0.002, 0.012, taper);
    float veinMask = (1.0 - smoothstep(outerR * 0.5, outerR, length(vec2(p.x, p.y - ey)))) * taper;
    color = mix(color, vec3(1.0), veinMask * 0.3);

    return falloff;
}

// Custom shape for u_concept == 4 (snowflake): 6-fold symmetric linework —
// a short main spoke per arm with a single V-shaped fork near its tip,
// opening outward, plus a small filled dot at the center (matches the
// reference icon: short bold spokes, not long thin rays). Built by folding
// p's angle into a single 60° wedge (q), so only one arm's worth of segment
// math needs writing; the fold's built-in mirror gives the fork its
// symmetry for free. Pure line art (no filled body, unlike shapeLeaf) with
// a bold stroke — here the stroke IS the whole shape, so it can't afford to
// be faint.
float shapeSnowflake(vec2 p, float rot) {
    float s = sin(rot);
    float c = cos(rot);
    p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);

    float ang = atan(p.y, p.x);
    float rad = length(p);
    float sector = 1.0471975512; // 2*PI/6 — 6-fold symmetry
    ang = mod(ang + sector * 0.5, sector) - sector * 0.5;
    vec2 q = vec2(cos(ang), sin(ang)) * rad;

    // Shorter arms than before (0.34 vs 0.46) — the reference reads as
    // short, stubby spokes, not long thin rays.
    float armLen = 0.34;
    float d = sdSegment(q, vec2(0.0), vec2(armLen, 0.0));

    // One V-fork near the tip, opening outward wide enough that the 3
    // prongs (the main line's own end, plus the 2 fork tips) read as
    // clearly separate points, not a tangle at the elbow. Anchored a bit
    // further back from the tip (0.62 of arm length) so the fork sits
    // lower down the arm. Wider angle than before (48° vs 40°) for more
    // separation between the 2 branches.
    float bAng = radians(48.0);
    vec2 fwd = vec2(cos(bAng), sin(bAng));
    vec2 base = vec2(armLen * 0.5, 0.0);
    vec2 tip = base + 0.15 * fwd;
    d = min(d, sdSegment(q, base, tip));
    tip.y = -tip.y;
    d = min(d, sdSegment(q, base, tip));

    // Small filled dot at the very center (max(...,0.0) clamps the distance
    // to 0 inside the dot's radius, so it reads as solid, not just a ring).
    d = min(d, max(rad - 0.05, 0.0));

    // Bold stroke centered at strokeR, with a size-adaptive AA half-band
    // (same v_size-derived technique as shapeCircle) instead of the old
    // fixed 0.028-0.044 band — a fixed band's screen-pixel width grows with
    // point size, which read as soft/jagged on large snowflakes.
    float strokeR = 0.036;
    float halfBand = clamp(1.5 / v_size, 0.006, 0.016);
    return 1.0 - smoothstep(strokeR - halfBand, strokeR + halfBand, d);
}

void main() {
    vec2 p = gl_PointCoord - vec2(0.5);
    vec3 color = v_color;
    float falloff;

    if (u_concept == 3) {
        falloff = shapeLeaf(p, v_rot, color);
    } else if (u_concept == 4) {
        falloff = shapeSnowflake(p, v_rot);
    } else {
        falloff = shapeCircle(p);
    }

    if (falloff <= 0.0) discard;
    float alpha = v_alpha * falloff;
    gl_FragColor = vec4(color * alpha, alpha);
}
`;

// Trail/comet effect: instead of a hard clear each frame, this draws nothing
// (always outputs transparent black) over the whole viewport with a blend
// func of (ZERO, CONSTANT_ALPHA) — that multiplies the EXISTING framebuffer
// contents by whatever constant alpha JS sets via gl.blendColor(), fading the
// previous frame toward transparent instead of erasing it outright. Moving
// particles then leave a trail behind them that fades over a few frames,
// naturally oriented along whichever direction they're actually drifting
// (deg for bubbles/stars) — no per-particle trail geometry needed. A single
// oversized triangle (3 vertices) covers the viewport more cheaply than a
// 4-vertex quad.
export const FADE_VERTEX_SRC = `
attribute vec2 a_pos;
void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

export const FADE_FRAGMENT_SRC = `
precision mediump float;
void main() {
    gl_FragColor = vec4(0.0);
}
`;
