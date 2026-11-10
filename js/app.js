/* Nightlight demo — app logic (hash router + localStorage state). ทุกตัวเลขการนอนเป็นข้อมูลตัวอย่าง */
(function () {
  var KEY = "nightlight-demo-v1";
  var STAR_COST = 10, STREAK = 4, REST_USED = 2, READ_REWARD = 5;
  var NIGHTS = window.NL_NIGHTS, STORIES = window.NL_STORIES, Art = window.NLArt;
  var LAST = NIGHTS[NIGHTS.length - 1];
  var LAST_LIGHT = window.NL_lightFor(LAST); // {base:100, bonus:20, total:120}

  function fresh() {
    return { balance: LAST_LIGHT.total, stars: [], wander: [], decor: [], gift: true, connected: {}, read: {} };
  }
  var state = load();
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s.balance === "number") return s; } catch (e) {}
    return fresh();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function reset() { state = fresh(); save(); toast("รีเซ็ตเดโมแล้ว"); location.hash = "#splash"; route(); }

  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast"), toastT;
  function toast(msg, warn) {
    toastEl.textContent = msg; toastEl.className = "toast show" + (warn ? " warn" : "");
    toastEl.style.bottom = document.querySelector(".tray") ? "236px" : "112px";
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.className = "toast"; }, 1800);
  }
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- icons (simple generic glyphs; no brand logos) ---------- */
  function ic(d, extra) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || "") + '>' + d + '</svg>'; }
  var I = {
    spark: '<svg class="spark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 Q13.6 10.4 22 12 Q13.6 13.6 12 22 Q10.4 13.6 2 12 Q10.4 10.4 12 2Z" fill="#FFD27A"/></svg>',
    back: ic('<path d="M15 5 8 12l7 7"/>'),
    chev: ic('<path d="m9 6 6 6-6 6"/>', ' class="chev"'),
    info: ic('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
    lock: ic('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    reset: ic('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>'),
    play: ic('<path d="M8 5.5v13l10-6.5z" fill="currentColor"/>'),
    pause: ic('<path d="M8 5v14M16 5v14" stroke-width="3"/>'),
    heart: ic('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
    garden: ic('<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z"/><path d="M4 20h16"/><path d="M7 20v-3M17 20v-2"/>'),
    book: ic('<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z"/>'),
    chart: ic('<path d="M5 20V11M10 20V6M15 20v-7M20 20V9"/>'),
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4z" fill="#A99BEA"/></svg>',
    dot: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="#6E76A8"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 Q13.6 10.4 22 12 Q13.6 13.6 12 22 Q10.4 13.6 2 12 Q10.4 10.4 12 2Z" fill="#FFD27A"/></svg>'
  };
  var SRC_ICONS = {
    apple: ic('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M8 12h2l1-2 2 4 1-2h2"/>'),
    band: ic('<rect x="8" y="3" width="8" height="18" rx="4"/><path d="M8 12h8"/>'),
    watch: ic('<circle cx="12" cy="12" r="5.5"/><path d="M9.5 6.8 10 3h4l.5 3.8M9.5 17.2 10 21h4l.5-3.8M12 10v2l1.5 1"/>'),
    square: ic('<rect x="6.5" y="6.5" width="11" height="11" rx="3"/><path d="M9 6.5 9.5 3h5l.5 3.5M9 17.5 9.5 21h5l.5-3.5M9 12h1.5l1-2 1.5 4 1-2H15"/>'),
    link: ic('<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.3 11 15.7 7M8.3 13l7.4 4"/>'),
    compass: ic('<circle cx="12" cy="12" r="8.5"/><path d="m15 9-2 4-4 2 2-4z"/>'),
    ring: ic('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="4"/>'),
    pencil: ic('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>')
  };
  var SOURCES = [
    { id: "apple", icon: "apple", name: "Apple Health", sub: "iPhone / Apple Watch", note: "iPhone อย่างเดียวก็ใช้ได้ ได้<span style=\"white-space:nowrap\">เวลาเข้านอน-ตื่น</span>" },
    { id: "whoop", icon: "band", name: "WHOOP", note: "ผ่าน Apple Health หรือเชื่อมบัญชี WHOOP" },
    { id: "samsung", icon: "watch", name: "Samsung Health", sub: "Galaxy Watch", note: "ซิงก์ผ่าน Health Connect (Android)" },
    { id: "xiaomi", icon: "square", name: "Xiaomi / Mi Fitness / Zepp", sub: "Amazfit", note: "ซิงก์ผ่าน Health Connect (Android) หรือ Apple Health (iOS)" },
    { id: "google", icon: "link", name: "Google Health Connect / Fitbit", note: "ผ่าน Health Connect (Android) หรือบัญชี Google" },
    { id: "garmin", icon: "compass", name: "Garmin Connect", note: "ซิงก์ผ่าน Apple Health (iOS)" },
    { id: "oura", icon: "ring", name: "Oura", note: "ผ่าน Apple Health หรือ Health Connect" },
    { id: "manual", icon: "pencil", name: "กรอกเอง", note: "กรอกเวลาเองได้ (ได้แสงน้อยลงนิดหน่อย)" }
  ];

  function fmtHM(m) { var h = Math.floor(m / 60), mm = m % 60; return h + " ชม." + (mm ? " " + mm + " นาที" : ""); }
  function tabbar(on) {
    var t = [["garden", "สวน", I.garden], ["read", "อ่านก่อนนอน", I.book], ["stats", "สถิติ", I.chart]];
    return '<nav class="tabbar" aria-label="เมนูหลัก">' + t.map(function (x) {
      return '<a href="#' + x[0] + '" class="' + (on === x[0] ? "on" : "") + '"' + (on === x[0] ? ' aria-current="page"' : "") + '>' + x[2] + '<span>' + x[1] + '</span></a>';
    }).join("") + '</nav>';
  }

  /* ---------- screens ---------- */
  var screens = {};

  screens.splash = function () {
    return '<section class="screen splash">' + Art.splashScene() +
      '<span class="tag">เดโม</span>' +
      '<div class="top"><svg class="logo" viewBox="0 0 48 48" aria-hidden="true"><path d="M30 8a16 16 0 1 0 12 26A13 13 0 0 1 30 8z" fill="#F6E3A1"/><path d="M36 10 Q36.8 14.2 41 15 Q36.8 15.8 36 20 Q35.2 15.8 31 15 Q35.2 14.2 36 10Z" fill="#FFF3C4"/></svg>' +
      '<h1>Nightlight</h1><p class="th-name">นอนได้พลัง</p>' +
      '<p class="tagline">นอนดี แสงก็มา</p>' +
      '<p class="sub">เข้านอนตรงเวลา แล้วฟ้าของคุณ<br>จะสว่างขึ้นทีละดวง</p></div>' +
      '<div class="bottom"><button class="btn primary" data-go="connect">เริ่มเลย</button>' +
      '<p class="fine">เกมเล็ก ๆ ที่ช่วยสร้างนิสัยนอนให้สม่ำเสมอ</p></div></section>';
  };

  screens.connect = function () {
    return '<section class="screen connect">' +
      '<div class="topbar"><a class="icon-btn" href="#splash" aria-label="ย้อนกลับ">' + I.back + '</a><h1 class="title">เชื่อมข้อมูลการนอน</h1><span class="tag">เดโม</span></div>' +
      '<div class="banner">' + I.info + '<span>เลือกแอปหรือนาฬิกาที่ใช้อยู่ (เลือกได้หลายอัน)<br><b>เดโมนี้ใช้ข้อมูลตัวอย่าง ยังไม่ได้เชื่อมจริง</b></span></div>' +
      '<div class="sources scroll">' + SOURCES.map(function (s) {
        var on = !!state.connected[s.id];
        return '<div class="src"><span class="ico">' + SRC_ICONS[s.icon] + '</span><div class="txt">' +
          '<div class="name">' + s.name + (s.sub ? ' <span class="note" style="font-weight:400">' + s.sub + '</span>' : "") + '</div>' +
          '<div class="note line">' + (on ? '<span class="ok">เชื่อมแล้ว ✓</span> · ' : "") + s.note + '</div></div>' +
          '<button class="switch" role="switch" aria-checked="' + on + '" aria-label="เชื่อม ' + s.name + '" data-src="' + s.id + '"></button></div>';
      }).join("") + '</div>' +
      '<div class="foot"><p class="privacy">' + I.lock + 'ข้อมูลการนอนเก็บในเครื่องคุณเท่านั้น</p>' +
      '<button class="btn primary" data-go="morning">ต่อไป</button></div></section>';
  };

  function nightStrip() {
    return '<div class="nights">' + NIGHTS.map(function (n, i) {
      var g = n.status === "ontime" ? I.star : n.status === "rest" ? I.moon : I.dot;
      return '<div class="n ' + n.status + (i === NIGHTS.length - 1 ? " last" : "") + '" title="' + n.date + '"><span class="dot">' + g + '</span>' + n.day + '</div>';
    }).join("") + '</div>' +
      '<div class="legend"><span><i style="background:#FFD27A"></i>ตรงเวลา</span><span><i style="background:#A99BEA"></i>คืนพัก ' + REST_USED + '/2</span><span><i style="background:#6E76A8"></i>เข้านอนช้า</span></div>';
  }

  screens.morning = function () {
    return '<section class="screen morning">' +
      '<div class="art">' + Art.morningArt() + '<div class="greet"><h1>อรุณสวัสดิ์</h1><p>วันพุธที่ 11 พ.ย. · เมื่อคืนคุณได้แสงมาแล้ว</p></div></div>' +
      '<div class="body">' +
      '<div class="card"><div class="sleep-row"><div><div class="sleep-big">7<small>ชม.</small>12<small>นาที</small></div>' +
      '<div class="sleep-time">เข้านอน ' + LAST.bed + ' – ตื่น ' + LAST.wake + '</div></div>' +
      '<span class="chip">' + I.heart + 'Apple Health · ข้อมูลตัวอย่าง</span></div>' +
      '<div class="breakdown"><div class="bd"><span>นอนครบ 7 ชม.</span><b>+' + LAST_LIGHT.base + '</b></div>' +
      '<div class="bd"><span>เข้านอนตรงเวลา (เป้า 23:00 ±30 นาที)</span><b>+' + LAST_LIGHT.bonus + '</b></div>' +
      '<div class="bd total"><span>รวมแสงเช้านี้</span><span class="num"><span id="count">0</span><small>แสง</small></span></div></div>' +
      '<p class="note">เกิน 9 ชม. ไม่ได้แสงเพิ่ม · คืนที่นอนน้อยก็แค่ได้แสงน้อยลง</p></div>' +
      '<div class="card"><div class="streak-head">เข้านอนตรงเวลาติดกัน ' + STREAK + ' คืน <span class="tag">' + STREAK + ' ✦</span></div><p class="demo-label">7 คืนล่าสุด · ข้อมูลตัวอย่าง (เดโม)</p>' + nightStrip() + '</div>' +
      '<div class="card gift"><span class="gico">' + Art.decorIcon("lantern") + '</span><div><b>ของขวัญเช้านี้: โคมกระดาษ</b><span>วางในสวนได้เลย ไม่ต้องใช้แสง</span></div></div>' +
      '</div><div class="foot"><button class="btn primary" data-go="garden">ไปจุดดาว</button></div></section>';
  };
  function countUp() {
    var el = document.getElementById("count"); if (!el) return;
    var target = LAST_LIGHT.total;
    if (reduced) { el.textContent = target; return; }
    var t0 = null, dur = 1400;
    function step(t) {
      if (!t0) t0 = t; var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e);
      if (p < 1 && document.body.contains(el)) requestAnimationFrame(step); else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  screens.garden = function () {
    return '<section class="screen garden">' +
      '<div class="stage" id="stage">' + Art.gardenScene({ stars: state.stars, wander: state.wander, decor: state.decor, streak: STREAK }) +
      '<div class="hud"><span class="balance" id="bal" aria-live="polite">' + I.star + '<span class="num">' + state.balance + '</span> แสง</span>' +
      '<span class="sp"></span><span class="tag">เดโม</span><button class="icon-btn" data-reset aria-label="รีเซ็ตเดโม" title="รีเซ็ตเดโม">' + I.reset + '</button></div>' +
      '<p class="hint">แตะวงดาวเพื่อจุด · ดวงละ ' + STAR_COST + ' แสง</p></div>' +
      '<div class="tray"><div class="tray-head">ของแต่งสวน <span>แตะเพื่อวางในสวน</span></div><div class="tray-list" id="tray">' + trayItems() + '</div></div>' +
      tabbar("garden") + '</section>';
  };
  function trayItems() {
    return Art.DECOR.map(function (d) {
      var placed = state.decor.indexOf(d.id) > -1, gifted = d.id === "lantern" && state.gift && !placed;
      return '<button class="item' + (placed ? " placed" : "") + (gifted ? " gifted" : "") + '" data-decor="' + d.id + '" aria-label="' + d.name + (placed ? " วางแล้ว" : gifted ? " ของขวัญ" : " " + d.price + " แสง") + '">' +
        Art.decorIcon(d.id) + '<span class="nm">' + d.name + '</span><span class="pr">' + (placed ? "วางแล้ว ✓" : gifted ? "ของขวัญ" : "✦ " + d.price) + '</span></button>';
    }).join("");
  }
  function spend(cost) {
    if (state.balance < cost) { toast("แสงไม่พอ ไว้คืนนี้นอนเก็บแสงเพิ่มนะ", true); return false; }
    state.balance -= cost; return true;
  }
  function rerenderGarden() {
    var stage = document.getElementById("stage");
    var svg = stage.querySelector("svg.scene");
    var tmp = document.createElement("div");
    tmp.innerHTML = Art.gardenScene({ stars: state.stars, wander: state.wander, decor: state.decor, streak: STREAK });
    stage.replaceChild(tmp.firstChild, svg);
    var bal = document.getElementById("bal"); bal.querySelector(".num").textContent = state.balance;
    bal.classList.remove("bump"); void bal.offsetWidth; bal.classList.add("bump");
    var tray = document.getElementById("tray"), sl = tray.scrollLeft; tray.innerHTML = trayItems(); tray.scrollLeft = sl;
    save();
  }
  function lightStar(i) {
    if (state.stars.indexOf(i) > -1) { toast("ดาวดวงนี้สว่างอยู่แล้ว"); return; }
    if (i >= STREAK) { toast("นอนตรงเวลาอีก " + (i - STREAK + 1) + " คืน เพื่อปลดล็อกดาวดวงนี้"); return; }
    if (!spend(STAR_COST)) return;
    state.stars.push(i); rerenderGarden();
    var body = [0, 1, 2, 3].every(function (k) { return state.stars.indexOf(k) > -1; });
    toast(body && i < 4 ? "ต่อเป็นกลุ่มดาวถ้วยชาแล้ว ✦" : "จุดดาวแล้ว −" + STAR_COST + " แสง");
  }
  function lightWander(i) {
    if (state.wander.indexOf(i) > -1) { toast("ดาวดวงนี้สว่างอยู่แล้ว"); return; }
    if (!spend(STAR_COST)) return;
    state.wander.push(i); rerenderGarden(); toast("จุดดาวแล้ว −" + STAR_COST + " แสง");
  }
  function placeDecor(id) {
    var d = Art.DECOR.filter(function (x) { return x.id === id; })[0];
    if (state.decor.indexOf(id) > -1) { toast(d.name + " อยู่ในสวนแล้ว"); return; }
    var gifted = id === "lantern" && state.gift;
    if (!gifted && !spend(d.price)) return;
    if (gifted) state.gift = false;
    state.decor.push(id); rerenderGarden();
    toast(gifted ? "วางโคมกระดาษแล้ว (ของขวัญ)" : "วาง" + d.name + "แล้ว −" + d.price + " แสง");
  }

  screens.read = function () {
    return '<section class="screen read"><div class="head"><h1>อ่านก่อนนอน 5 นาที</h1><p class="lead">อ่านเรื่องสั้น ๆ ช้า ๆ แล้ววางมือถือลงได้เลย</p></div>' +
      '<div class="stories scroll">' + STORIES.map(function (s) {
        return '<a class="story" href="#reader/' + s.id + '"><span class="th">' + Art.thumb(s.thumb) + '</span><span class="tx"><h3>' + s.title + '</h3><p>“' + s.teaser + '”</p>' +
          '<div class="meta">อ่าน ' + s.minutes + ' นาที' + (state.read[s.id] ? ' · อ่านแล้ว ✓' : "") + '</div></span>' + I.chev + '</a>';
      }).join("") + '</div>' + tabbar("read") + '</section>';
  };

  var timer = { left: 300, running: false, iv: null };
  function stopTimer() { clearInterval(timer.iv); timer.iv = null; timer.running = false; }
  screens.reader = function (id) {
    var s = STORIES.filter(function (x) { return x.id === id; })[0] || STORIES[0];
    var done = !!state.read[s.id];
    var body = s.body.map(function (p, i) { return '<p' + (i === s.body.length - 1 ? ' class="end"' : "") + '>' + p + '</p>'; }).join("");
    return '<section class="screen reader" data-id="' + s.id + '">' +
      '<div class="topbar"><a class="icon-btn" href="#read" aria-label="กลับไปหน้ารายการ">' + I.back + '</a><span class="title">อ่านก่อนนอน · ' + s.minutes + ' นาที</span><span style="width:44px"></span></div>' +
      '<div class="timer"><div class="ring"><svg viewBox="0 0 88 88"><circle cx="44" cy="44" r="40" fill="none" stroke="rgba(246,227,161,.14)" stroke-width="4"/>' +
      '<circle id="ringc" cx="44" cy="44" r="40" fill="none" stroke="#F6E3A1" stroke-width="4" stroke-linecap="round" stroke-dasharray="251.3" stroke-dashoffset="0"/></svg><span class="t" id="tleft">5:00</span></div>' +
      '<div class="tl"><b>พักสายตา 5 นาที</b>อ่านจบแล้วหลับตาต่อได้เลย</div>' +
      '<button class="icon-btn" id="tbtn" aria-label="หยุดชั่วคราว">' + I.pause + '</button></div>' +
      '<article class="reading scroll"><h1>' + s.title + '</h1>' + body + '</article>' +
      '<div class="foot"><button class="btn ' + (done ? "done" : "primary") + '" id="gn">' + (done ? "ฝันดีนะ · ได้แสงแล้ว ✓" : "ฝันดีนะ  " + I.spark.replace('fill="#FFD27A"', 'fill="#1A1633"') + " +" + READ_REWARD + " แสง") + '</button></div></section>';
  };
  function startReader() {
    stopTimer(); timer.left = 300; renderTimer(); timer.running = true;
    timer.iv = setInterval(tick, 1000); setTBtn();
  }
  function tick() {
    if (!document.getElementById("tleft")) { stopTimer(); return; }
    timer.left = Math.max(0, timer.left - 1); renderTimer();
    if (timer.left === 0) { stopTimer(); setTBtn(); toast("ครบ 5 นาทีแล้ว วางมือถือลงได้เลยนะ"); }
  }
  function renderTimer() {
    var t = document.getElementById("tleft"), c = document.getElementById("ringc"); if (!t) return;
    t.textContent = Math.floor(timer.left / 60) + ":" + String(timer.left % 60).padStart(2, "0");
    c.setAttribute("stroke-dashoffset", (251.3 * (1 - timer.left / 300)).toFixed(1));
  }
  function setTBtn() {
    var b = document.getElementById("tbtn"); if (!b) return;
    b.innerHTML = timer.running ? I.pause : I.play; b.setAttribute("aria-label", timer.running ? "หยุดชั่วคราว" : "เล่นต่อ");
  }
  function toggleTimer() {
    if (timer.running) { stopTimer(); }
    else { if (timer.left === 0) timer.left = 300; timer.running = true; timer.iv = setInterval(tick, 1000); renderTimer(); }
    setTBtn();
  }

  screens.stats = function () {
    var total = NIGHTS.reduce(function (a, n) { return a + window.NL_lightFor(n).total; }, 0);
    var avg = Math.round(NIGHTS.reduce(function (a, n) { return a + n.mins; }, 0) / NIGHTS.length);
    var ontime = NIGHTS.filter(function (n) { return n.status === "ontime"; }).length;
    return '<section class="screen stats"><div class="head"><div><h1>สถิติสัปดาห์นี้</h1><p class="range">คืนวันที่ 4–10 พ.ย. 2026</p></div><span class="tag">เดโม</span></div>' +
      '<div class="body">' +
      '<div class="card chart"><div class="chart-title">ชั่วโมงนอน 7 คืน <span class="demo-label">ข้อมูลตัวอย่าง (เดโม)</span></div>' + chartSVG() +
      '<div class="legend"><span><i style="background:#FFD27A"></i>ตรงเวลา</span><span><i style="background:#A99BEA"></i>คืนพัก</span><span><i style="background:#6E76A8"></i>เข้านอนช้า</span><span><i class="dash"></i>7 ชม. = แสงเต็ม</span></div>' +
      '<p class="chart-detail" id="cdetail">แตะแท่งเพื่อดูแต่ละคืน</p></div>' +
      '<div class="tiles">' +
      '<div class="tile"><div class="k">นอนเฉลี่ย</div><div class="v">' + Math.floor(avg / 60) + '<small>ชม.</small> ' + (avg % 60) + '<small>นาที</small></div></div>' +
      '<div class="tile"><div class="k">เข้านอนตรงเวลา</div><div class="v">' + ontime + '<small>/7 คืน</small></div></div>' +
      '<div class="tile"><div class="k">แสงจากการนอนสัปดาห์นี้</div><div class="v light">' + total + '<small>แสง</small></div></div>' +
      '<div class="tile"><div class="k">คืนพักที่ใช้ (สถิติไม่หาย)</div><div class="v">' + REST_USED + '<small>/2 คืน</small></div></div></div>' +
      '<div class="card constel">' + miniConst() + '<div class="tx"><b>กลุ่มดาวถ้วยชา ' + STREAK + '/7 คืน</b><span>เข้านอนตรงเวลาอีก 3 คืน ก็ครบทั้งกลุ่ม</span>' +
      '<div class="progress"><i style="width:' + (STREAK / 7 * 100).toFixed(1) + '%"></i></div></div></div>' +
      '<div class="foot"><span class="demo-label">ตัวเลขทั้งหมดเป็นข้อมูลตัวอย่าง</span><button class="linkbtn" data-reset>รีเซ็ตเดโม</button></div>' +
      '</div>' + tabbar("stats") + '</section>';
  };
  function chartSVG() {
    var W = 326, H = 176, top = 20, bot = 28, left = 30, maxH = 9;
    var ph = H - top - bot, bw = 22, step = (W - left - 8) / 7;
    var y = function (h) { return top + ph * (1 - h / maxH); };
    var col = { ontime: "#FFD27A", rest: "#A99BEA", late: "#6E76A8" };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="กราฟชั่วโมงนอน 7 คืน ข้อมูลตัวอย่าง">';
    [0, 3, 6, 9].forEach(function (h) {
      s += '<line x1="' + left + '" x2="' + (W - 4) + '" y1="' + y(h) + '" y2="' + y(h) + '" stroke="rgba(185,190,223,.12)"/>' +
        '<text x="' + (left - 8) + '" y="' + (y(h) + 4) + '" text-anchor="end" font-size="11" fill="#9399C6">' + h + '</text>';
    });
    s += '<line x1="' + left + '" x2="' + (W - 4) + '" y1="' + y(7) + '" y2="' + y(7) + '" stroke="#FFF3C4" stroke-opacity=".55" stroke-dasharray="4 4"/>';
    NIGHTS.forEach(function (n, i) {
      var cx = left + step * i + step / 2, h = n.mins / 60, yt = y(h), x = cx - bw / 2, base = y(0);
      var r = 4, hh = base - yt;
      s += '<g class="bar" data-i="' + i + '" tabindex="0" role="button" aria-label="' + n.date + ' ' + fmtHM(n.mins) + '"><rect x="' + (cx - step / 2) + '" y="' + top + '" width="' + step + '" height="' + (ph + bot) + '" fill="transparent"/>' +
        '<path d="M' + x + ' ' + base + ' V' + (yt + r) + ' Q' + x + ' ' + yt + ' ' + (x + r) + ' ' + yt + ' H' + (x + bw - r) + ' Q' + (x + bw) + ' ' + yt + ' ' + (x + bw) + ' ' + (yt + r) + ' V' + base + 'Z" fill="' + col[n.status] + '"' + (i === 6 ? ' stroke="#F4F1FF" stroke-width="2"' : '') + '/>' + glyph(n.status, cx, base - 12) +
        '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" font-size="12" fill="' + (i === 6 ? "#F4F1FF" : "#9399C6") + '"' + (i === 6 ? ' font-weight="600"' : "") + '>' + n.day + '</text></g>';
      if (i === 6) s += '<text x="' + cx + '" y="' + (yt - 6) + '" text-anchor="middle" font-size="11" font-weight="600" fill="#F4F1FF">7:12</text>';
    });
    return s + '</svg>';
  }
  function glyph(st, x, y) {
    if (st === "ontime") return '<path transform="translate(' + x + ' ' + y + ') scale(.32) translate(-12 -12)" d="M12 2 Q13.6 10.4 22 12 Q13.6 13.6 12 22 Q10.4 13.6 2 12 Q10.4 10.4 12 2Z" fill="#1A1633"/>';
    if (st === "rest") return '<path transform="translate(' + x + ' ' + y + ') scale(.36) translate(-12 -12)" d="M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4z" fill="#1A1633"/>';
    return '<circle cx="' + x + '" cy="' + y + '" r="2.2" fill="#1A1633"/>';
  }
  function miniConst() {
    var st = Art.CONST.stars, xs = st.map(function (p) { return p.x; }), ys = st.map(function (p) { return p.y; });
    var minx = Math.min.apply(0, xs) - 12, miny = Math.min.apply(0, ys) - 12, w = Math.max.apply(0, xs) - minx + 12, h = Math.max.apply(0, ys) - miny + 12;
    var s = '<svg viewBox="' + minx + ' ' + miny + ' ' + w + ' ' + h + '" aria-hidden="true">';
    Art.CONST.edges.forEach(function (e) {
      var a = st[e[0]], b = st[e[1]], on = e[0] < STREAK && e[1] < STREAK;
      s += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="#FFF3C4" stroke-opacity="' + (on ? .7 : .18) + '" stroke-width="4"' + (on ? "" : ' stroke-dasharray="6 8"') + '/>';
    });
    st.forEach(function (p, i) { s += i < STREAK ? Art.sparkle(p.x, p.y, 16) : '<circle cx="' + p.x + '" cy="' + p.y + '" r="7" fill="#6E76A8"/>'; });
    return s + '</svg>';
  }

  /* ---------- router ---------- */
  function route() {
    stopTimer();
    var h = (location.hash || "#splash").slice(1), parts = h.split("/"), name = parts[0];
    if (!screens[name]) name = "splash";
    app.innerHTML = screens[name](parts[1]);
    document.title = "Nightlight · " + ({ splash: "นอนได้พลัง", connect: "เชื่อมข้อมูลการนอน", morning: "อรุณสวัสดิ์", garden: "สวนดาว", read: "อ่านก่อนนอน", reader: "กำลังอ่าน", stats: "สถิติ" }[name]) + " (เดโม)";
    if (name === "morning") countUp();
    if (name === "reader") startReader();
  }
  window.addEventListener("hashchange", route);

  app.addEventListener("click", function (e) {
    var t = e.target.closest("[data-go],[data-src],[data-star],[data-wander],[data-decor],[data-reset],#tbtn,#gn,.bar");
    if (!t) return;
    if (t.dataset.go) { location.hash = "#" + t.dataset.go; return; }
    if (t.hasAttribute("data-reset")) { reset(); return; }
    if (t.dataset.src) {
      var id = t.dataset.src, on = !state.connected[id];
      state.connected[id] = on; save();
      var row = t.closest(".src"), note = row.querySelector(".line"), src = SOURCES.filter(function (s) { return s.id === id; })[0];
      t.setAttribute("aria-checked", on);
      note.innerHTML = (on ? '<span class="ok">เชื่อมแล้ว ✓</span> · ' : "") + src.note;
      if (on) toast("เชื่อม " + src.name + " แล้ว (จำลอง)");
      return;
    }
    if (t.dataset.star) { lightStar(+t.dataset.star); return; }
    if (t.dataset.wander) { lightWander(+t.dataset.wander); return; }
    if (t.dataset.decor) { placeDecor(t.dataset.decor); return; }
    if (t.id === "tbtn") { toggleTimer(); return; }
    if (t.id === "gn") {
      var sid = t.closest(".reader").dataset.id;
      if (state.read[sid]) { toast("ฝันดีนะ ✦"); return; }
      state.read[sid] = true; state.balance += READ_REWARD; save();
      t.className = "btn done"; t.textContent = "ฝันดีนะ · ได้แสงแล้ว ✓";
      toast("ฝันดีนะ ได้ +" + READ_REWARD + " แสง (จำลอง)");
      return;
    }
    if (t.classList.contains("bar")) {
      var n = NIGHTS[+t.dataset.i], L = window.NL_lightFor(n);
      document.getElementById("cdetail").textContent = n.date + " · " + fmtHM(n.mins) + " · เข้านอน " + n.bed + " · " + L.total + " แสง";
      document.querySelectorAll(".chart .bar path:first-of-type").forEach(function (b) { b.removeAttribute("stroke"); });
      t.querySelector("path").setAttribute("stroke", "#F4F1FF"); t.querySelector("path").setAttribute("stroke-width", "2");
    }
  });
  app.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-star],[data-wander],.bar")) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
  });

  window.NL = { state: function () { return state; }, reset: function () { state = fresh(); save(); } };
  route();
})();
