// src/webs/underlay/gl/ticker.js
// One shared requestAnimationFrame loop for every visible <svc-underlay> instance,
// mirroring the _ticker pattern in src/webs/apex/web-bg.js. Also tracks a rolling
// FPS estimate from its own frame deltas — no extra rAF loop needed for measurement.

const _set = new Set();
let _raf = 0;
let _lastNow = 0;
let _fps = 60;

function _loop(now) {
    _raf = 0;
    const dt = _lastNow ? now - _lastNow : 16.7;
    _lastNow = now;
    if (dt > 0) {
        const instantFps = 1000 / dt;
        _fps += (instantFps - _fps) * 0.1; // exponential moving average
    }
    for (const inst of Array.from(_set)) {
        const keepGoing = inst._tick(now);
        if (!keepGoing) _set.delete(inst);
    }
    if (_set.size) {
        _raf = requestAnimationFrame(_loop);
    } else {
        _lastNow = 0; // reset so the next add() doesn't compute a stale dt
    }
}

export const ticker = {
    add(inst) {
        _set.add(inst);
        if (!_raf) _raf = requestAnimationFrame(_loop);
    },
    remove(inst) {
        _set.delete(inst);
    },
    getFps() {
        return _fps;
    },
};
