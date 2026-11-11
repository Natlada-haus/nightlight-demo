/* Moonpuff — calm "alive" ambient layer (animation pass, 11 Nov 2026).
   One small <canvas> per scene (splash / garden place / bedtime header) with ≤ 40 particles:
   fireflies, rising embers, soft flames, breathing glows, twinkling sky dots, water shimmer, dust motes.
   - capped at ~30 fps, paused while the tab is hidden, destroyed when its screen is gone
   - never starts under prefers-reduced-motion, or when the user sets "ภาพเคลื่อนไหว" to ปิด
   - every brightness change is slow (periods ≥ 2 s, i.e. ≤ 0.5 Hz) — no flashing (WCAG 2.3.1)
   - canvases are pointer-events:none and sit under the HUD / text, so tap targets never move
   Positions of painted things (fire, lantern, lamp) are given as fractions of the painted image
   and mapped through the same cover / viewBox math the page uses, so they stay put on resize. */
(function () {
  "use strict";
  var KEY = "nightlight-motion";                       /* "off" = user turned motion off */
  var mq = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var TAU = Math.PI * 2;

  function settingOn() { try { return localStorage.getItem(KEY) !== "off"; } catch (e) { return true; } }
  function allowed() { return !mq.matches && settingOn(); }
  function syncClass() { document.documentElement.classList.toggle("motion-off", !settingOn()); }
  syncClass();

  function rnd(a, b) { return a + Math.random() * (b - a); }
  /* 0..1..0 smooth wave; period in seconds */
  function wave(t, period, phase) { return 0.5 - 0.5 * Math.cos(TAU * (t / period + phase)); }

  /* ---------- pre-rendered glow sprites (drawImage is far cheaper than per-frame gradients) ---------- */
  var SP = null;
  function sprite(rgb, size, stops) {
    var c = document.createElement("canvas"); c.width = c.height = size;
    var g = c.getContext("2d"), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
    stops.forEach(function (s) { gr.addColorStop(s[0], "rgba(" + rgb + "," + s[1] + ")"); });
    g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
  }
  function sprites() {
    if (!SP) SP = {
      fly: sprite("255,228,140", 64, [[0, 1], [0.1, 0.9], [0.3, 0.28], [1, 0]]),
      ember: sprite("255,166,82", 32, [[0, 1], [0.18, 0.85], [0.45, 0.2], [1, 0]]),
      star: sprite("255,247,220", 32, [[0, 1], [0.16, 0.8], [0.4, 0.15], [1, 0]]),
      warm: sprite("255,160,80", 128, [[0, 0.9], [0.3, 0.42], [0.65, 0.12], [1, 0]]),
      lamp: sprite("255,214,150", 128, [[0, 0.85], [0.35, 0.35], [0.7, 0.08], [1, 0]]),
      mote: sprite("236,232,255", 32, [[0, 0.95], [0.25, 0.4], [1, 0]]),
      sheen: sprite("205,220,255", 64, [[0, 0.9], [0.4, 0.35], [1, 0]])
    };
    return SP;
  }

  /* ---------- scene definitions ----------
     A def returns { map(W,H) -> {s, ox, oy, k}, cfg(W,H,M) -> effect config in scene units }.
     scene units: splash / hero = painted-image pixels; garden = SVG viewBox units (390 x 560). */
  var natural = {};   /* natural image sizes, read once from the real files */
  function natSize(src, fallback) {
    if (natural[src]) return natural[src];
    natural[src] = fallback;
    var im = new Image();
    im.onload = function () { natural[src] = [im.naturalWidth, im.naturalHeight]; if (cur && cur.src === src) cur.resize(); };
    im.src = src;
    return fallback;
  }
  function bgPos(el) {   /* background-position as fractions, e.g. "0% 62%" -> [0, .62] */
    var p = (getComputedStyle(el).backgroundPosition || "50% 50%").split(" ");
    return p.map(function (v) { return /%$/.test(v) ? parseFloat(v) / 100 : 0.5; });
  }

  /* Splash: painted splash.jpg as a CSS cover background. Fire ≈ (78%, 61%), lantern ≈ (13%, 61%). */
  var SPLASH = {
    key: "splash", src: "assets/art/splash.jpg",
    map: function (W, H, host) {
      var n = natSize(this.src, [780, 1518]), pos = bgPos(host);
      var s = Math.max(W / n[0], H / n[1]);
      return { s: s, ox: (W - n[0] * s) * pos[0], oy: (H - n[1] * s) * pos[1], k: s, iw: n[0], ih: n[1] };
    },
    cfg: function (W, H, M) {
      var u = function (fx, fy) { return [fx * M.iw, fy * M.ih]; };
      var inv = function (x, y) { return [(x - M.ox) / M.s, (y - M.oy) / M.s]; };
      var z0 = inv(0, H * 0.4), z1 = inv(W, H * 0.8);   /* fireflies: lower part, kept off the button text */
      var f = u(0.782, 0.627), l = u(0.147, 0.596);
      return {
        fires: [{ x: f[0], y: f[1], h: 0.17 * M.iw, embers: 14, flames: true, glow: 1 }],
        lamps: [{ x: l[0], y: l[1], r: 0.13 * M.iw, a: 0.34, period: 3.6 }],
        fireflies: { n: 16, zone: [z0[0], z0[1], z1[0], z1[1]] }
      };
    }
  };

  /* Garden: the place's painted image sits inside the 390x560 SVG (xMidYMax slice). */
  var GARDEN_FX = {   /* image fractions (x, y) of painted things + zones in viewBox units */
    sea: { fire: [0.509, 0.664, 0.06], lamps: [[0.199, 0.641, 0.12, 0.3]], flies: [0, 380, 390, 540], fliesN: 12, embers: 6,
      shimmer: [[0, 432, 64, 470], [258, 432, 390, 470], [0, 536, 390, 560]], twinkle: 16 },
    meadow: { fire: [0.167, 0.68, 0.15], lamps: [[0.677, 0.486, 0.08, 0.32], [0.751, 0.509, 0.08, 0.32], [0.874, 0.478, 0.08, 0.32]],
      flies: [0, 360, 390, 545], fliesN: 12, embers: 8, twinkle: 15 },
    camp: { fire: [0.782, 0.627, 0.17], lamps: [[0.147, 0.596, 0.13, 0.32]], flies: [0, 400, 390, 545], fliesN: 10, embers: 10, twinkle: 14,
      avoid: [[0.75, 0.27, 0.09]] /* the painted moon */ },
    bedroom: { lamps: [[0.122, 0.452, 0.2, 0.36]], flies: [150, 360, 390, 470], fliesN: 5, motes: [10, 250, 175, 430], motesN: 8,
      twinkle: 14, sky: [0.3, 0.06, 0.86, 0.43] }
  };
  function gardenDef(place) {
    var L = window.NLArt && NLArt.PLACE_LAYOUT[place] ? NLArt.PLACE_LAYOUT[place] : NLArt.PLACE_LAYOUT.sea;
    var FX = GARDEN_FX[place] || GARDEN_FX.sea;
    var iw = 390 * L.scale, ih = iw * L.ar;
    function img(fx, fy) { return [L.x + fx * iw, L.y + fy * ih]; }
    return {
      key: "garden-" + place,
      map: function (W, H) {
        var s = Math.max(W / 390, H / 560);
        return { s: s, ox: (W - 390 * s) / 2, oy: H - 560 * s, k: s };
      },
      cfg: function (W, H, M) {
        var c = { fires: [], lamps: [] };
        if (FX.fire) { var f = img(FX.fire[0], FX.fire[1]); c.fires.push({ x: f[0], y: f[1], h: FX.fire[2] * iw, embers: FX.embers, flames: place === "camp", glow: place === "sea" ? 0.7 : 1 }); }
        (FX.lamps || []).forEach(function (l) { var p = img(l[0], l[1]); c.lamps.push({ x: p[0], y: p[1], r: l[2] * iw, a: l[3], period: rnd(3.2, 4.4) }); });
        c.fireflies = { n: FX.fliesN, zone: FX.flies };
        if (FX.motes) c.motes = { n: FX.motesN, zone: FX.motes };
        if (FX.shimmer) c.shimmer = { bands: FX.shimmer, n: 4 };
        /* sparse twinkling dots in open sky, never on a constellation slot, label, pet or the HUD band */
        var top = (0 - M.oy) / M.s + 110 / M.s;   /* below the HUD pills */
        var sky = FX.sky ? [img(FX.sky[0], FX.sky[1])[0], Math.max(top, img(FX.sky[0], FX.sky[1])[1]), img(FX.sky[2], FX.sky[3])[0], img(FX.sky[2], FX.sky[3])[1]]
          : [6, top, 384, 340];
        var avoid = [];
        L.stars.forEach(function (p) { avoid.push([p.x, p.y, 30]); });
        L.wander.forEach(function (p) { avoid.push([p.x, p.y, 30]); });
        if (L.label) avoid.push([L.label.x, L.label.y + 17, 0, 112, 26]);   /* rect: cx, cy, -, half-w, half-h */
        avoid.push([L.pet.x, L.pet.y + 12, 64]);
        (FX.avoid || []).forEach(function (a) { var p = img(a[0], a[1]); avoid.push([p[0], p[1], a[2] * iw]); });
        c.twinkles = { n: FX.twinkle, zone: sky, avoid: avoid };
        return c;
      }
    };
  }

  /* Bedtime hub header: bedroom.jpg at 390px wide, centred, shifted up 150px. Faint twinkles in the window sky + a few motes. */
  var HERO = {
    key: "hero", src: "assets/art/bedroom.jpg",
    map: function (W) {
      var n = natSize(this.src, [780, 1686]), s = 390 / n[0];
      return { s: s, ox: (W - 390) / 2, oy: -150, k: s, iw: n[0], ih: n[1] };
    },
    cfg: function (W, H, M) {
      return {
        twinkles: { n: 14, zone: [0.3 * M.iw, (0 - M.oy) / M.s + 8, 0.86 * M.iw, 0.42 * M.ih], avoid: [], dim: 0.6 },
        motes: { n: 4, zone: [0.02 * M.iw, 0.36 * M.ih, 0.3 * M.iw, 0.46 * M.ih] }
      };
    }
  };

  /* ---------- the running scene ---------- */
  var cur = null, raf = 0, last = 0, fx = [], fxCanvas = null;
  var stats = { frames: 0, ms: 0, max: 0, since: 0 };

  function Scene(host, def, before) {
    this.host = host; this.def = def; this.key = def.key; this.src = def.src;
    var c = this.canvas = document.createElement("canvas");
    c.className = "amb-canvas"; c.setAttribute("aria-hidden", "true");
    host.insertBefore(c, before || null);
    this.ctx = c.getContext("2d");
    this.resize();
    var self = this;
    if (window.ResizeObserver) { this.ro = new ResizeObserver(function () { self.resize(); }); this.ro.observe(host); }
  }
  Scene.prototype.resize = function () {
    var W = this.host.clientWidth, H = this.host.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!W || !H) return;
    var same = this.W === W && this.H === H && this.dpr === dpr;
    this.W = W; this.H = H; this.dpr = dpr;
    if (!same) { this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr); }
    this.M = this.def.map(W, H, this.host);
    this.C = this.def.cfg(W, H, this.M);
    this.build();
  };
  Scene.prototype.build = function () {
    var C = this.C, k = this.M.k, self = this;
    this.flies = []; this.motes = []; this.twk = []; this.streaks = []; this.embers = this.embers || [];
    function inZone(z) { return [rnd(z[0], z[2]), rnd(z[1], z[3])]; }
    function wanderer(z, slow) {
      var p = inZone(z);
      return { x: p[0], y: p[1], a: rnd(0, TAU), sp: (slow ? rnd(2, 5) : rnd(5, 11)) / k, turn: rnd(0.15, 0.4), ph: rnd(0, 1),
        per: slow ? rnd(5, 8) : rnd(4, 7), blink: rnd(0, 1), size: slow ? rnd(5, 8) : rnd(9, 14), z: z };
    }
    if (C.fireflies) for (var i = 0; i < C.fireflies.n; i++) this.flies.push(wanderer(C.fireflies.zone));
    if (C.motes) for (i = 0; i < C.motes.n; i++) this.motes.push(wanderer(C.motes.zone, true));
    if (C.twinkles) {
      var T = C.twinkles, tries = 0;
      while (this.twk.length < T.n && tries++ < 600) {
        var p = inZone(T.zone), bad = T.avoid.some(function (a) {
          return a.length > 3 ? Math.abs(p[0] - a[0]) < a[3] && Math.abs(p[1] - a[1]) < a[4] : (p[0] - a[0]) * (p[0] - a[0]) + (p[1] - a[1]) * (p[1] - a[1]) < a[2] * a[2];
        });
        if (!bad) this.twk.push({ x: p[0], y: p[1], per: rnd(3, 6.5), ph: rnd(0, 1), size: rnd(3.2, 5.6), max: rnd(0.45, 0.9) * (T.dim || 1) });
      }
    }
    if (C.shimmer) for (i = 0; i < C.shimmer.n; i++) {
      var b = C.shimmer.bands[i % C.shimmer.bands.length];
      this.streaks.push({ b: b, x: rnd(b[0], b[2]), y: rnd(b[1] + 3, b[3] - 3), w: rnd(50, 100) / k, h: rnd(3, 5) / k, v: rnd(5, 9) / k * (Math.random() < 0.5 ? -1 : 1), per: rnd(5, 8), ph: rnd(0, 1) });
    }
    this.nextEmber = 0;
    void self;
  };
  Scene.prototype.destroy = function () {
    if (this.ro) this.ro.disconnect();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  };

  function drawFlames(g, X, Y, H, t) {
    /* three soft teardrops over the painted fire, swaying slowly (periods 2.1–3.4 s) */
    var layers = [[1, 0.62, "255,140,60", 0.2, 2.6, 0], [0.78, 0.5, "255,186,92", 0.2, 2.1, 0.33], [0.5, 0.34, "255,238,176", 0.24, 3.1, 0.66]];
    for (var i = 0; i < 3; i++) {
      var l = layers[i], h = H * l[0] * (1 + 0.05 * Math.sin(TAU * (t / l[4] + l[5]))), w = H * l[1];
      var sw = H * 0.05 * Math.sin(TAU * (t / (l[4] * 1.31) + l[5])), a = l[3] * (0.85 + 0.15 * wave(t, l[4] * 1.17, l[5]));
      var gr = g.createLinearGradient(0, Y, 0, Y - h);
      gr.addColorStop(0, "rgba(" + l[2] + "," + a + ")"); gr.addColorStop(0.55, "rgba(" + l[2] + "," + (a * 0.7) + ")"); gr.addColorStop(1, "rgba(" + l[2] + ",0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(X - w / 2, Y);
      g.bezierCurveTo(X - w / 2, Y - h * 0.45, X + sw - w * 0.18, Y - h * 0.72, X + sw, Y - h);
      g.bezierCurveTo(X + sw + w * 0.18, Y - h * 0.72, X + w / 2, Y - h * 0.45, X + w / 2, Y);
      g.closePath(); g.fill();
    }
  }
  function blit(g, spr, X, Y, R, a) { if (a <= 0.004) return; g.globalAlpha = a; g.drawImage(spr, X - R, Y - R, R * 2, R * 2); }

  Scene.prototype.frame = function (t, dt) {
    var g = this.ctx, M = this.M, C = this.C, S = sprites(), s = M.s, ox = M.ox, oy = M.oy, k = M.k, i, p;
    if (!M || !C) return;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, this.W, this.H);
    g.globalCompositeOperation = "lighter";

    /* breathing warm glows (2–3 offset layers make it irregular) + lanterns / lamps */
    (C.fires || []).forEach(function (f, n) {
      var X = ox + f.x * s, Y = oy + f.y * s, Hh = f.h * s, gl = f.glow;
      blit(g, S.warm, X, Y - Hh * 0.45, Hh * 1.9 * (1 + 0.06 * Math.sin(TAU * (t / 2.3 + n * 0.3))), gl * (0.2 + 0.07 * wave(t, 2.9, 0.2)));
      blit(g, S.warm, X, Y - Hh * 0.35, Hh * 3.2 * (1 + 0.05 * Math.sin(TAU * (t / 3.7 + 0.5))), gl * (0.09 + 0.04 * wave(t, 3.3, 0.7)));
      blit(g, S.lamp, X, Y - Hh * 0.3, Hh * 0.9 * (1 + 0.08 * Math.sin(TAU * (t / 2.5 + 0.1))), gl * (0.16 + 0.06 * wave(t, 2.2, 0.45)));
      if (f.flames) { g.globalAlpha = 1; drawFlames(g, X, Y - Hh * 0.08, Hh * 0.95, t); }
    });
    (C.lamps || []).forEach(function (l, n) {
      blit(g, S.lamp, ox + l.x * s, oy + l.y * s, l.r * s * (1 + 0.04 * Math.sin(TAU * (t / (l.period * 1.3) + n * 0.37))), l.a * (0.7 + 0.3 * wave(t, l.period, n * 0.29)));
    });

    /* water shimmer: a few faint light streaks sliding slowly, clipped to the water bands only */
    for (i = 0; i < this.streaks.length; i++) {
      p = this.streaks[i]; var b = p.b;
      p.x += p.v * dt; if (p.x - p.w / 2 > b[2]) p.x = b[0] - p.w / 2; if (p.x + p.w / 2 < b[0]) p.x = b[2] + p.w / 2;
      g.save(); g.beginPath(); g.rect(ox + b[0] * s, oy + b[1] * s, (b[2] - b[0]) * s, (b[3] - b[1]) * s); g.clip();
      g.globalAlpha = 0.1 + 0.1 * wave(t, p.per, p.ph);
      g.drawImage(S.sheen, ox + (p.x - p.w / 2) * s, oy + (p.y - p.h / 2) * s, p.w * s, p.h * s);
      g.restore(); g.globalCompositeOperation = "lighter";
    }

    /* twinkling sky dots */
    for (i = 0; i < this.twk.length; i++) {
      p = this.twk[i];
      blit(g, S.star, ox + p.x * s, oy + p.y * s, p.size / 2, p.max * (0.25 + 0.75 * wave(t, p.per, p.ph)));
    }

    /* rising embers (a steady few at a time; each fades in, sways, fades out) */
    var self = this;
    (C.fires || []).forEach(function (f, n) {
      if (!f.embers) return;
      var alive = 0; for (var j = 0; j < self.embers.length; j++) if (self.embers[j].f === n) alive++;
      if (alive < f.embers && t >= (self.nextEmber || 0)) {
        self.nextEmber = t + rnd(2.2, 3.6) / f.embers;
        self.embers.push({ f: n, x: f.x + rnd(-0.22, 0.22) * f.h, y: f.y - f.h * rnd(0.3, 0.65), vy: rnd(14, 26) / k, amp: rnd(3, 7) / k,
          per: rnd(2, 3.2), ph: rnd(0, 1), born: t, life: rnd(2.2, 3.6), size: rnd(2.6, 4.2) });
      }
    });
    for (i = this.embers.length - 1; i >= 0; i--) {
      p = this.embers[i]; var age = t - p.born, q = age / p.life;
      if (q >= 1 || q < 0) { this.embers.splice(i, 1); continue; }
      p.y -= p.vy * dt;
      var ex = p.x + p.amp * Math.sin(TAU * (age / p.per + p.ph)), ea = (q < 0.15 ? q / 0.15 : Math.pow(1 - (q - 0.15) / 0.85, 1.3)) * 0.9;
      blit(g, S.ember, ox + ex * s, oy + p.y * s, p.size * (1 - q * 0.4), ea);
    }

    /* fireflies + dust motes: slow wandering drift, soft fade in / out (each 2–4 s) */
    function wander(list, spr, base) {
      for (var j = 0; j < list.length; j++) {
        var w = list[j], z = w.z;
        w.a += Math.sin(TAU * (t / 6 + w.ph)) * w.turn * dt;
        var cx = (z[0] + z[2]) / 2, cy = (z[1] + z[3]) / 2;
        if (w.x < z[0] || w.x > z[2] || w.y < z[1] || w.y > z[3]) {   /* steer gently back inside */
          var want = Math.atan2(cy - w.y, cx - w.x), d = Math.atan2(Math.sin(want - w.a), Math.cos(want - w.a));
          w.a += d * Math.min(1, dt * 1.2);
        }
        w.x += Math.cos(w.a) * w.sp * dt; w.y += Math.sin(w.a) * w.sp * 0.6 * dt;
        var al = Math.pow(wave(t, w.per, w.blink), 1.4);
        blit(g, spr, ox + w.x * s, oy + w.y * s, w.size / 2, base * al);
      }
    }
    wander(this.flies, S.fly, 0.95);
    wander(this.motes, S.mote, 0.45);
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  };

  /* ---------- one-shot effects (light collect, star lit) on a temporary overlay canvas ---------- */
  function phoneBox() {
    var ph = document.getElementById("phone"); if (!ph) return null;
    var r = ph.getBoundingClientRect(), sc = r.width / (ph.offsetWidth || r.width) || 1;
    return { el: ph, r: r, sc: sc, W: ph.offsetWidth, H: ph.offsetHeight };
  }
  function ensureFx() {
    var P = phoneBox(); if (!P) return null;
    if (!fxCanvas || !fxCanvas.isConnected) {
      fxCanvas = document.createElement("canvas"); fxCanvas.className = "amb-fx"; fxCanvas.setAttribute("aria-hidden", "true");
      P.el.appendChild(fxCanvas);
    }
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (fxCanvas.width !== Math.round(P.W * dpr)) { fxCanvas.width = Math.round(P.W * dpr); fxCanvas.height = Math.round(P.H * dpr); }
    fxCanvas._dpr = dpr; fxCanvas._W = P.W; fxCanvas._H = P.H;
    return P;
  }
  function local(P, rect) { return { x: (rect.left + rect.width / 2 - P.r.left) / P.sc, y: (rect.top + rect.height / 2 - P.r.top) / P.sc, w: rect.width / P.sc, h: rect.height / P.sc }; }
  function star4(g, x, y, r) {
    var q = r * 0.28; g.beginPath(); g.moveTo(x, y - r);
    g.quadraticCurveTo(x + q, y - q, x + r, y); g.quadraticCurveTo(x + q, y + q, x, y + r);
    g.quadraticCurveTo(x - q, y + q, x - r, y); g.quadraticCurveTo(x - q, y - q, x, y - r); g.fill();
  }
  /* golden sparkles rising gently toward the light counter (≤ 1.2 s) */
  function collectBurst(targetEl) {
    if (!allowed() || !targetEl) return;
    var P = ensureFx(); if (!P) return;
    var to = local(P, targetEl.getBoundingClientRect()), now = performance.now() / 1000, n = 20;
    for (var i = 0; i < n; i++) {
      /* rise from the card's lower-left area and gather in the empty space just left of the number,
         so they never sit on the digits or on the "เดโม" line; each fades out as it arrives */
      var sx = to.x - rnd(60, 240), sy = to.y + rnd(30, 70), ex = to.x - to.w / 2 - rnd(14, 90), ey = to.y + rnd(-10, 10);
      fx.push({ kind: "spark", t0: now + rnd(0, 0.22), dur: rnd(0.75, 0.95), x0: sx, y0: sy, x1: ex, y1: ey,
        cx: (sx + ex) / 2 + rnd(-20, 20), cy: Math.min(sy, ey) - rnd(10, 30), r: rnd(2.6, 4.6) });
    }
    start();
  }
  /* small sparkle ring when a star is lit */
  function ring(el) {
    if (!allowed() || !el) return;
    var P = ensureFx(); if (!P) return;
    var c = local(P, el.getBoundingClientRect()), now = performance.now() / 1000;
    fx.push({ kind: "halo", t0: now, dur: 0.9, x: c.x, y: c.y });
    for (var i = 0; i < 10; i++) fx.push({ kind: "ring", t0: now, dur: rnd(0.8, 1), x: c.x, y: c.y, ang: i / 10 * TAU + rnd(-0.12, 0.12), r0: 8, r1: rnd(26, 34), r: rnd(1.8, 3) });
    start();
  }
  function drawFx(nowS) {
    if (!fxCanvas) return;
    var g = fxCanvas.getContext("2d"), S = sprites();
    g.setTransform(fxCanvas._dpr, 0, 0, fxCanvas._dpr, 0, 0); g.clearRect(0, 0, fxCanvas._W, fxCanvas._H);
    for (var i = fx.length - 1; i >= 0; i--) {
      var p = fx[i], q = (nowS - p.t0) / p.dur;
      if (q >= 1) { fx.splice(i, 1); continue; }
      if (q < 0) continue;
      var e = 1 - Math.pow(1 - q, 3), a = q < 0.12 ? q / 0.12 : q > 0.6 ? (1 - q) / 0.4 : 1, x, y;
      if (p.kind === "spark") {
        var u = 1 - e; x = u * u * p.x0 + 2 * u * e * p.cx + e * e * p.x1; y = u * u * p.y0 + 2 * u * e * p.cy + e * e * p.y1;
        g.globalCompositeOperation = "lighter"; blit(g, S.fly, x, y, p.r * 3, a * 0.55);
        g.globalCompositeOperation = "source-over"; g.globalAlpha = a; g.fillStyle = "#FFE3A0"; star4(g, x, y, p.r);
      } else if (p.kind === "ring") {
        var rr = p.r0 + (p.r1 - p.r0) * e, an = p.ang + q * 0.5; x = p.x + Math.cos(an) * rr; y = p.y + Math.sin(an) * rr;
        g.globalCompositeOperation = "source-over"; g.globalAlpha = a; g.fillStyle = "#FFF3C4"; star4(g, x, y, p.r * (1 - q * 0.3));
      } else {
        g.globalCompositeOperation = "lighter"; blit(g, S.star, p.x, p.y, 20 + 22 * e, (1 - q) * 0.45);
      }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    if (!fx.length && fxCanvas.parentNode) { fxCanvas.parentNode.removeChild(fxCanvas); fxCanvas = null; }
  }

  /* ---------- loop ---------- */
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (last && now - last < 32) return;               /* ~30 fps cap */
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    var a = performance.now();
    if (cur && !cur.host.isConnected) { cur.destroy(); cur = null; }
    if (cur) cur.frame(now / 1000, dt);
    if (fx.length || fxCanvas) drawFx(performance.now() / 1000);
    if (!cur && !fx.length) { stop(); return; }
    var ms = performance.now() - a;
    stats.frames++; stats.ms += ms; if (ms > stats.max) stats.max = ms;
  }
  function start() {
    if (raf || document.hidden || !allowed() || (!cur && !fx.length)) return;
    last = 0; raf = requestAnimationFrame(loop);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; }
  function destroy() {
    stop();
    if (cur) { cur.destroy(); cur = null; }
    fx.length = 0; if (fxCanvas && fxCanvas.parentNode) fxCanvas.parentNode.removeChild(fxCanvas); fxCanvas = null;
  }

  /* called by app.js after every render: find this screen's scene host (if any) */
  function scan(o) {
    o = o || {};
    if (!allowed()) { destroy(); return; }
    var host = null, def = null, before = null, el;
    if ((el = document.querySelector("#app .splash-paint"))) { host = el; def = SPLASH; }
    else if ((el = document.querySelector("#app #stage"))) { host = el; def = gardenDef(o.place || "sea"); before = el.querySelector("svg.scene"); before = before && before.nextSibling; }
    else if ((el = document.querySelector("#app .bedtime .hero"))) { host = el; def = HERO; }
    if (cur && cur.host === host && cur.key === (def && def.key)) { start(); return; }
    if (cur) { cur.destroy(); cur = null; }
    if (host) { try { cur = new Scene(host, def, before); } catch (e) { cur = null; } }
    if (cur || fx.length) start(); else stop();
  }

  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
  var onMq = function () { if (!allowed()) destroy(); else scan(window.NL && NL.state ? { place: NL.state().place } : {}); };
  if (mq.addEventListener) mq.addEventListener("change", onMq); else if (mq.addListener) mq.addListener(onMq);

  window.Ambient = {
    allowed: allowed, settingOn: settingOn, scan: scan, ring: ring, collectBurst: collectBurst,
    setEnabled: function (on) {
      try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {}
      syncClass(); if (!on) destroy();
    },
    running: function () { return !!raf; },
    scene: function () { return cur ? cur.key : null; },
    particles: function () { return cur ? cur.flies.length + cur.motes.length + cur.twk.length + cur.streaks.length + cur.embers.length : 0; },
    stats: function () { return { frames: stats.frames, avgMs: stats.frames ? stats.ms / stats.frames : 0, maxMs: stats.max }; },
    resetStats: function () { stats.frames = 0; stats.ms = 0; stats.max = 0; }
  };
})();
