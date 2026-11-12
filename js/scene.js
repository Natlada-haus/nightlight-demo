/* Moonpuff — flat minimal vector art (inline SVG strings). All art is original. */
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

  // x/b = reference point used only to frame the tray icons; real positions come from PLACE_LAYOUT spots
  var DECOR = [
    { id: "lantern", name: "โคมกระดาษ", price: 30, x: 322, b: 503 },
    { id: "pine", name: "ต้นสนเล็ก", price: 20, x: 14, b: 500 },
    { id: "flowers", name: "กระถางดอกไม้", price: 20, x: 50, b: 507 },
    { id: "bench", name: "ม้านั่งไม้", price: 40, x: 352, b: 508 },
    { id: "telescope", name: "กล้องดูดาว", price: 50, x: 362, b: 500 },
    { id: "tent", name: "เต็นท์", price: 60, x: 352, b: 500 }
  ];
  var DECOR_W = { lantern: 40, pine: 64, flowers: 30, bench: 62, telescope: 52, tent: 90 };
  var DECOR_H = { lantern: 64, pine: 66, flowers: 50, bench: 40, telescope: 50, tent: 72 };
  var DECOR_DX = { lantern: 12, pine: 8 }; // art is drawn off-centre; shift so it centres on the spot

  /* painted decor sprites (codex image_generation, transparent PNG, 240px tall); [display height in scene units, aspect w/h] */
  var DECOR_IMG = { lantern: [74, 136 / 240], pine: [76, 190 / 240], flowers: [48, 197 / 240], bench: [52, 298 / 240], telescope: [66, 156 / 240], tent: [66, 283 / 240] };
  function decorSrc(id) { return "assets/art/decor/" + id + ".png"; }
  function decorIcon(id) {
    return '<img class="decor-img" src="' + decorSrc(id) + '" alt="" aria-hidden="true">';
  }

  /* ---------- constellations ---------- */
  // cup shape in local units; star centres are >= 56 apart so each 48px tap circle keeps >= 8px spacing
  var CONST = {
    id: "cup", name: "กลุ่มดาวถ้วยชา",
    stars: [{ x: 30, y: 0 }, { x: 54, y: 92 }, { x: 140, y: 92 }, { x: 164, y: 0 }, { x: 220, y: 24 }, { x: 206, y: 84 }, { x: 0, y: 132 }],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 2], [1, 6]]
  };
  // special reward constellation: a sleeping cat curled up
  var CONST2 = {
    id: "cat", name: "กลุ่มดาวแมวหลับ",
    stars: [{ x: 0, y: 30 }, { x: 18, y: 0 }, { x: 40, y: 22 }, { x: 96, y: 18 }, { x: 140, y: 46 }, { x: 118, y: 84 }, { x: 40, y: 80 }],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]]
  };

  /* ---------- places (viewBox 390 x 560, bottom-anchored so the ground is always visible) ----------
     img frame, 7 constellation star centres (open sky, >= 56 apart), small stars, label spot, 6 ground spots, pet spot */
  var VB_H = 560;
  function cupAt(cx, cy) { return CONST.stars.map(function (p) { return { x: cx + p.x, y: cy + p.y }; }); }
  /* 6 ground spots per place. The widest painted item (tent, ~78 units) must stay >= 8 units inside the
     390-wide viewBox, so spot centres keep to x 47..343 (v3 fix: the telescope/tent/bench used to poke past 390).
     Same-row centres stay >= 56 apart; spots in rows < 56 apart vertically also keep >= 56 apart sideways,
     so every 48x48 target keeps >= 8 px spacing (WCAG 2.5.8). */
  var GROUND6 = function (b) { return [47, 106, 165, 225, 284, 343].map(function (x) { return { x: x, b: b }; }); };
  var PLACE_LAYOUT = {
    sea: { img: "assets/art/garden.jpg", ar: 1484 / 780, scale: 1.12, x: -24, y: -49,
      stars: cupAt(40, 176), label: { x: 150, y: 322 },
      wander: [{ x: 352, y: 196 }, { x: 352, y: 268 }, { x: 30, y: 372 }],
      /* sea islet: characters sit at x~75-285, so spots keep to the free grass at the sides; the front pair sits
         on the grass (b 524), not on the rocky waterline (v3 fix) */
      spots: [{ x: 47, b: 470 }, { x: 47, b: 526 }, { x: 287, b: 470 }, { x: 343, b: 470 }, { x: 287, b: 526 }, { x: 343, b: 526 }], pet: { x: 330, y: 352 } },   /* between the wander star (gap 10) and the back-row targets (pill bottom 414, gap 8) */
    meadow: { img: "assets/art/meadow.jpg", ar: 1690 / 780, scale: 1, x: 0, y: -90,
      stars: cupAt(30, 176), label: { x: 140, y: 322 },
      wander: [{ x: 324, y: 196 }],
      spots: GROUND6(548), pet: { x: 60, y: 396 } },
    camp: { img: "assets/art/splash.jpg", ar: 1518 / 780, scale: 1.2, x: -20, y: -60,
      stars: [{ x: 156, y: 182 }, { x: 144, y: 256 }, { x: 212, y: 256 }, { x: 222, y: 182 }, { x: 282, y: 190 }, { x: 282, y: 250 }, { x: 98, y: 214 }],
      label: null, wander: [],
      spots: GROUND6(548), pet: { x: 52, y: 420 } },
    bedroom: { img: "assets/art/bedroom.jpg", ar: 1686 / 780, scale: 1, x: 0, y: -50,
      stars: [{ x: 146, y: 190 }, { x: 164, y: 258 }, { x: 236, y: 258 }, { x: 256, y: 190 }, { x: 314, y: 212 }, { x: 302, y: 272 }, { x: 64, y: 196 }],
      label: null, wander: [],
      spots: GROUND6(550), pet: { x: 56, y: 430 } }
  };
  /* v3 seasonal dresses of the sea garden (same constellation, label, wander stars and pet as "sea";
     only the painted frame and the ground spots follow each painting) */
  function seaSeason(key, o) {
    var b = PLACE_LAYOUT.sea, L = {};
    for (var k in b) L[k] = b[k];
    for (var j in o) L[j] = o[j];
    L.season = key;
    PLACE_LAYOUT["sea-" + key] = L;
  }
  /* tuned on screenshots (tools/screenshot-v3.py "garden-season-*"): decor on snow / grass / rocks / deck, never on water,
     and clear of the painted characters' feet */
  seaSeason("winter", { img: "assets/art/garden-winter.jpg", ar: 1690 / 780, scale: 1, x: 0, y: -90,
    spots: [{ x: 47, b: 476 }, { x: 47, b: 532 }, { x: 287, b: 476 }, { x: 343, b: 476 }, { x: 287, b: 532 }, { x: 343, b: 532 }] });
  /* ลอยกระทง: the islet fills only the left 2/3 and the characters most of it, so the frame is 1.2x and the
     front row stands on the near rocks; decor a touch smaller so it stays below their feet */
  seaSeason("loykrathong", { img: "assets/art/garden-loykrathong.jpg", ar: 1690 / 780, scale: 1.2, x: -10, y: -238, decorScale: 0.85,
    spots: [{ x: 47, b: 556 }, { x: 106, b: 556 }, { x: 250, b: 500 }, { x: 283, b: 556 }, { x: 165, b: 556 }, { x: 224, b: 556 }] });
  seaSeason("songkran", { img: "assets/art/garden-songkran.jpg", ar: 1690 / 780, scale: 1, x: 0, y: -150, decorScale: 0.85,
    spots: [{ x: 47, b: 548 }, { x: 106, b: 548 }, { x: 287, b: 488 }, { x: 343, b: 488 }, { x: 287, b: 548 }, { x: 343, b: 548 }] });

  function sparkle(x, y, r) {
    var k = r * 0.28;
    return '<path d="M' + x + ' ' + (y - r) + ' Q' + (x + k) + ' ' + (y - k) + ' ' + (x + r) + ' ' + y + ' Q' + (x + k) + ' ' + (y + k) + ' ' + x + ' ' + (y + r) +
      ' Q' + (x - k) + ' ' + (y + k) + ' ' + (x - r) + ' ' + y + ' Q' + (x - k) + ' ' + (y - k) + ' ' + x + ' ' + (y - r) + 'Z" fill="#FFF3C4"/>';
  }

  /* ---------- full scenes ---------- */
  function splashScene() {
    // v2 preview: painted art (codex image_generation), soft gradients for text legibility
    return '<div class="scene paint splash-paint" aria-hidden="true"><div class="shade"></div><div class="fireflies"></div></div>';
  }

  /* st = { place, stars[], wander[], decor:[{id, spot}], unlocked, mode: null|"place"|"move", moving, petImg, petName } */
  function gardenScene(st) {
    var W = 390, H = VB_H, id = "gd";
    var L = PLACE_LAYOUT[st.layout || st.place] || PLACE_LAYOUT[st.place] || PLACE_LAYOUT.sea;
    var lit = st.stars || [], wander = st.wander || [], placed = st.decor || [];
    var iw = W * L.scale, ih = iw * L.ar;
    var s = '<svg class="scene" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMax slice">' + defs(id) +
      '<defs><linearGradient id="gdtopshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A1230" stop-opacity=".7"/><stop offset="1" stop-color="#0A1230" stop-opacity="0"/></linearGradient>' +
      '<clipPath id="petclip"><circle cx="' + L.pet.x + '" cy="' + L.pet.y + '" r="40"/></clipPath></defs>' +
      '<rect width="390" height="' + H + '" fill="#16204A"/>' +
      '<image class="place-img" href="' + L.img + '" onerror="this.style.display=\'none\'" x="' + L.x + '" y="' + L.y + '" width="' + iw + '" height="' + ih + '" preserveAspectRatio="xMidYMin slice"/>' +
      '<rect width="390" height="130" fill="url(#gdtopshade)"/>';

    var P = L.stars;
    s += '<g class="const-lines">';
    CONST.edges.forEach(function (e) {
      var a = P[e[0]], b = P[e[1]], on = lit.indexOf(e[0]) > -1 && lit.indexOf(e[1]) > -1;
      s += on ? '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="#FFF3C4" stroke-opacity="0.75" stroke-width="2" stroke-linecap="round"/>'
        : '<line class="guide" x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="#DDE0F5" stroke-opacity="0.32" stroke-width="1.5" stroke-dasharray="3 6"/>';
    });
    s += '</g>';

    var unlocked = st.unlocked == null ? 4 : st.unlocked;
    P.forEach(function (p, i) {
      var isLit = lit.indexOf(i) > -1, locked = i >= unlocked;
      /* while placing/moving decor the stars rest (not tappable) so only the ground spots are targets */
      s += '<g class="slot ' + (isLit ? "lit" : locked ? "locked" : "open") + (st.mode ? ' resting" aria-hidden="true' : '" data-star="' + i + '" role="button" tabindex="0') + '" aria-label="' +
        (isLit ? "ดาวดวงที่ " + (i + 1) + " จุดแล้ว" : locked ? "ดาวดวงที่ " + (i + 1) + " ยังล็อก" : "จุดดาวดวงที่ " + (i + 1) + " ใช้ 10 แสง") + '">' +
        '<circle class="hit" cx="' + p.x + '" cy="' + p.y + '" r="24" fill="transparent"/>';
      if (isLit) s += '<circle cx="' + p.x + '" cy="' + p.y + '" r="22" fill="url(#' + id + 'sglow)"/>' + sparkle(p.x, p.y, 11) + '<circle cx="' + p.x + '" cy="' + p.y + '" r="2.6" fill="#fff"/>';
      else if (locked) s += '<circle cx="' + p.x + '" cy="' + p.y + '" r="9" fill="#0E1B3D" fill-opacity=".5" stroke="#DDE0F5" stroke-opacity="0.8" stroke-width="1.5" stroke-dasharray="2 3"/>' +
        '<path transform="translate(' + (p.x - 4) + ' ' + (p.y - 5) + ')" d="M1.5 4.5h5v4.5h-5z M2.5 4.5v-1.5a1.5 1.5 0 0 1 3 0v1.5" fill="none" stroke="#DDE0F5" stroke-width="1.1"/>';
      else s += '<circle cx="' + p.x + '" cy="' + p.y + '" r="15" fill="#0E1B3D" fill-opacity=".35"/><circle class="pulse" cx="' + p.x + '" cy="' + p.y + '" r="13" fill="none" stroke="#FFD27A" stroke-width="2.2" stroke-dasharray="4 3"/><circle cx="' + p.x + '" cy="' + p.y + '" r="3.4" fill="#FFD27A"/>';
      s += '</g>';
    });
    if (lit.length && L.label) {
      s += '<g class="const-label"><rect x="' + (L.label.x - 104) + '" y="' + L.label.y + '" width="208" height="34" rx="17" fill="#0B1433" fill-opacity="0.88" stroke="#FFF3C4" stroke-opacity="0.45"/>' +
        '<text x="' + L.label.x + '" y="' + (L.label.y + 23) + '" text-anchor="middle" font-size="16" font-weight="600" fill="#FFF3C4">' + CONST.name + ' ' + lit.length + '/7</text></g>';
    }
    L.wander.forEach(function (p, i) {
      var isLit = wander.indexOf(i) > -1;
      s += '<g class="slot ' + (isLit ? "lit" : "open small") + '" data-wander="' + i + '" role="button" tabindex="0" aria-label="' + (isLit ? "ดาวเล็กจุดแล้ว" : "จุดดาวเล็ก ใช้ 10 แสง") + '">' +
        '<circle class="hit" cx="' + p.x + '" cy="' + p.y + '" r="24" fill="transparent"/>' +
        (isLit ? '<circle cx="' + p.x + '" cy="' + p.y + '" r="16" fill="url(#' + id + 'sglow)"/>' + sparkle(p.x, p.y, 7)
          : '<circle cx="' + p.x + '" cy="' + p.y + '" r="9" fill="#0E1B3D" fill-opacity=".35" stroke="#FFD27A" stroke-opacity="0.85" stroke-width="1.6" stroke-dasharray="2 3"/>') + '</g>';
    });

    // pet: round painted portrait + name pill (tap → pet page)
    var pt = L.pet;
    s += '<g class="pet-badge" data-go="pet" role="button" tabindex="0" aria-label="แมวน้อย ' + st.petName + ' ดูรายละเอียด">' +
      '<circle cx="' + pt.x + '" cy="' + pt.y + '" r="44" fill="#0B1433" fill-opacity=".55"/>' +
      '<rect x="' + (pt.x - 41) + '" y="' + (pt.y - 41) + '" width="82" height="82" rx="41" fill="#1C2858"/>' +
      /* clip on a wrapper so the (animated) portrait breathes inside a still round frame */
      '<g clip-path="url(#petclip)"><image class="pet-img" href="' + st.petImg + '" x="' + (pt.x - 46) + '" y="' + (pt.y - 50) + '" width="92" height="92" preserveAspectRatio="xMidYMid slice"/></g>' +
      '<circle cx="' + pt.x + '" cy="' + pt.y + '" r="40" fill="none" stroke="#FFE3B8" stroke-width="3"/>' +
      '<rect x="' + (pt.x - 40) + '" y="' + (pt.y + 34) + '" width="80" height="28" rx="14" fill="#0B1433" fill-opacity=".92" stroke="#FFE3B8" stroke-opacity=".6"/>' +
      '<text x="' + pt.x + '" y="' + (pt.y + 54) + '" text-anchor="middle" font-size="16" font-weight="600" fill="#FFF3C4">' + st.petName + '</text></g>';

    // decor on this place's ground spots (sorted back → front)
    var used = {};
    placed.slice().sort(function (a, b) { return L.spots[a.spot].b - L.spots[b.spot].b; }).forEach(function (d) {
      var sp = L.spots[d.spot]; if (!sp) return; used[d.spot] = 1;
      var di = DECOR_IMG[d.id], h = di[0] * (L.decorScale || 1), w = h * di[1];   /* v3: busier seasonal paintings draw decor a little smaller */
      var moving = st.mode === "move" && st.moving === d.id;
      /* while placing/moving, placed decor rests (not tappable) so only the highlighted spots are targets */
      s += (st.mode ? '<g class="decor-in resting' + (moving ? " moving" : "") + '" aria-hidden="true" style="pointer-events:none">'
        : '<g class="decor-in' + (moving ? " moving" : "") + '" data-placed="' + d.id + '" role="button" tabindex="0" aria-label="' + nameOf(d.id) + ' แตะเพื่อย้ายหรือเก็บคืน">') +
        '<rect class="hit" x="' + (sp.x - 24) + '" y="' + (sp.b - 48) + '" width="48" height="48" fill="transparent"/>' + /* fixed 48x48 target at the item's base keeps >=8px spacing (WCAG 2.5.8) */
        '<ellipse cx="' + sp.x + '" cy="' + sp.b + '" rx="' + (w * 0.55) + '" ry="5" fill="#050A1E" opacity=".45"/>' +
        '<image href="' + decorSrc(d.id) + '" class="decor-paint" x="' + (sp.x - w / 2) + '" y="' + (sp.b - h) + '" width="' + w + '" height="' + h + '" preserveAspectRatio="xMidYMax meet"/></g>';
    });
    // highlighted free spots while placing / moving
    if (st.mode) {
      var mine = st.mode === "move" ? (placed.filter(function (d) { return d.id === st.moving; })[0] || {}).spot : -1;
      L.spots.forEach(function (sp, i) {
        if (i === mine || (st.mode === "place" && used[i])) return;
        s += '<g class="spot" data-spot="' + i + '" role="button" tabindex="0" aria-label="' + (used[i] ? "สลับที่กับของตรงนี้" : "วางตรงนี้") + ' จุดที่ ' + (i + 1) + '">' +
          '<circle cx="' + sp.x + '" cy="' + (sp.b - 22) + '" r="24" fill="#0B1433" fill-opacity=".55" stroke="#FFD27A" stroke-width="3" stroke-dasharray="6 4"/>' +
          '<path d="M' + (sp.x - 9) + ' ' + (sp.b - 22) + ' h18 M' + sp.x + ' ' + (sp.b - 31) + ' v18" stroke="#FFF3C4" stroke-width="3.5" stroke-linecap="round"/></g>';
      });
    }
    s += '</svg>';
    return s;
  }
  function nameOf(id) { return (DECOR.filter(function (x) { return x.id === id; })[0] || {}).name || id; }

  function miniConst(c, litN, size) {
    var st = c.stars, xs = st.map(function (p) { return p.x; }), ys = st.map(function (p) { return p.y; });
    var pad = 16, minx = Math.min.apply(0, xs) - pad, miny = Math.min.apply(0, ys) - pad, w = Math.max.apply(0, xs) - minx + pad, h = Math.max.apply(0, ys) - miny + pad;
    var s = '<svg viewBox="' + minx + ' ' + miny + ' ' + w + ' ' + h + '" aria-hidden="true">';
    c.edges.forEach(function (e) {
      var a = st[e[0]], b = st[e[1]], on = e[0] < litN && e[1] < litN;
      s += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="#FFF3C4" stroke-opacity="' + (on ? .8 : .3) + '" stroke-width="3"' + (on ? "" : ' stroke-dasharray="5 7"') + '/>';
    });
    st.forEach(function (p, i) { s += i < litN ? sparkle(p.x, p.y, 11) : '<circle cx="' + p.x + '" cy="' + p.y + '" r="6" fill="#8D94C4"/>'; });
    return s + '</svg>';
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
  function thumb(id) {
    if (id === 'waves') return '<img src="assets/art/card-night-island.jpg" alt="" width="72" height="72">';
    return '<svg viewBox="0 0 64 64" aria-hidden="true">' + THUMBS[id] + '</svg>';
  }

  window.NLArt = { DECOR_IMG: DECOR_IMG, splashScene: splashScene, gardenScene: gardenScene, morningArt: morningArt, thumb: thumb, decorIcon: decorIcon, DECOR: DECOR, CONST: CONST, CONST2: CONST2, PLACE_LAYOUT: PLACE_LAYOUT, sparkle: sparkle, miniConst: miniConst };
})();
