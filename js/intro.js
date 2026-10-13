/* Burrito Dash — intro animation controller (index.html only).
   The decision to play is made by the inline script in <head>, which adds
   .bd-intro-on to <html> before first paint. This file runs the timeline,
   handles Skip / click / Escape, and always ends with window.__bdIntroDone = true.

   One burrito, one continuous path (never more than one on screen):
     dash   0    – 1000ms  runs left → right with legs and speed lines
     loop   1000 – 1900ms  curves back round into the background, small and soft
     close  1900 – 2700ms  runs up to centre, getting bigger
     wrap   2700 – 3200ms  foil wraps on, shine sweeps across
     smack  3200 – 3600ms  her logo sticker slaps onto the foil with a squash/bounce
   then fades out at ~3.9s, unless window.__bdIntroHold is set (?introhold=1). */
(function () {
  var root = document.documentElement;
  var overlay = document.getElementById('bd-intro');

  function markDone() {
    window.__bdIntroDone = true;
    try { document.dispatchEvent(new CustomEvent('bd:introdone')); } catch (e) { /* old browsers */ }
  }

  if (!overlay || !root.classList.contains('bd-intro-on')) {
    if (overlay && overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
    markDone();
    return;
  }

  var hold = window.__bdIntroHold === true;
  var END = 3600, LEAVE_AT = 3900, FAILSAFE = 6000;
  var finished = false;
  var timers = [];
  var raf = 0;

  var $ = function (id) { return document.getElementById(id); };
  var mover = $('bd-mover'), fx = $('bd-fx'), blur = $('bd-blur'), speed = $('bd-speed');
  var shadow = $('bd-shadow'), lean = $('bd-lean'), legs = $('bd-legs');
  var foil = $('bd-foil'), shine = $('bd-shine'), sticker = $('bd-sticker');

  function cleanup() {
    timers.forEach(clearTimeout);
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey);
    if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
    root.classList.remove('bd-intro-on');
    markDone();
  }

  function finish(fast) {
    if (finished) { return; }
    finished = true;
    overlay.classList.add('is-leaving');
    timers.push(setTimeout(cleanup, fast ? 260 : 420));
  }

  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Esc') { finish(true); }
  }

  /* ---- helpers ---- */
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function easeInOut(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function bez(p0, p1, p2, p3, k) {
    var u = 1 - k;
    return u * u * u * p0 + 3 * u * u * k * p1 + 3 * u * k * k * p2 + k * k * k * p3;
  }
  function n(v) { return Math.round(v * 100) / 100; }

  /* Visible horizontal extent of the stage in SVG units, so the path fits any aspect ratio. */
  var CX = 600, left = -150, hw = 450;
  try {
    var m = $('bd-stage').getScreenCTM();
    if (m) {
      var inv = m.inverse(), w = window.innerWidth || root.clientWidth;
      left = inv.e;
      hw = Math.min(Math.max((inv.a * w) / 2, 260), 700);
      left = Math.min(left, CX - hw);
    }
  } catch (e) { /* defaults are fine */ }

  // Path control points: [x, y] pairs for each leg of the run.
  // `room` keeps the full-size burrito on screen on narrow (portrait) viewports.
  var room = hw - 230, dashX = CX + Math.min(0.45 * hw, room);
  var P = {
    dashFrom: [left - 260, 340], dashTo: [dashX, 340],
    loop: [[dashX, 340], [CX + Math.min(0.95 * hw, room + 70), 345], [CX + Math.min(0.8 * hw, room + 50), 135], [CX + 0.05 * hw, 160]],
    close: [[CX + 0.05 * hw, 160], [CX - 0.6 * hw, 150], [CX - 0.62 * hw, 330], [CX, 300]]
  };
  var FAR = 0.36, NEAR = Math.min(1.4, (hw * 0.85) / 202);

  /* ---- one frame of the timeline at time t (ms) ---- */
  function render(t) {
    var x, y, s, face = 1, skew = 0, sq = 1, bob = 0, blurAmt = 0, op = 1, speedOp = 0, legsOn = 1;

    if (t < 1000) {                         // 1) dash left → right
      var a = seg(t, 0, 1000), ae = easeInOut(a);
      x = lerp(P.dashFrom[0], P.dashTo[0], ae); y = 340; s = 1;
      skew = -14; bob = -Math.abs(Math.sin(t / 65)) * 10;
      speedOp = clamp(a * 6) * (1 - seg(a, 0.85, 1) * 0.6);
    } else if (t < 1900) {                  // 2) loop round into the background
      var b = seg(t, 1000, 1900), be = easeInOut(b), L = P.loop;
      x = bez(L[0][0], L[1][0], L[2][0], L[3][0], be);
      y = bez(L[0][1], L[1][1], L[2][1], L[3][1], be);
      s = lerp(1, FAR, easeInOut(b));
      face = Math.cos(Math.PI * seg(b, 0.3, 0.62));   // turns to run back the other way
      skew = -14 * Math.abs(face) - 6;
      bob = -Math.abs(Math.sin(t / 65)) * 10;
      blurAmt = 5 * be; op = lerp(1, 0.7, be);
      speedOp = 0.4 * (1 - seg(b, 0, 0.4));
    } else if (t < 2700) {                  // 3) runs up close to the viewer at centre
      var c = seg(t, 1900, 2700), ce = easeInOut(c), C = P.close;
      x = bez(C[0][0], C[1][0], C[2][0], C[3][0], ce);
      y = bez(C[0][1], C[1][1], C[2][1], C[3][1], ce);
      s = lerp(FAR, NEAR, Math.pow(c, 1.6));
      face = -Math.cos(Math.PI * seg(c, 0.25, 0.55));  // turns back towards the right
      skew = -10 * Math.abs(face) * (1 - seg(c, 0.8, 1));
      bob = -Math.abs(Math.sin(t / 65)) * 10 * (1 - seg(c, 0.85, 1));
      blurAmt = 5 * (1 - easeOut(seg(c, 0, 0.6))); op = lerp(0.7, 1, easeOut(seg(c, 0, 0.6)));
      speedOp = 0.7 * seg(c, 0.4, 0.6) * (1 - seg(c, 0.85, 1));
      legsOn = 1 - seg(c, 0.88, 1);
    } else {                                // 4–5) parked at centre
      x = CX; y = 300; s = NEAR; legsOn = 0;
      sq = 1 + 0.08 * Math.sin(Math.PI * seg(t, 2700, 2850)); // landing squash
    }

    // 5) sticker impact gives the whole package a squash and a little bounce
    var hit = seg(t, 3380, 3600);
    if (t >= 3380) { sq = 1 - 0.1 * Math.sin(Math.PI * hit) * (1 - hit); }

    if (Math.abs(face) < 0.08) { face = face < 0 ? -0.08 : 0.08; }
    mover.setAttribute('transform', 'translate(' + n(x) + ',' + n(y) + ') scale(' + n(s * face) + ',' + n(s) + ')');
    lean.setAttribute('transform', 'translate(0,' + n(100 + bob) + ') skewX(' + n(skew) + ') scale(' + n(2 - sq) + ',' + n(sq) + ') translate(0,-100)');
    fx.setAttribute('opacity', n(op));
    if (blurAmt > 0.15) { blur.setAttribute('stdDeviation', n(blurAmt)); fx.setAttribute('filter', 'url(#bdBlur)'); }
    else { fx.removeAttribute('filter'); }
    speed.setAttribute('opacity', n(speedOp));
    legs.setAttribute('opacity', n(legsOn));
    legs.setAttribute('transform', 'translate(0,52) scale(1,' + n(Math.max(legsOn, 0.01)) + ') translate(0,-52)');
    shadow.setAttribute('opacity', n(0.55 * op));
    overlay.classList.toggle('is-running', legsOn > 0);

    // 4) foil wraps on from the left, then a shine sweeps across it
    var f = easeInOut(seg(t, 2700, 3150));
    foil.setAttribute('opacity', n(clamp(f * 8)));
    foil.setAttribute('transform', 'translate(-186,0) scale(' + n(f) + ',1) translate(186,0)');
    shine.setAttribute('transform', 'translate(' + n(lerp(-420, 420, easeInOut(seg(t, 3050, 3400)))) + ',0)');

    // 5) sticker flies in from the viewer and smacks on: big → squash → overshoot → settle
    var k = seg(t, 3200, 3600), ss, sy, rot;
    if (k < 0.45) { var q = k / 0.45; ss = lerp(2.6, 1, q * q); sy = ss; rot = lerp(-28, -8, q); }
    else if (k < 0.65) { var r = (k - 0.45) / 0.2; ss = lerp(1.22, 1, r); sy = lerp(0.72, 1, r); rot = -8; }   // splat
    else { var v = (k - 0.65) / 0.35; ss = 1 + 0.08 * Math.sin(Math.PI * v) * (1 - v); sy = 2 - ss; rot = lerp(-8, -6, v); }
    sticker.setAttribute('opacity', t < 3200 ? 0 : n(clamp(k * 6)));
    sticker.setAttribute('transform', 'translate(-4,0) rotate(' + n(rot) + ') scale(' + n(ss) + ',' + n(sy) + ') translate(4,0)');

    if (t >= 3400) { overlay.classList.add('is-tagged'); }
  }

  overlay.addEventListener('click', function () { finish(true); });
  document.addEventListener('keydown', onKey);
  var skip = overlay.querySelector('.bd-intro-skip');
  if (skip) {
    skip.addEventListener('click', function (e) { e.stopPropagation(); finish(true); });
  }
  if (hold) { overlay.classList.add('is-hold'); }

  var ended = false;
  function reachedEnd() {
    if (ended) { return; }
    ended = true;
    cancelAnimationFrame(raf);
    render(END);
    if (hold) { markDone(); } else { timers.push(setTimeout(function () { finish(false); }, LEAVE_AT - END)); }
  }

  render(0);
  var start = 0;
  function tick() {
    if (finished) { return; }
    var now = performance.now();
    if (!start) { start = now; }
    var t = now - start;
    if (t >= END) { reachedEnd(); return; }
    render(t);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  // Failsafe: if frames stall (background tab etc.), never leave the overlay up past 6s.
  timers.push(setTimeout(function () {
    if (finished) { return; }
    if (hold) { reachedEnd(); } else { finish(true); }
  }, FAILSAFE));
})();
