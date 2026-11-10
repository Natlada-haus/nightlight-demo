/* Nightlight — flat minimal vector art (inline SVG strings). All art is original. */
(function () {
  var C = {
    sky0: "#0E1B3D", sky1: "#2A2D5E", sky2: "#4A3F6B",
    moon: "#F6E3A1", moonDark: "#E6CC86", star: "#FFF3C4",
    mtnBack: "#1B2A52", mtnFront: "#141F3F", ground: "#0B1530",
    fire: "#FF9A4D", fireIn: "#FFD27A",
    skin: "#E9B58C", hair: "#2A2140", sweater: "#7C70C9", sweaterShade: "#6A5EB5", pants: "#33406E",
    wood: "#5B3B33", woodLight: "#7A5143", tree: "#0F1A38"
  };

  // deterministic pseudo-random
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function stars(w, h, count, seed, avoid) {
    var r = rng(seed), out = "";
    for (var i = 0; i < count; i++) {
      var x = r() * w, y = r() * h, rad = 0.8 + r() * 1.5;
      if (avoid && avoid(x, y)) continue;
      var d = (r() * 4).toFixed(2), dur = (2.6 + r() * 3).toFixed(2);
      var op = (0.45 + r() * 0.55).toFixed(2);
      out += '<circle class="tw" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + rad.toFixed(2) +
        '" fill="' + C.star + '" opacity="' + op + '" style="animation-delay:' + d + 's;animation-duration:' + dur + 's"/>';
    }
    return out;
  }

  function defs(id) {
    return '<defs>' +
      '<linearGradient id="' + id + 'sky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + C.sky0 + '"/><stop offset="0.62" stop-color="' + C.sky1 + '"/><stop offset="1" stop-color="' + C.sky2 + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'glow" cx="0.5" cy="0.5" r="0.5">' +
      '<stop offset="0" stop-color="' + C.fire + '" stop-opacity="0.55"/><stop offset="0.45" stop-color="' + C.fire + '" stop-opacity="0.22"/><stop offset="1" stop-color="' + C.fire + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id + 'halo" cx="0.5" cy="0.5" r="0.5">' +
      '<stop offset="0" stop-color="' + C.moon + '" stop-opacity="0.28"/><stop offset="1" stop-color="' + C.moon + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id + 'lglow" cx="0.5" cy="0.5" r="0.5">' +
      '<stop offset="0" stop-color="' + C.fireIn + '" stop-opacity="0.5"/><stop offset="1" stop-color="' + C.fireIn + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id + 'sglow" cx="0.5" cy="0.5" r="0.5">' +
      '<stop offset="0" stop-color="' + C.star + '" stop-opacity="0.55"/><stop offset="1" stop-color="' + C.star + '" stop-opacity="0"/></radialGradient>' +
      '</defs>';
  }

  function moon(x, y, r, id) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 3) + '" fill="url(#' + id + 'halo)"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + C.moon + '"/>' +
      '<circle cx="' + (x + r * 0.32) + '" cy="' + (y - r * 0.12) + '" r="' + (r * 0.26) + '" fill="' + C.moonDark + '"/>' +
      '<circle cx="' + (x - r * 0.38) + '" cy="' + (y - r * 0.3) + '" r="' + (r * 0.14) + '" fill="' + C.moonDark + '"/>' +
      '<circle cx="' + (x - r * 0.1) + '" cy="' + (y + r * 0.45) + '" r="' + (r * 0.11) + '" fill="' + C.moonDark + '"/>';
  }

  // layered mountains relative to groundY
  function mountains(w, g) {
    var b = g;
    return '<path fill="' + C.sky2 + '" opacity="0.55" d="M0 ' + (b - 70) + ' L40 ' + (b - 92) + ' L78 ' + (b - 74) + ' L120 ' + (b - 104) + ' L170 ' + (b - 78) +
      ' L222 ' + (b - 112) + ' L262 ' + (b - 86) + ' L300 ' + (b - 100) + ' L350 ' + (b - 76) + ' L390 ' + (b - 94) + ' L390 ' + b + ' L0 ' + b + 'Z"/>' +
      '<path fill="' + C.mtnBack + '" d="M0 ' + (b - 44) + ' L52 ' + (b - 78) + ' L96 ' + (b - 52) + ' L150 ' + (b - 96) + ' L196 ' + (b - 60) +
      ' L238 ' + (b - 82) + ' L292 ' + (b - 46) + ' L338 ' + (b - 72) + ' L390 ' + (b - 50) + ' L390 ' + b + ' L0 ' + b + 'Z"/>' +
      '<path fill="' + C.mtnFront + '" d="M0 ' + (b - 18) + ' L60 ' + (b - 36) + ' L118 ' + (b - 16) + ' L176 ' + (b - 30) + ' L240 ' + (b - 12) +
      ' L300 ' + (b - 34) + ' L350 ' + (b - 18) + ' L390 ' + (b - 26) + ' L390 ' + b + ' L0 ' + b + 'Z"/>';
  }

  function pine(x, base, h, color) {
    var w = h * 0.42, out = '<rect x="' + (x - 2) + '" y="' + (base - h * 0.16) + '" width="4" height="' + (h * 0.16) + '" fill="' + color + '"/>';
    for (var i = 0; i < 3; i++) {
      var top = base - h + i * h * 0.24, bot = base - h * 0.14 - (2 - i) * h * 0.2;
      var ww = w * (0.55 + i * 0.22);
      out += '<path fill="' + color + '" d="M' + x + ' ' + top + ' L' + (x + ww) + ' ' + bot + ' L' + (x - ww) + ' ' + bot + 'Z"/>';
    }
    return out;
  }

  function fire(x, base, s) {
    s = s || 1;
    return '<g transform="translate(' + x + ' ' + base + ') scale(' + s + ')">' +
      '<rect x="-17" y="-6" width="34" height="7" rx="3.5" fill="' + C.wood + '" transform="rotate(-12)"/>' +
      '<rect x="-17" y="-6" width="34" height="7" rx="3.5" fill="' + C.woodLight + '" transform="rotate(12)"/>' +
      '<g class="flame"><path fill="' + C.fire + '" d="M0 -44 C9 -30 15 -22 13 -12 C11 -3 5 0 0 0 C-6 0 -12 -4 -13 -12 C-14 -20 -8 -24 -5 -32 C-3 -26 -1 -24 1 -24 C2 -31 0 -37 0 -44Z"/></g>' +
      '<g class="flame f2"><path fill="' + C.fireIn + '" d="M0 -24 C5 -17 8 -12 7 -7 C6 -2 3 0 0 0 C-3 0 -7 -2 -7 -7 C-7 -12 -3 -15 0 -24Z"/></g>' +
      '</g>';
  }

  // simple flat person sitting on a log, facing right toward the fire, holding a mug
  function person(x, seat) {
    return '<g transform="translate(' + x + ' ' + seat + ')">' +
      // log seat
      '<rect x="-26" y="0" width="46" height="13" rx="6.5" fill="' + C.wood + '"/>' +
      '<ellipse cx="-26" cy="6.5" rx="4" ry="6.5" fill="' + C.woodLight + '"/>' +
      // legs
      '<path d="M-4 -2 L18 -12 L26 10" fill="none" stroke="' + C.pants + '" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<ellipse cx="30" cy="12" rx="7" ry="4" fill="#E9E4F7"/>' +
      // torso (cozy sweater)
      '<path d="M-14 -2 C-15 -22 -12 -38 -2 -40 C8 -41 11 -30 10 -2 Z" fill="' + C.sweater + '"/>' +
      '<path d="M-14 -2 C-15 -22 -12 -36 -6 -39 C-9 -28 -9 -14 -8 -2 Z" fill="' + C.sweaterShade + '"/>' +
      // arm reaching to mug
      '<path d="M0 -30 L12 -18 L22 -20" fill="none" stroke="' + C.sweater + '" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="20" y="-28" width="9" height="10" rx="2" fill="#F3EBDD"/>' +
      '<circle cx="21" cy="-20" r="3.4" fill="' + C.skin + '"/>' +
      // neck + head
      '<rect x="-3" y="-46" width="6" height="8" fill="' + C.skin + '"/>' +
      '<circle cx="1" cy="-55" r="12" fill="' + C.skin + '"/>' +
      // short hair (cap of hair over back/top)
      '<path d="M-11.5 -52 C-13 -64 -4 -70 4 -68 C11 -67 14 -62 13 -58 C7 -60 2 -60 -2 -57 C-4 -54 -5 -51 -7 -47 C-9 -48 -11 -49 -11.5 -52Z" fill="' + C.hair + '"/>' +
      '<circle cx="9" cy="-54" r="1.4" fill="' + C.hair + '"/>' +
      '<path d="M8 -49 Q10 -48 11.5 -49.5" fill="none" stroke="#B9785A" stroke-width="1.2" stroke-linecap="round"/>' +
      // cheek glow from fire
      '<circle cx="8" cy="-50" r="2.6" fill="#F59C7A" opacity="0.55"/>' +
      '</g>';
  }

  /* ---------- decor items (each has a fixed ground spot) ---------- */
  var DECOR_ART = {
    lantern: function (x, b, icon) {
      return (icon ? '' : '<circle cx="' + x + '" cy="' + (b - 38) + '" r="34" fill="url(#gdlglow)"/>') +
        '<rect x="' + (x - 1) + '" y="' + (b - 58) + '" width="2" height="58" fill="#3A3150"/>' +
        '<path d="M' + x + ' ' + (b - 58) + ' Q' + (x + 12) + ' ' + (b - 60) + ' ' + (x + 14) + ' ' + (b - 52) + '" fill="none" stroke="#3A3150" stroke-width="2"/>' +
        '<ellipse cx="' + (x + 14) + '" cy="' + (b - 40) + '" rx="10" ry="12" fill="#FFB86B"/>' +
        '<ellipse cx="' + (x + 14) + '" cy="' + (b - 40) + '" rx="5" ry="12" fill="#FFD27A"/>' +
        '<rect x="' + (x + 10) + '" y="' + (b - 54) + '" width="8" height="3" rx="1" fill="#8A4B3A"/>' +
        '<rect x="' + (x + 10) + '" y="' + (b - 29) + '" width="8" height="3" rx="1" fill="#8A4B3A"/>';
    },
    pine: function (x, b) { return pine(x, b, 64, "#1F3A4A") + pine(x + 18, b + 2, 40, "#24475A"); },
    flowers: function (x, b) {
      return '<path d="M' + (x - 12) + ' ' + (b - 18) + ' L' + (x + 12) + ' ' + (b - 18) + ' L' + (x + 9) + ' ' + b + ' L' + (x - 9) + ' ' + b + 'Z" fill="#B5654A"/>' +
        '<rect x="' + (x - 14) + '" y="' + (b - 22) + '" width="28" height="6" rx="3" fill="#C9775A"/>' +
        '<path d="M' + x + ' ' + (b - 22) + ' L' + (x - 6) + ' ' + (b - 40) + ' M' + x + ' ' + (b - 22) + ' L' + (x + 1) + ' ' + (b - 46) + ' M' + x + ' ' + (b - 22) + ' L' + (x + 8) + ' ' + (b - 38) + '" stroke="#4F8A6A" stroke-width="2.5" stroke-linecap="round"/>' +
        '<circle cx="' + (x - 6) + '" cy="' + (b - 42) + '" r="4.5" fill="#F2A7C3"/>' +
        '<circle cx="' + (x + 1) + '" cy="' + (b - 48) + '" r="4.5" fill="#FFF3C4"/>' +
        '<circle cx="' + (x + 8) + '" cy="' + (b - 40) + '" r="4.5" fill="#B9A7F2"/>';
    },
    bench: function (x, b) {
      return '<rect x="' + (x - 30) + '" y="' + (b - 22) + '" width="60" height="7" rx="3" fill="' + C.woodLight + '"/>' +
        '<rect x="' + (x - 30) + '" y="' + (b - 38) + '" width="60" height="6" rx="3" fill="' + C.wood + '"/>' +
        '<rect x="' + (x - 26) + '" y="' + (b - 38) + '" width="5" height="38" rx="2" fill="' + C.wood + '"/>' +
        '<rect x="' + (x + 21) + '" y="' + (b - 38) + '" width="5" height="38" rx="2" fill="' + C.wood + '"/>';
    },
    telescope: function (x, b) {
      return '<path d="M' + x + ' ' + (b - 26) + ' L' + (x - 14) + ' ' + b + ' M' + x + ' ' + (b - 26) + ' L' + (x + 14) + ' ' + b + ' M' + x + ' ' + (b - 26) + ' L' + (x + 2) + ' ' + b + '" stroke="#8E87B8" stroke-width="3" stroke-linecap="round"/>' +
        '<g transform="rotate(-32 ' + x + ' ' + (b - 30) + ')"><rect x="' + (x - 18) + '" y="' + (b - 36) + '" width="40" height="11" rx="5" fill="#D8D2F2"/>' +
        '<rect x="' + (x + 18) + '" y="' + (b - 38) + '" width="8" height="15" rx="3" fill="#B9B1E3"/></g>';
    },
    tent: function (x, b) {
      return '<path d="M' + x + ' ' + (b - 62) + ' L' + (x + 44) + ' ' + b + ' L' + (x - 44) + ' ' + b + 'Z" fill="#3B3F7A"/>' +
        '<path d="M' + x + ' ' + (b - 62) + ' L' + (x + 44) + ' ' + b + ' L' + (x + 12) + ' ' + b + 'Z" fill="#4C4F92"/>' +
        '<path d="M' + x + ' ' + (b - 40) + ' L' + (x + 12) + ' ' + b + ' L' + (x - 12) + ' ' + b + 'Z" fill="#1A1C40"/>' +
        '<path d="M' + x + ' ' + (b - 62) + ' L' + (x - 4) + ' ' + (b - 70) + ' M' + x + ' ' + (b - 62) + ' L' + (x + 4) + ' ' + (b - 70) + '" stroke="#5B5FA6" stroke-width="2" stroke-linecap="round"/>';
    }
  };

  var DECOR = [
    { id: "lantern", name: "โคมกระดาษ", price: 30, x: 108, b: 572 },
    { id: "pine", name: "ต้นสนเล็ก", price: 20, x: 352, b: 512 },
    { id: "flowers", name: "กระถางดอกไม้", price: 20, x: 44, b: 604 },
    { id: "bench", name: "ม้านั่งไม้", price: 40, x: 310, b: 606 },
    { id: "telescope", name: "กล้องดูดาว", price: 50, x: 282, b: 536 },
    { id: "tent", name: "เต็นท์", price: 60, x: 62, b: 528 }
  ];

  function decorIcon(id) {
    var d = DECOR.filter(function (x) { return x.id === id; })[0];
    var box = { tent: [92, 80], bench: [72, 72], pine: [80, 80] }[id] || [64, 64];
    var cx = d.x + (id === "lantern" ? 10 : id === "pine" ? 8 : 0);
    return '<svg viewBox="' + (cx - box[0] / 2) + ' ' + (d.b - box[1] + 4) + ' ' + box[0] + ' ' + box[1] + '" aria-hidden="true">' + DECOR_ART[id](d.x, d.b, true) + '</svg>';
  }

  /* ---------- constellation (ถ้วยชา) ---------- */
  // order = lighting order. first 4 form the cup body (unlocked by streak 4)
  var CONST = {
    name: "กลุ่มดาวถ้วยชา",
    stars: [
      { x: 112, y: 176 }, // 0 rim left
      { x: 134, y: 262 }, // 1 bottom left
      { x: 206, y: 262 }, // 2 bottom right
      { x: 228, y: 176 }, // 3 rim right
      { x: 262, y: 196 }, // 4 handle top
      { x: 250, y: 236 }, // 5 handle bottom
      { x: 92, y: 284 }   // 6 saucer
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 2], [1, 6]]
  };
  var WANDER = [{ x: 44, y: 184 }, { x: 172, y: 138 }, { x: 336, y: 250 }, { x: 40, y: 360 }, { x: 300, y: 352 }];

  function sparkle(x, y, r) {
    var k = r * 0.28;
    return '<path d="M' + x + ' ' + (y - r) + ' Q' + (x + k) + ' ' + (y - k) + ' ' + (x + r) + ' ' + y + ' Q' + (x + k) + ' ' + (y + k) + ' ' + x + ' ' + (y + r) +
      ' Q' + (x - k) + ' ' + (y + k) + ' ' + (x - r) + ' ' + y + ' Q' + (x - k) + ' ' + (y - k) + ' ' + x + ' ' + (y - r) + 'Z" fill="#FFF3C4"/>';
  }

  /* ---------- full scenes ---------- */
  function splashScene() {
    var W = 390, H = 844, g = 560, id = "sp";
    return '<svg class="scene" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' + defs(id) +
      '<rect width="' + W + '" height="' + g + '" fill="url(#' + id + 'sky)"/>' +
      stars(W, g - 90, 70, 7, function (x, y) { return y < 372 && x > 24 && x < 366; }) +
      moon(306, 418, 26, id) +
      mountains(W, g) +
      '<rect y="' + (g - 1) + '" width="' + W + '" height="' + (H - g + 1) + '" fill="' + C.ground + '"/>' +
      pine(30, g + 8, 96, C.tree) + pine(62, g + 6, 64, C.tree) + pine(362, g + 8, 78, C.tree) +
      '<ellipse cx="200" cy="' + (g + 70) + '" rx="190" ry="70" fill="url(#' + id + 'glow)" class="glowpool"/>' +
      '<g transform="translate(200 ' + (g + 60) + ') scale(1.3) translate(-200 ' + (-(g + 60)) + ')">' +
      person(160, g + 40) + fire(226, g + 56, 1) +
      '<rect x="262" y="' + (g + 40) + '" width="26" height="16" rx="4" fill="' + C.wood + '"/><ellipse cx="275" cy="' + (g + 40) + '" rx="13" ry="4" fill="' + C.woodLight + '"/>' +
      '</g></svg>';
  }

  function gardenScene(state) {
    var W = 390, H = 636, g = 470, id = "gd";
    var lit = state.stars || [], placed = state.decor || [], wander = state.wander || [];
    var s = '<svg class="scene" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMax slice">' + defs(id) +
      '<rect width="' + W + '" height="' + g + '" fill="url(#' + id + 'sky)"/>' +
      stars(W, g - 80, 46, 21, function (x, y) { return (x > 70 && x < 290 && y > 140 && y < 340) || (y > 84 && y < 126 && x > 90 && x < 300) || (y < 96 && x < 150); }) +
      moon(326, 132, 24, id) + mountains(W, g) +
      '<rect y="' + (g - 1) + '" width="' + W + '" height="' + (H - g + 1) + '" fill="' + C.ground + '"/>';

    // constellation lines (edge drawn when both ends lit)
    s += '<g class="const-lines">';
    CONST.edges.forEach(function (e) {
      if (lit.indexOf(e[0]) > -1 && lit.indexOf(e[1]) > -1) {
        var a = CONST.stars[e[0]], b = CONST.stars[e[1]];
        s += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="#FFF3C4" stroke-opacity="0.6" stroke-width="1.5" stroke-linecap="round"/>';
      } else {
        var a2 = CONST.stars[e[0]], b2 = CONST.stars[e[1]];
        s += '<line class="guide" x1="' + a2.x + '" y1="' + a2.y + '" x2="' + b2.x + '" y2="' + b2.y + '" stroke="#B9BEDF" stroke-opacity="0.16" stroke-width="1" stroke-dasharray="2 5"/>';
      }
    });
    s += '</g>';

    var unlocked = state.streak || 4;
    CONST.stars.forEach(function (p, i) {
      var isLit = lit.indexOf(i) > -1, locked = i >= unlocked;
      s += '<g class="slot ' + (isLit ? "lit" : locked ? "locked" : "open") + '" data-star="' + i + '" role="button" tabindex="0" aria-label="' +
        (isLit ? "ดาวดวงที่ " + (i + 1) + " จุดแล้ว" : locked ? "ดาวดวงที่ " + (i + 1) + " ยังล็อก" : "จุดดาวดวงที่ " + (i + 1) + " ใช้ 10 แสง") + '">' +
        '<circle cx="' + p.x + '" cy="' + p.y + '" r="22" fill="transparent"/>';
      if (isLit) s += '<circle cx="' + p.x + '" cy="' + p.y + '" r="20" fill="url(#' + id + 'sglow)"/>' + sparkle(p.x, p.y, 9) + '<circle cx="' + p.x + '" cy="' + p.y + '" r="2.4" fill="#fff"/>';
      else if (locked) s += '<circle cx="' + p.x + '" cy="' + p.y + '" r="6" fill="none" stroke="#9FA6D6" stroke-opacity="0.45" stroke-width="1.2" stroke-dasharray="2 3"/>';
      else s += '<circle class="pulse" cx="' + p.x + '" cy="' + p.y + '" r="10" fill="none" stroke="#FFD27A" stroke-width="1.5" stroke-dasharray="3 3"/><circle cx="' + p.x + '" cy="' + p.y + '" r="2.4" fill="#FFD27A"/>';
      s += '</g>';
    });
    if ([0, 1, 2, 3].every(function (i) { return lit.indexOf(i) > -1; })) {
      s += '<g class="const-label"><rect x="99" y="300" width="166" height="28" rx="14" fill="#0E1B3D" fill-opacity="0.72" stroke="#FFF3C4" stroke-opacity="0.35"/>' +
        '<text x="182" y="319" text-anchor="middle" font-size="13" font-weight="500" fill="#FFF3C4">' + CONST.name + ' (4/7 คืน)</text></g>';
    }
    WANDER.forEach(function (p, i) {
      var isLit = wander.indexOf(i) > -1;
      s += '<g class="slot ' + (isLit ? "lit" : "open small") + '" data-wander="' + i + '" role="button" tabindex="0" aria-label="' + (isLit ? "ดาวเล็กจุดแล้ว" : "จุดดาวเล็ก ใช้ 10 แสง") + '">' +
        '<circle cx="' + p.x + '" cy="' + p.y + '" r="22" fill="transparent"/>' +
        (isLit ? '<circle cx="' + p.x + '" cy="' + p.y + '" r="14" fill="url(#' + id + 'sglow)"/>' + sparkle(p.x, p.y, 6)
          : '<circle cx="' + p.x + '" cy="' + p.y + '" r="7" fill="none" stroke="#FFD27A" stroke-opacity="0.7" stroke-width="1.2" stroke-dasharray="2 3"/>') + '</g>';
    });

    // back trees
    s += pine(18, g + 6, 70, C.tree) + pine(380, g + 4, 52, C.tree);
    // glow pool
    s += '<ellipse cx="196" cy="' + (g + 98) + '" rx="180" ry="62" fill="url(#' + id + 'glow)" class="glowpool"/>';
    // empty decor spots + placed decor (draw back-to-front by baseline)
    DECOR.slice().sort(function (a, b) { return a.b - b.b; }).forEach(function (d) {
      if (placed.indexOf(d.id) > -1) s += '<g class="decor-in">' + DECOR_ART[d.id](d.x, d.b) + '</g>';
      else s += '<ellipse cx="' + d.x + '" cy="' + (d.b - 2) + '" rx="16" ry="4" fill="none" stroke="#9FA6D6" stroke-opacity="0.32" stroke-dasharray="3 3"/>';
      if (d.id === "telescope") s += person(170, g + 82) + fire(232, g + 98, 0.95);
    });
    s += '</svg>';
    return s;
  }

  /* ---------- small scenes ---------- */
  function morningArt() {
    var id = "mn";
    return '<svg viewBox="0 0 390 180" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>' +
      '<linearGradient id="mnsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D2452"/><stop offset=".6" stop-color="#4A3F6B"/><stop offset="1" stop-color="#C98A7A"/></linearGradient>' +
      '<radialGradient id="mnsun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFD27A" stop-opacity=".7"/><stop offset="1" stop-color="#FFD27A" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="390" height="180" fill="url(#mnsky)"/>' + stars(390, 80, 16, 3) +
      '<circle cx="250" cy="150" r="70" fill="url(#mnsun)"/><circle cx="250" cy="152" r="20" fill="#FFD9A0"/>' +
      '<path fill="#2A2D5E" d="M0 140 L50 118 L96 136 L150 108 L200 134 L246 116 L300 138 L350 112 L390 128 L390 180 L0 180Z"/>' +
      '<path fill="#1B2A52" d="M0 160 L70 146 L130 162 L196 148 L260 164 L330 150 L390 160 L390 180 L0 180Z"/></svg>';
  }

  var THUMBS = {
    forest: '<rect width="64" height="64" fill="#1E3A4A"/><circle cx="48" cy="14" r="6" fill="#F6E3A1"/>' + pine(14, 66, 50, "#12283A") + pine(34, 66, 60, "#0E2030") + pine(54, 66, 44, "#12283A") +
      '<circle cx="24" cy="40" r="1.6" fill="#FFD27A"/><circle cx="44" cy="46" r="1.3" fill="#FFD27A"/><circle cx="30" cy="52" r="1.1" fill="#FFD27A"/>',
    waves: '<rect width="64" height="64" fill="#26306A"/><circle cx="20" cy="18" r="7" fill="#F6E3A1"/><rect x="17" y="34" width="6" height="22" fill="#F6E3A1" opacity=".25"/>' +
      '<path d="M0 36 Q8 32 16 36 T32 36 T48 36 T64 36 V64 H0Z" fill="#334A8C"/><path d="M0 46 Q8 42 16 46 T32 46 T48 46 T64 46 V64 H0Z" fill="#2B3E78"/><path d="M0 56 Q8 52 16 56 T32 56 T48 56 T64 56 V64 H0Z" fill="#1F2E5E"/>',
    rain: '<rect width="64" height="64" fill="#2A2D5E"/><rect x="10" y="8" width="44" height="40" rx="4" fill="#1A2147" stroke="#7C70C9" stroke-width="3"/><path d="M32 8 V48 M10 28 H54" stroke="#7C70C9" stroke-width="2"/>' +
      '<circle cx="42" cy="38" r="5" fill="#FFD27A" opacity=".45"/>' +
      '<path d="M18 13 v5 M26 20 v6 M40 14 v5 M47 21 v6 M20 33 v6 M45 34 v5" stroke="#B9C3F2" stroke-width="1.6" stroke-linecap="round"/><rect y="48" width="64" height="16" fill="#3A2F55"/><rect x="6" y="50" width="52" height="5" rx="2" fill="#4A3F6B"/>',
    lighthouse: '<rect width="64" height="64" fill="#1B2A52"/><path d="M34 18 L64 8 L64 26Z" fill="#FFD27A" opacity=".35"/><path d="M0 50 Q16 40 30 44 Q44 40 64 50 V64 H0Z" fill="#141F3F"/>' +
      '<path d="M28 46 L30 22 L38 22 L40 46Z" fill="#E9E4F7"/><rect x="29" y="30" width="10" height="4" fill="#C9775A"/><rect x="29" y="38" width="11" height="4" fill="#C9775A"/><rect x="29" y="15" width="10" height="7" rx="1" fill="#FFD27A"/><path d="M28 15 L34 10 L40 15Z" fill="#7C70C9"/>' +
      '<circle cx="12" cy="12" r="1" fill="#FFF3C4"/><circle cx="20" cy="22" r="1" fill="#FFF3C4"/><circle cx="8" cy="30" r="1" fill="#FFF3C4"/>',
    stars: '<rect width="64" height="64" fill="#2A2D5E"/><path d="M-4 30 Q30 10 70 24" stroke="#FFF3C4" stroke-opacity=".18" stroke-width="12" fill="none"/>' +
      '<path d="M48 8 A9 9 0 1 0 56 20 A7 7 0 1 1 48 8Z" fill="#F6E3A1"/>' +
      '<circle cx="10" cy="12" r="1.3" fill="#FFF3C4"/><circle cx="22" cy="24" r="1.6" fill="#FFF3C4"/><circle cx="34" cy="14" r="1.1" fill="#FFF3C4"/><circle cx="14" cy="36" r="1" fill="#FFF3C4"/><circle cx="40" cy="32" r="1.4" fill="#FFF3C4"/><circle cx="54" cy="38" r="1" fill="#FFF3C4"/>' +
      '<path d="M0 50 Q32 42 64 50 V64 H0Z" fill="#1B3A3F"/><path d="M8 50 l2 -6 l2 6 M24 47 l2 -6 l2 6 M44 47 l2 -6 l2 6 M56 50 l2 -6 l2 6" stroke="#2F5A55" stroke-width="1.5" fill="none"/>'
  };
  function thumb(id) { return '<svg viewBox="0 0 64 64" aria-hidden="true">' + THUMBS[id] + '</svg>'; }

  window.NLArt = { splashScene: splashScene, gardenScene: gardenScene, morningArt: morningArt, thumb: thumb, decorIcon: decorIcon, DECOR: DECOR, CONST: CONST, WANDER: WANDER, sparkle: sparkle };
})();
