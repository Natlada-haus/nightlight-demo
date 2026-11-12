/* Moonpuff demo — app logic (hash router + localStorage state).
   ตัวเลขการนอนเป็นข้อมูลตัวอย่าง (เดโม) จนกว่าผู้ใช้จะนำเข้าไฟล์จาก Apple Health (อ่านในเครื่อง ไม่ส่งไปไหน)
   ไม่มีการเรียกเครือข่ายภายนอก · localStorage keys: nightlight-demo-v2, nightlight-text-size, nightlight-motion,
   v3 adds nightlight-music, nightlight-idle, nightlight-import, nightlight-warm, nightlight-season */
(function () {
  "use strict";
  var KEY = "nightlight-demo-v2", FS_KEY = "nightlight-text-size";
  var STAR_COST = 10, READ_REWARD = 5, NOTE_REWARD = 5, START_BALANCE = 0;
  var NIGHTS = window.NL_NIGHTS, STORIES = window.NL_STORIES, Art = window.NLArt;
  var CARDS = window.NL_CARDS, PLACES = window.NL_PLACES, PET = window.NL_PET, RULES = window.NL_RULES;
  var CATS = window.NL_CAT_STORIES, LULL = window.NL_LULLABIES, SEASONS = window.NL_SEASONS;
  var TODAY_CARD = "river";
  var TH_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"], TH_DAY_S = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  var TH_MON = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

  /* ---------- v3: imported nights (Apple Health, parsed on this device) ---------- */
  var IMP_KEY = "nightlight-import";
  function loadImport() {
    try { var v = JSON.parse(localStorage.getItem(IMP_KEY)); if (v && v.nights && v.nights.length) { v.nights.forEach(decorate); return v; } } catch (e) {}
    return null;
  }
  function decorate(n) {
    var d = new Date(n.date + "T12:00:00Z");
    if (!n.day) n.day = TH_DAY_S[d.getUTCDay()];
    if (!n.label) n.label = d.getUTCDate() + " " + TH_MON[d.getUTCMonth()];
    return n;
  }
  var IMP = loadImport();
  function baseNights() { return IMP ? IMP.nights : NIGHTS; }
  function lastBase() { var b = baseNights(); return b[b.length - 1]; }   // เมื่อคืน (เดโม: คืนวันอังคาร 10 พ.ย. → เช้าวันพุธ 11 พ.ย.)

  /* ---------- state ---------- */
  function fresh() {
    return {
      v: 2, balance: START_BALANCE, collected: false, cards: ["island", "rain", "whale", "lanterns", "bakery"],
      stars: [], wander: [], decor: [], gift: true, connected: {}, read: {}, place: "sea",
      extra: [], celebrated: false, notes: [], noteDay: "", wind: { on: false, time: 22 * 60 + 30 },
      snd: {}, sndTimer: 0, collectedFor: "", catMax: 0, lastSnd: ""
    };
  }
  var state = load();
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 2) {
        var f = fresh(); for (var k in f) if (!(k in s)) s[k] = f[k];
        if (s.collected && !s.collectedFor) s.collectedFor = "2026-11-10";   /* v2 saves: that morning was the 10 Nov night */
        return s;
      }
    } catch (e) {}
    return fresh();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  /* ---------- derived numbers (one source for every screen) ---------- */
  function allNights() {
    var out = baseNights().slice(), d = new Date(lastBase().date + "T12:00:00Z");
    var days = TH_DAY_S, months = TH_MON;
    state.extra.forEach(function (kind) {
      d.setUTCDate(d.getUTCDate() + 1);
      var iso = d.toISOString().slice(0, 10);
      out.push(kind === "ontime"
        ? { date: iso, day: days[d.getUTCDay()], label: d.getUTCDate() + " " + months[d.getUTCMonth()], bed: "23:00", wake: "06:30", mins: 450, demo: true }
        : { date: iso, day: days[d.getUTCDay()], label: d.getUTCDate() + " " + months[d.getUTCMonth()], bed: "00:30", wake: "06:30", mins: 360, demo: true });
    });
    return out;
  }
  function S() { var n = allNights(); return window.computeStreak(n, n[n.length - 1].date); }
  function morningNight() { return lastBase(); }
  function morningDone() { return state.collectedFor === morningNight().date; }
  function morningLabel(n) {
    var d = new Date(n.date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1);
    return "วัน" + TH_DAYS[d.getUTCDay()] + "ที่ " + d.getUTCDate() + " " + TH_MON[d.getUTCMonth()];
  }
  /* นิทานนุ่มนิ่ม: 1 เรื่องต่อ 1 คืน (คืนในข้อมูล + คืนตัวอย่างที่เพิ่ม; คืนล่าสุดเปิดตอนกด "เก็บแสง") · เปิดแล้วไม่ปิดอีก */
  function catCount() {
    var n = baseNights().length - (morningDone() ? 0 : 1) + state.extra.length;
    n = Math.max(0, Math.min(CATS.length, n));
    if (n > (state.catMax || 0)) { state.catMax = n; save(); }
    return Math.max(n, state.catMax || 0);
  }
  function unlockedStars(s) { return Math.min(7, s.totalOnTime); }
  function petStage(total) {
    for (var i = PET.stages.length - 1; i >= 0; i--) if (total >= PET.stages[i].from) return i;
    return 0;
  }
  function placeUnlocked(p, s) {
    if (p.needRun) return s.rewardReached || state.celebrated;
    return s.totalOnTime >= (p.need || 0);
  }
  function placeLeft(p, s) { return p.needRun ? Math.max(1, p.needRun - s.run) : Math.max(1, p.need - s.totalOnTime); }
  function todayIso() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function cardById(id) { return CARDS.filter(function (c) { return c.id === id; })[0]; }
  function decorById(id) { return Art.DECOR.filter(function (d) { return d.id === id; })[0]; }
  function placedOf(id) { return state.decor.filter(function (d) { return d.id === id; })[0]; }

  /* ---------- text size ---------- */
  var FS = { small: 0.83, normal: 1, large: 1.15, xlarge: 1.3 };  /* เล็ก / กลาง (default) / ใหญ่ / ใหญ่มาก */
  function fsKey() { var k = null; try { k = localStorage.getItem(FS_KEY); } catch (e) {} return FS[k] ? k : "normal"; }
  function applyFs(k) {
    document.documentElement.style.setProperty("--fs", FS[k]);
    document.documentElement.setAttribute("data-textsize", k);
    try { localStorage.setItem(FS_KEY, k); } catch (e) {}
  }
  applyFs(fsKey());

  /* ---------- toast + modal ---------- */
  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast"), modalEl = document.getElementById("modal"), toastT;
  var toastAt = 0;
  function toast(msg, warn) {
    toastAt = Date.now();
    toastEl.textContent = msg; toastEl.className = "toast show" + (warn ? " warn" : "");
    var tray = document.querySelector(".tray"), tab = document.querySelector(".tabbar"), foot = document.querySelector(".screen .foot");
    var ref = tray || foot || tab;
    toastEl.style.bottom = ref ? (document.getElementById("phone").getBoundingClientRect().bottom - ref.getBoundingClientRect().top + 12) + "px" : "24px";
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.className = "toast"; }, 2600);
  }
  var lastFocus = null;
  function modal(o) {
    lastFocus = document.activeElement;
    modalEl.innerHTML = '<div class="sheet' + (o.celebrate ? " celebrate" : "") + '" role="dialog" aria-modal="true" aria-labelledby="mtitle">' +
      (o.art || "") + '<h2 id="mtitle">' + o.title + '</h2>' + (o.body ? '<p>' + o.body + '</p>' : "") +
      '<div class="sheet-actions">' + (o.actions || []).map(function (a, i) {
        return '<button class="btn ' + (a.kind || (i === 0 ? "primary" : "ghost")) + '" data-m="' + i + '">' + (a.icon || "") + '<span>' + a.label + '</span></button>';
      }).join("") + '</div></div>';
    modalEl.className = "modal show";
    modalEl.onclick = function (e) {
      var b = e.target.closest("[data-m]");
      if (!b) { if (e.target === modalEl) closeModal(); return; }
      var a = o.actions[+b.dataset.m]; closeModal(); if (a.fn) a.fn();
    };
    var first = modalEl.querySelector("button"); if (first) first.focus();
  }
  function closeModal() { modalEl.className = "modal"; modalEl.innerHTML = ""; if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus(); }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modalEl.classList.contains("show")) closeModal(); });

  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- icons (simple generic glyphs) ---------- */
  function ic(d, extra) { return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || "") + '>' + d + '</svg>'; }
  var SPARK_D = "M12 2 Q13.6 10.4 22 12 Q13.6 13.6 12 22 Q10.4 13.6 2 12 Q10.4 10.4 12 2Z";
  var I = {
    spark: '<svg class="ic spark" viewBox="0 0 24 24" aria-hidden="true"><path d="' + SPARK_D + '" fill="currentColor"/></svg>',
    back: ic('<path d="M15 5 8 12l7 7"/>'),
    chev: ic('<path d="m9 6 6 6-6 6"/>', ' data-chev'),
    info: ic('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
    lock: ic('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    reset: ic('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>'),
    play: ic('<path d="M8 5.5v13l10-6.5z" fill="currentColor"/>'),
    pause: ic('<path d="M8 5v14M16 5v14" stroke-width="3"/>'),
    stop: ic('<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>'),
    heart: ic('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
    garden: ic('<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z"/><path d="M4 20h16"/><path d="M7 20v-3M17 20v-2"/>'),
    moon: ic('<path d="M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4z"/>'),
    book: ic('<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z"/>'),
    album: ic('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18"/><path d="M13 9l1 2 2 .3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1L10 11.3l2-.3z"/>'),
    gear: ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    chart: ic('<path d="M5 20V11M10 20V6M15 20v-7M20 20V9"/>'),
    map: ic('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
    paw: ic('<circle cx="7" cy="10" r="1.8"/><circle cx="10.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M12 12c-3 0-5 3.2-5 5.2C7 19 8.6 20 12 20s5-1 5-2.8C17 15.2 15 12 12 12z"/>'),
    grid: ic('<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>'),
    move: ic('<path d="M12 3v18M3 12h18"/><path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>'),
    undo: ic('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
    close: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
    check: ic('<path d="m5 12 5 5 9-10"/>'),
    plus: ic('<path d="M12 5v14M5 12h14"/>', ' stroke-width="2.6"'),
    minus: ic('<path d="M5 12h14"/>', ' stroke-width="2.6"'),
    clock: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    bell: ic('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
    pencil: ic('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
    trash: ic('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
    lotus: ic('<path d="M12 20c-4 0-8-2-9-6 3 0 6 1 9 4 3-3 6-4 9-4-1 4-5 6-9 6z"/><path d="M12 18c-2-2-3-5-2-9 1 1 2 2 2 3 0-1 1-2 2-3 1 4 0 7-2 9z"/>'),
    breath: ic('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5" stroke-dasharray="2 2.5"/><circle cx="12" cy="12" r="10"/>'),
    music: ic('<path d="M4 10v4h3l5 4V6L7 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>'),
    textsize: ic('<path d="M3 19 8 6l5 13M5 15h6"/><path d="M14 19l3.5-8 3.5 8M15.2 16.5h4.6"/>'),
    link: ic('<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.3 11 15.7 7M8.3 13l7.4 4"/>'),
    rain: ic('<path d="M7 15a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.5 1.5A3.5 3.5 0 0 1 17 15z"/><path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5"/>'),
    wave: ic('<path d="M2 9c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M2 14c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M2 19c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/>'),
    fire: ic('<path d="M12 21c-3.9 0-6-2.6-6-5.6 0-3.8 3.4-5.6 3.4-9.4 2.6 1.5 4.1 3.5 4.3 6 .9-.6 1.5-1.7 1.6-3 1.6 1.6 2.7 3.8 2.7 6.4 0 3-2.1 5.6-6 5.6z"/>'),
    leaf: ic('<path d="M12 21V11"/><path d="M12 11C8 11 5 8 5 3c4 0 7 3 7 8z"/><path d="M12 14c3 0 6-2 6-6-3 0-6 2-6 6z"/>'),
    fan: ic('<circle cx="12" cy="12" r="2"/><path d="M12 10c-1-4 0-7 3-7 2 0 2 3-1 5M14 12c4-1 7 0 7 3 0 2-3 2-5-1M12 14c1 4 0 7-3 7-2 0-2-3 1-5M10 12c-4 1-7 0-7-3 0-2 3-2 5 1"/>'),
    noise: ic('<path d="M3 12h2l2-6 3 12 3-9 2 6 2-3h4"/>'),
    note: ic('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
    week: ic('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M7.5 14h2M11 14h2M14.5 14h2M7.5 17h2"/>'),
    upload: ic('<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 14v5a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-5"/>'),
    sun: ic('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
    star: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="' + SPARK_D + '" fill="#FFD27A"/></svg>',
    restMoon: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4z" fill="#C7BCF5"/></svg>',
    lateDot: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" fill="none" stroke="#C2C7EA" stroke-width="2.2"/></svg>'
  };
  var SRC_ICONS = {
    apple: I.heart, band: ic('<rect x="8" y="3" width="8" height="18" rx="4"/><path d="M8 12h8"/>'),
    watch: ic('<circle cx="12" cy="12" r="5.5"/><path d="M9.5 6.8 10 3h4l.5 3.8M9.5 17.2 10 21h4l.5-3.8M12 10v2l1.5 1"/>'),
    square: ic('<rect x="6.5" y="6.5" width="11" height="11" rx="3"/><path d="M9 6.5 9.5 3h5l.5 3.5M9 17.5 9.5 21h5l.5-3.5"/>'),
    link: I.link, compass: ic('<circle cx="12" cy="12" r="8.5"/><path d="m15 9-2 4-4 2 2-4z"/>'),
    ring: ic('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="4"/>'), pencil: I.pencil
  };
  var SOURCES = [
    { id: "apple", icon: "apple", name: "Apple Health", note: "ใช้ iPhone อย่างเดียวก็ได้" },
    { id: "samsung", icon: "watch", name: "Samsung Health", note: "นาฬิกา Galaxy Watch" },
    { id: "google", icon: "link", name: "Google Health Connect", note: "มือถือ Android และ Fitbit" },
    { id: "xiaomi", icon: "square", name: "Xiaomi / Zepp", note: "สายรัดข้อมือ Mi Band, Amazfit" },
    { id: "garmin", icon: "compass", name: "Garmin Connect", note: "นาฬิกา Garmin" },
    { id: "oura", icon: "ring", name: "Oura", note: "แหวนวัดการนอน" },
    { id: "whoop", icon: "band", name: "WHOOP", note: "สายรัดข้อมือ WHOOP" },
    { id: "manual", icon: "pencil", name: "กรอกเวลาเอง", note: "ไม่มีนาฬิกาก็ใช้ได้" }
  ];

  function fmtHM(m) { var h = Math.floor(m / 60), mm = m % 60; return h + " ชม." + (mm ? " " + mm + " นาที" : ""); }
  function fmtClock(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var DEMO = '<span class="demo-label">ข้อมูลตัวอย่าง (เดโม)</span>';
  var IMPL = '<span class="demo-label imp">ข้อมูลที่คุณนำเข้า · เก็บในเครื่องนี้เท่านั้น</span>';
  function dataLabel() { return IMP ? IMPL : DEMO; }
  function fmtBig(m) { var h = Math.floor(m / 60), mm = m % 60; return h + '<small>ชม.</small>' + (mm ? ' ' + mm + '<small>นาที</small>' : ""); }

  function tabbar(on) {
    var t = [["garden", "สวน", I.garden], ["bedtime", "ก่อนนอน", I.moon], ["collect", "สะสม", I.album], ["settings", "ตั้งค่า", I.gear]];
    return '<nav class="tabbar" aria-label="เมนูหลัก">' + t.map(function (x) {
      return '<a href="#' + x[0] + '" class="' + (on === x[0] ? "on" : "") + '"' + (on === x[0] ? ' aria-current="page"' : "") + '>' + x[2] + '<span>' + x[1] + '</span></a>';
    }).join("") + '</nav>';
  }
  function topbar(back, title, extra) {
    return '<header class="topbar"><a class="back" href="#' + back + '">' + I.back + '<span>กลับ</span></a><h1 class="title">' + title + '</h1>' + (extra || "") + '</header>';
  }
  function imgOr(src, alt, cls, pos) {
    // graceful fallback: navy gradient + moon icon when an art file is missing
    return '<span class="pic ' + (cls || "") + '"><img src="' + src + '" alt="' + (alt || "") + '"' + (pos ? ' style="object-position:' + pos + '"' : "") + ' onerror="this.parentNode.classList.add(\'missing\');this.remove()">' + I.moon + '</span>';
  }

  /* ---------- screens ---------- */
  var screens = {};

  screens.splash = function () {
    return '<section class="screen splash">' + Art.splashScene() +
      '<span class="tag">เดโม</span>' +
      '<div class="top"><h1 class="wordmark"><img src="assets/art/moonpuff-wordmark.png" alt="Moonpuff" width="720" height="206"></h1><p class="th-name">มูนพัฟ</p>' +
      '<p class="tagline">นอนเต็มอิ่ม ฟ้าเต็มดาว</p>' +
      '<p class="sub">เข้านอนตรงเวลา<br>แล้วดาวบนฟ้าของคุณจะสว่างขึ้นทีละดวง</p></div>' +
      '<div class="bottom"><button class="btn primary big" data-go="connect">' + I.spark + '<span>เริ่มเลย</span></button>' +
      '<p class="fine">เกมเล็ก ๆ ชวนเข้านอนให้เป็นเวลา</p></div></section>';
  };

  screens.connect = function () {
    return '<section class="screen connect">' + topbar("splash", "เชื่อมข้อมูลการนอน", '<span class="tag">เดโม</span>') +
      '<div class="body scroll">' +
      '<div class="banner">' + I.info + '<span>เลือกแอปหรือนาฬิกาที่ใช้อยู่ (เลือกได้หลายอัน)<br><b>เดโมนี้ใช้ข้อมูลตัวอย่าง ยังไม่ได้เชื่อมจริง</b></span></div>' +
      '<div class="list">' + SOURCES.map(function (s) {
        var on = !!state.connected[s.id];
        return '<div class="row src"><span class="ico">' + SRC_ICONS[s.icon] + '</span><div class="txt">' +
          '<div class="name">' + s.name + '</div><div class="sub">' + s.note + '</div></div>' +
          '<button class="switch" role="switch" aria-checked="' + on + '" aria-label="เชื่อม ' + s.name + '" data-src="' + s.id + '"><span class="knob"></span><span class="st">' + (on ? "เปิด" : "ปิด") + '</span></button></div>';
      }).join("") + '</div>' +
      '<p class="privacy">' + I.lock + '<span>ข้อมูลการนอนเก็บในเครื่องคุณเท่านั้น</span></p></div>' +
      '<div class="foot"><button class="btn primary" data-go="morning">' + I.check + '<span>ต่อไป</span></button></div></section>';
  };

  function nightStrip(s) {
    var last7 = s.nights.slice(-7);
    return '<div class="nights" role="list">' + last7.map(function (r, i) {
      var g = r.kind === "ontime" ? I.star : r.kind === "rest" ? I.restMoon : I.lateDot;
      var lbl = r.kind === "ontime" ? "ตรงเวลา" : r.kind === "rest" ? "คืนพัก" : "นอนดึก";
      return '<div class="n ' + r.kind + (i === last7.length - 1 ? " last" : "") + '" role="listitem" aria-label="' + r.night.label + ' ' + lbl + '"><span class="dot">' + g + '</span><span>' + r.night.day + '</span></div>';
    }).join("") + '</div>' +
      '<div class="legend"><span>' + I.star + 'ตรงเวลา</span><span>' + I.restMoon + 'คืนพัก</span><span>' + I.lateDot + 'นอนดึก</span></div>';
  }

  screens.morning = function () {
    var s = S(), M = morningNight(), L = window.NL_lightFor(M), done = morningDone(), c = cardById(TODAY_CARD);
    var head = '<div class="art">' + Art.morningArt() + '<div class="greet"><h1>อรุณสวัสดิ์</h1><p>' + morningLabel(M) + '</p></div></div>';
    var sleep = '<div class="card"><div class="card-head">' + I.moon + '<b>เมื่อคืนคุณนอน</b></div>' +
      '<div class="sleep-big">' + fmtBig(M.mins) + '</div>' +
      '<div class="sub">เข้านอน ' + M.bed + ' น. · ตื่น ' + M.wake + ' น.</div>' +
      (M.inBed ? '<div class="sub">อยู่บนเตียงรวม ' + fmtHM(M.inBed) + '</div>' : "") + dataLabel() + '</div>';
    if (!done) {
      return '<section class="screen morning">' + head + '<div class="body scroll">' + sleep +
        '<div class="card"><div class="card-head">' + I.star + '<b>เข้านอนตรงเวลาต่อกัน ' + s.run + ' คืน</b></div>' +
        '<p class="sub">คืนพักสัปดาห์นี้ ใช้แล้ว ' + s.restUsedThisWeek + '/' + s.restPerWeek + '</p>' + dataLabel() + nightStrip(s) + '</div>' +
        '<p class="soft">' + I.info + '<span>มีแสง การ์ดความฝัน และนิทานใหม่รออยู่</span></p>' +
        '</div><div class="foot"><button class="btn primary big" id="collect">' + I.spark + '<span>เก็บแสง</span></button></div></section>';
    }
    var k = catCount(), story = k > 0 ? CATS[k - 1] : null;
    return '<section class="screen morning done">' + head + '<div class="body scroll">' +
      '<div class="card got"><div class="card-head">' + I.spark + '<b>ได้แสงเช้านี้</b></div>' +
      '<div class="breakdown"><div class="bd"><span>' + I.moon + 'นอน ' + fmtHM(M.mins) + '</span><b>+' + L.base + '</b></div>' +
      (L.bonus ? '<div class="bd"><span>' + I.clock + 'เข้านอนตรงเวลา</span><b>+' + L.bonus + '</b></div>' : "") +
      '<div class="bd total"><span>รวม</span><span class="num"><span id="count">' + L.total + '</span> แสง</span></div></div>' +
      '<p class="sub">แสงที่มีตอนนี้ ' + state.balance + ' แสง</p>' + dataLabel() + '</div>' +
      '<div class="card dream"><div class="card-head">' + I.album + '<b>การ์ดความฝันวันนี้</b></div>' +
      imgOr(c.img, c.title, "dream-img", c.pos) +
      '<h2>' + c.title + '</h2><p class="sub">' + c.cap + '</p>' +
      '<p class="ok-line">' + I.check + '<span>เก็บเข้าสมุดสะสมแล้ว</span></p></div>' +
      (story ? '<a class="hub cat-today" href="#cat/' + (k - 1) + '"><span class="ico">' + I.paw + '</span><span class="tx"><b>นิทานของนุ่มนิ่มคืนนี้</b><span>“' + story.title + '”</span></span>' + I.chev + '</a>' : "") +
      '</div><div class="foot"><button class="btn primary big" data-go="garden">' + I.garden + '<span>ไปที่สวน</span></button></div></section>';
  };
  function collectMorning() {
    if (morningDone()) return;
    var L = window.NL_lightFor(morningNight());
    state.collectedFor = morningNight().date; state.collected = true; state.balance += L.total;
    if (state.cards.indexOf(TODAY_CARD) < 0) state.cards.push(TODAY_CARD);
    save(); catCount(); render();
    countUp(L.total);
    /* animation pass: gentle golden sparkles rise to the counter, which glows softly once */
    var cnt = document.getElementById("count");
    if (cnt && window.Ambient && Ambient.allowed()) { cnt.parentNode.classList.add("glow"); Ambient.collectBurst(cnt); }
    toast("เก็บแสงแล้ว +" + L.total + " แสง");
  }
  function countUp(target) {
    var el = document.getElementById("count"); if (!el) return;
    if (reduced || (window.Ambient && !Ambient.allowed())) { el.textContent = target; return; }
    var t0 = null, dur = 1200;
    function step(t) {
      if (!t0) t0 = t; var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e);
      if (p < 1 && document.body.contains(el)) requestAnimationFrame(step); else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  /* ---------- garden ---------- */
  var G = { mode: null, sel: null };   // mode: "place" (new item from tray) | "move" (existing item)
  function sceneState() {
    var s = S(), st = petStage(s.totalOnTime);
    return { place: state.place, layout: layoutKey(), stars: state.stars, wander: state.wander, decor: state.decor, unlocked: unlockedStars(s),
      mode: G.mode, moving: G.sel, petImg: PET.stages[st].img, petName: PET.name };
  }
  screens.garden = function () {
    var place = PLACES.filter(function (p) { return p.id === state.place; })[0] || PLACES[0];
    return '<section class="screen garden"><div class="gscroll scroll">' +
      '<div class="stage" id="stage">' + Art.gardenScene(sceneState()) +
      '<div class="hud"><span class="balance" id="bal" aria-live="polite">' + I.star + '<span class="num">' + state.balance + '</span> แสง</span>' +
      '<span class="sp"></span><a class="pill-btn" href="#places" aria-label="เปลี่ยนฉาก ตอนนี้: ' + place.name + (place.id === "sea" && seasonNow() !== "normal" ? " (" + seasonName(seasonNow()) + ")" : "") + '">' + I.map + '<span>ฉาก</span></a></div>' +
      '<div id="modeslot">' + modeBar() + '</div></div>' +
      '<div class="tray"><p class="tray-hint star-hint">' + I.star + '<span>แตะวงสีเหลืองบนฟ้าเพื่อจุดดาว ดวงละ ' + STAR_COST + ' แสง</span></p>' +
      '<div class="tray-head"><h2>' + I.garden + 'ของแต่งสวน</h2><a class="pill-btn small" href="#decor">' + I.grid + '<span>ดูทั้งหมด</span></a></div>' +
      '<p class="tray-hint">เลือกของ แล้วแตะวงสีเหลืองในสวนเพื่อวาง</p>' +
      '<div class="tray-list" id="tray">' + trayItems() + '</div></div></div>' +
      tabbar("garden") + '</section>';
  };
  function modeBar() {
    if (!G.mode) return "";
    var d = decorById(G.sel);
    return '<div class="modebar" role="status"><span>' + I.move + (G.mode === "move" ? "ย้าย" : "วาง") + d.name + '<br><small>แตะวงสีเหลืองบนพื้นในสวน</small></span>' +
      '<button class="btn ghost small" id="cancelMode">' + I.close + '<span>ยกเลิก</span></button></div>';
  }
  function trayItems() {
    return Art.DECOR.map(function (d) { return itemCard(d, "item"); }).join("");
  }
  function itemCard(d, cls) {
    var pl = placedOf(d.id), gifted = d.id === "lantern" && state.gift && !pl, sel = G.sel === d.id && G.mode;
    var pr = pl ? '<span class="pr ok">' + I.check + 'ในสวน</span>' : gifted ? '<span class="pr gift">ของขวัญ</span>' : '<span class="pr">' + I.spark + d.price + '</span>';
    return '<button class="' + cls + (pl ? " placed" : "") + (gifted ? " gifted" : "") + (sel ? " sel" : "") + '" data-decor="' + d.id + '" aria-pressed="' + (sel ? "true" : "false") + '" aria-label="' + d.name + (pl ? " อยู่ในสวนแล้ว แตะเพื่อย้ายหรือเก็บคืน" : gifted ? " ของขวัญ ไม่ต้องใช้แสง" : " ใช้ " + d.price + " แสง") + '">' +
      '<span class="art">' + Art.decorIcon(d.id) + '</span><span class="nm">' + d.name + '</span>' + pr + '</button>';
  }
  function rerenderGarden() {
    var stage = document.getElementById("stage"); if (!stage) { save(); return; }
    var svg = stage.querySelector("svg.scene"), tmp = document.createElement("div");
    tmp.innerHTML = Art.gardenScene(sceneState());
    stage.replaceChild(tmp.firstChild, svg);
    document.getElementById("modeslot").innerHTML = modeBar();
    var bal = document.getElementById("bal"); bal.querySelector(".num").textContent = state.balance;
    bal.classList.remove("bump"); void bal.offsetWidth; bal.classList.add("bump");
    var tray = document.getElementById("tray"), sl = tray.scrollLeft; tray.innerHTML = trayItems(); tray.scrollLeft = sl;
    save();
  }
  function spend(cost) {
    if (state.balance < cost) { toast("แสงยังไม่พอ ไว้คืนนี้นอนเก็บแสงเพิ่มนะ", true); return false; }
    state.balance -= cost; return true;
  }
  function lightStar(i) {
    var s = S(), un = unlockedStars(s);
    if (state.stars.indexOf(i) > -1) { toast("ดาวดวงนี้สว่างอยู่แล้ว"); return; }
    if (i >= un) { toast("นอนตรงเวลาอีก " + (i + 1 - s.totalOnTime) + " คืน ก็จุดดาวดวงนี้ได้"); return; }
    if (!spend(STAR_COST)) return;
    state.stars.push(i); rerenderGarden(); sparkleAt('[data-star="' + i + '"] .hit');
    toast(state.stars.length === 7 ? "กลุ่มดาวถ้วยชาครบแล้ว ✦" : "จุดดาวแล้ว ใช้ " + STAR_COST + " แสง");
  }
  function lightWander(i) {
    if (state.wander.indexOf(i) > -1) { toast("ดาวดวงนี้สว่างอยู่แล้ว"); return; }
    if (!spend(STAR_COST)) return;
    state.wander.push(i); rerenderGarden(); sparkleAt('[data-wander="' + i + '"] .hit'); toast("จุดดาวแล้ว ใช้ " + STAR_COST + " แสง");
  }
  function sparkleAt(sel) { var el = document.querySelector("#stage " + sel); if (el && window.Ambient) Ambient.ring(el); }
  function pickDecor(id) {
    var d = decorById(id);
    if (placedOf(id)) { decorSheet(id); return; }
    if (G.mode === "place" && G.sel === id) { G.mode = G.sel = null; rerenderGarden(); return; }
    var gifted = id === "lantern" && state.gift;
    if (!gifted && state.balance < d.price) { toast("แสงยังไม่พอ ไว้คืนนี้นอนเก็บแสงเพิ่มนะ", true); return; }
    G.mode = "place"; G.sel = id; rerenderGarden();
    var sp = document.querySelector("#stage [data-spot]"); if (sp) sp.scrollIntoView({ block: "nearest" });
  }
  function dropAt(spot) {
    var id = G.sel, d = decorById(id);
    if (G.mode === "move") {
      var me = placedOf(id), other = state.decor.filter(function (x) { return x.spot === spot && x.id !== id; })[0];
      if (other) other.spot = me.spot;   // tapping an occupied spot swaps the two items
      me.spot = spot; G.mode = G.sel = null; rerenderGarden(); toast(other ? "สลับที่" + d.name + "กับ" + decorById(other.id).name + "แล้ว" : "ย้าย" + d.name + "แล้ว"); return;
    }
    var gifted = id === "lantern" && state.gift, paid = gifted ? 0 : d.price;
    if (!gifted && !spend(d.price)) return;
    if (gifted) state.gift = false;
    state.decor.push({ id: id, spot: spot, paid: paid });
    G.mode = G.sel = null; rerenderGarden();
    toast(gifted ? "วางโคมกระดาษแล้ว (ของขวัญ)" : "วาง" + d.name + "แล้ว ใช้ " + d.price + " แสง");
  }
  function decorSheet(id) {
    var d = decorById(id), p = placedOf(id);
    modal({
      art: '<span class="sheet-art">' + Art.decorIcon(id) + '</span>', title: d.name,
      body: "จะทำอะไรกับ" + d.name + "ดี",
      actions: [
        { label: "ย้ายไปที่อื่น", icon: I.move, fn: function () { if (location.hash !== "#garden") location.hash = "#garden"; G.mode = "move"; G.sel = id; setTimeout(rerenderGarden, 0); } },
        { label: p.paid ? "เก็บคืน (ได้แสงคืน " + p.paid + ")" : "เก็บคืน", icon: I.undo, kind: "ghost", fn: function () { removeDecor(id); } },
        { label: "ปิด", icon: I.close, kind: "ghost" }
      ]
    });
  }
  function removeDecor(id) {
    var p = placedOf(id), d = decorById(id);
    state.decor = state.decor.filter(function (x) { return x.id !== id; });
    state.balance += p.paid;
    if (id === "lantern" && !p.paid) state.gift = true;
    G.mode = G.sel = null;
    if (document.getElementById("stage")) rerenderGarden(); else { save(); render(); }
    toast("เก็บ" + d.name + "คืนแล้ว" + (p.paid ? " ได้แสงคืน " + p.paid : ""));
  }

  screens.decor = function () {
    return '<section class="screen sub decor-all">' + topbar("garden", "ของแต่งสวนทั้งหมด") +
      '<div class="body scroll"><p class="lead">แตะของที่อยากวาง แล้วแตะวงสีเหลืองในสวน</p>' +
      '<p class="balance-line">' + I.star + 'มีแสง ' + state.balance + ' แสง</p>' +
      '<div class="grid2">' + Art.DECOR.map(function (d) { return itemCard(d, "gitem"); }).join("") + '</div></div></section>';
  };

  /* ---------- places ---------- */
  screens.places = function () {
    var s = S();
    return '<section class="screen sub places">' + topbar("garden", "เลือกฉาก") +
      '<div class="body scroll"><p class="lead">แตะฉากเพื่อใช้เป็นพื้นหลังสวน</p>' +
      PLACES.map(function (p) {
        var un = placeUnlocked(p, s), cur = state.place === p.id;
        var st = cur ? '<span class="status on">' + I.check + 'กำลังใช้</span>' : un ? '<span class="status">' + I.chev + 'แตะเพื่อใช้</span>'
          : '<span class="status locked">' + I.lock + (p.needRun ? 'นอนตรงเวลาต่อกันอีก ' : 'นอนตรงเวลาอีก ') + placeLeft(p, s) + ' คืน</span>';
        return '<button class="place' + (cur ? " cur" : "") + (un ? "" : " locked") + '" data-place="' + p.id + '" aria-pressed="' + cur + '"' + (un ? "" : ' aria-disabled="true"') + '>' +
          imgOr(p.id === "sea" ? Art.PLACE_LAYOUT[seaLayoutKey()].img : p.img, "", "place-img", p.id === "sea" && seasonNow() !== "normal" ? "center 70%" : (p.pos || "center 60%")) + '<span class="place-tx"><b>' + p.name + (p.needRun ? ' <span class="tag gold">รางวัลพิเศษ</span>' : "") + '</b>' + st + '</span></button>';
      }).join("") + '</div>' +
      '<div class="foot"><button class="btn primary" data-go="garden">' + I.garden + '<span>ไปที่สวน</span></button></div></section>';
  };
  function choosePlace(id) {
    var p = PLACES.filter(function (x) { return x.id === id; })[0], s = S();
    if (!placeUnlocked(p, s)) { toast((p.needRun ? "นอนตรงเวลาต่อกันอีก " : "นอนตรงเวลาอีก ") + placeLeft(p, s) + " คืน ฉากนี้ก็เปิด"); return; }
    state.place = id; save(); render(); toast("เปลี่ยนเป็น" + p.name + "แล้ว");
  }

  /* ---------- pet ---------- */
  screens.pet = function () {
    var s = S(), i = petStage(s.totalOnTime), st = PET.stages[i], next = PET.stages[i + 1];
    var pct = next ? (s.totalOnTime - st.from) / (next.from - st.from) * 100 : 100;
    return '<section class="screen sub pet">' + topbar("garden", "แมวน้อยของคุณ") +
      '<div class="body scroll"><div class="pet-hero">' + imgOr(st.img, "แมวน้อย " + PET.name + " " + st.name, "pet-big") +
      '<h2>' + PET.name + '</h2><p class="stage-name">ขั้นที่ ' + (i + 1) + ' · ' + st.name + '</p><p class="sub center">' + st.desc + '</p></div>' +
      '<div class="card"><div class="card-head">' + I.star + '<b>เข้านอนตรงเวลารวม ' + s.totalOnTime + ' คืน</b></div>' +
      '<div class="progress big" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '" aria-label="ความคืบหน้าการโต"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
      '<p class="grow">' + (next ? 'อีก ' + (next.from - s.totalOnTime) + ' คืนจะโตขึ้น' : 'โตเต็มที่แล้ว') + '</p>' +
      '<p class="sub">นับคืนรวม ไม่ต้องติดกัน ความคืบหน้าไม่หายไปไหน</p>' + DEMO + '</div>' +
      '<div class="stages">' + PET.stages.map(function (x, k) {
        var got = k <= i;
        return '<div class="stg' + (got ? "" : " future") + (k === i ? " cur" : "") + '">' + imgOr(x.img, "", "stg-img") +
          '<b>' + x.name + '</b><span>' + (got ? (k === i ? "ตอนนี้" : "ผ่านแล้ว " + I.check) : I.lock + x.from + " คืน") + '</span></div>';
      }).join("") + '</div></div>' +
      '<div class="foot"><button class="btn primary" data-go="garden">' + I.garden + '<span>ไปที่สวน</span></button></div></section>';
  };

  /* ---------- collection book ---------- */
  screens.collect = function (tab) {
    tab = ["decor", "const", "cards", "stories"].indexOf(tab) > -1 ? tab : "cards";
    var tabs = [["cards", "การ์ดความฝัน", I.album], ["const", "กลุ่มดาว", I.spark], ["decor", "ของแต่ง", I.garden], ["stories", "นิทาน", I.paw]];
    var body = tab === "cards" ? collectCards() : tab === "const" ? collectConst() : tab === "stories" ? catList() : collectDecor();
    return '<section class="screen collect"><header class="head"><h1>' + I.album + 'สมุดสะสม</h1></header>' +
      '<div class="seg tabs4" role="tablist" aria-label="หมวดสะสม">' + tabs.map(function (t) {
        return '<a role="tab" href="#collect/' + t[0] + '" aria-selected="' + (tab === t[0]) + '" class="' + (tab === t[0] ? "on" : "") + '">' + t[2] + '<span>' + t[1] + '</span></a>';
      }).join("") + '</div><div class="body scroll" role="tabpanel">' + body + '</div>' + tabbar("collect") + '</section>';
  };
  function collectCards() {
    var got = state.cards.length, html = '<p class="lead">เช้าละ 1 ใบ · สะสมแล้ว ' + got + '/' + window.NL_CARD_SLOTS + ' ใบ</p><div class="grid2 cards">';
    for (var k = 0; k < window.NL_CARD_SLOTS; k++) {
      var id = state.cards[k], c = id && cardById(id);
      html += c ? '<button class="dcard" data-card="' + c.id + '" aria-label="การ์ด ' + c.title + ' ดูใหญ่">' + imgOr(c.img, "", "dc-img", c.pos) +
        (id === TODAY_CARD ? '<span class="tag gold new">ใหม่วันนี้</span>' : "") +
        '<b>' + c.title + '</b><span class="cap">' + c.cap + '</span></button>'
        : '<div class="dcard empty" aria-label="ยังไม่ได้การ์ดใบนี้"><span class="pic sil">' + I.moon + '</span><b>ยังไม่ได้</b><span class="cap">รอเช้าวันต่อ ๆ ไป</span></div>';
    }
    return html + '</div>';
  }
  function collectConst() {
    var s = S(), lit = state.stars.length, special = s.rewardReached || state.celebrated;
    return '<p class="lead">จุดดาวในสวนเพื่อต่อเป็นกลุ่มดาว</p>' +
      '<div class="card const-card"><span class="cico">' + Art.miniConst(Art.CONST, 7 /*shape preview*/) + '</span><div><b>' + Art.CONST.name + '</b>' +
      '<p class="sub">จุดแล้ว ' + lit + '/7 ดวง</p><div class="progress"><i style="width:' + (lit / 7 * 100).toFixed(1) + '%"></i></div>' +
      '<p class="sub">ดาวจะเปิดให้จุดตามจำนวนคืนที่นอนตรงเวลา (' + unlockedStars(s) + '/7)</p></div></div>' +
      '<div class="card const-card' + (special ? "" : " locked") + '"><span class="cico">' + Art.miniConst(Art.CONST2, special ? 7 : 0) + '</span><div><b>' + Art.CONST2.name + ' <span class="tag gold">รางวัลพิเศษ</span></b>' +
      '<p class="sub">' + (special ? I.check + ' ได้แล้ว จากการนอนตรงเวลาต่อกัน 7 คืน' : I.lock + ' นอนตรงเวลาต่อกันอีก ' + Math.max(1, RULES.rewardRun - s.run) + ' คืน (คืนพักนับด้วย)') + '</p></div></div>' +
      '<div class="card const-card locked"><span class="cico">' + I.spark + '</span><div><b>ยังไม่ได้</b><p class="sub">กลุ่มดาวใหม่จะมาเร็ว ๆ นี้</p></div></div>';
  }
  function collectDecor() {
    return '<p class="lead">ของที่วางในสวนแล้ว และของที่ยังรออยู่</p><div class="grid2">' + Art.DECOR.map(function (d) { return itemCard(d, "gitem"); }).join("") + '</div>';
  }
  function cardModal(id) {
    var c = cardById(id);
    modal({ art: imgOr(c.img, c.title, "modal-card", c.pos), title: c.title, body: c.cap, actions: [{ label: "ปิด", icon: I.close }] });
  }

  /* ---------- v3: นิทานของนุ่มนิ่ม ---------- */
  function catList() {
    var n = catCount(), html = '<div class="cat-head">' + imgOr(PET.stages[petStage(S().totalOnTime)].img, "", "cat-mini") +
      '<p class="lead">นิทานสั้น ๆ คืนละเรื่อง อ่านออกเสียงช้า ๆ ก็ได้</p></div>' +
      '<p class="sub">เปิดแล้ว ' + n + ' จาก ' + CATS.length + ' เรื่อง</p><div class="list">';
    for (var i = n - 1; i >= 0; i--) {
      html += '<a class="row link cat-row" href="#cat/' + i + '"><span class="ico">' + I.paw + '</span><span class="txt"><span class="name">' + CATS[i].title + '</span>' +
        '<span class="sub">เรื่องที่ ' + (i + 1) + (i === n - 1 ? ' · ใหม่ล่าสุด' : "") + '</span></span>' + I.chev + '</a>';
    }
    html += '</div>' + (n < CATS.length ? '<div class="cat-locked">' + I.lock + '<span>คืนต่อไปจะมีนิทานใหม่</span></div>' : '<p class="sub center">อ่านครบทุกเรื่องแล้ว</p>');
    return html;
  }
  screens.cat = function (arg) {
    var n = catCount();
    if (arg != null && arg !== "" && +arg >= 0 && +arg < n) {
      var st = CATS[+arg];
      return '<section class="screen sub catread">' + topbar("cat", "นิทานของนุ่มนิ่ม") +
        '<article class="body scroll cat-story"><span class="cat-no">เรื่องที่ ' + (+arg + 1) + '</span><h2>' + st.title + '</h2>' +
        st.lines.map(function (l) { return '<p>' + l + '</p>'; }).join("") + '<p class="end">' + I.moon + '<span>ราตรีสวัสดิ์</span></p></article></section>';
    }
    return '<section class="screen sub catlist">' + topbar("bedtime", "นิทานของนุ่มนิ่ม") + '<div class="body scroll">' + catList() + '</div></section>';
  };

  /* ---------- bedtime hub ---------- */
  var HUB = [
    ["quiet", "นั่งนิ่ง ๆ", "ตั้งเวลา 3 · 5 · 10 นาที", I.lotus],
    ["breathe", "หายใจช้า ๆ", "ทำตามวงกลม 1–3 นาที", I.breath],
    ["sounds", "เสียงก่อนนอน", "ฝน คลื่น กองไฟ และอื่น ๆ", I.music],
    ["music", "เพลงกล่อม", "กล่องดนตรี เปียโน กระดิ่งเบา ๆ", I.note],
    ["cat", "นิทานของนุ่มนิ่ม", "นิทานสั้น ๆ คืนละเรื่อง", I.paw],
    ["read", "อ่านก่อนนอน 5 นาที", "เรื่องสั้นอ่านสบาย 5 เรื่อง", I.book],
    ["gratitude", "ขอบคุณวันนี้", "เขียนสั้น ๆ ก่อนนอน", I.heart],
    ["winddown", "เวลาเตรียมนอน", "ตั้งเวลาเตือนให้เริ่มพัก", I.bell],
    ["night", "ถ้าตื่นกลางดึก", "หายใจช้า ๆ แล้วเปิดเสียงเบา ๆ", I.moon]
  ];
  screens.bedtime = function () {
    var playing = Snd.allNames();
    return '<section class="screen bedtime"><div class="hero" aria-hidden="true"></div><header class="head"><h1>' + I.moon + 'ก่อนนอน</h1><p class="lead">เลือกสิ่งที่อยากทำ ทำช้า ๆ ได้เลย</p></header>' +
      '<div class="body scroll">' +
      (playing.length ? '<div class="now-playing">' + I.music + '<span>กำลังเล่น: ' + playing.join(" · ") + '</span><button class="btn ghost small" id="stopAll">' + I.stop + '<span>หยุดทั้งหมด</span></button></div>' : "") +
      HUB.map(function (h) {
        return '<a class="hub" href="#' + h[0] + '"><span class="ico">' + h[3] + '</span><span class="tx"><b>' + h[1] + '</b><span>' + h[2] + '</span></span>' + I.chev + '</a>';
      }).join("") + '</div>' + tabbar("bedtime") + '</section>';
  };

  /* ---------- quiet timer ---------- */
  var Q = { min: 5, left: 0, running: false, started: false, iv: null, ended: false };
  function stopQuiet() { clearInterval(Q.iv); Q.iv = null; Q.running = false; }
  screens.quiet = function () {
    var t = Q.started ? Q.left : Q.min * 60;
    return '<section class="screen sub quiet">' + topbar("bedtime", "นั่งนิ่ง ๆ") +
      '<div class="body scroll center-col">' +
      '<p class="lead">นั่งสบาย ๆ หายใจตามวงกลมช้า ๆ</p>' +
      '<div class="seg choose" role="group" aria-label="เลือกเวลา">' + [3, 5, 10].map(function (m) {
        return '<button class="' + (Q.min === m ? "on" : "") + '" data-qmin="' + m + '" aria-pressed="' + (Q.min === m) + '"' + (Q.started ? " disabled" : "") + '>' + m + ' นาที</button>';
      }).join("") + '</div>' +
      '<div class="orb-wrap"><div class="orb' + (Q.running ? " run" : "") + '"></div><div class="orb-tx"><span class="big-time" id="qtime">' + fmtClock(t) + '</span><span id="qmsg">' +
      (Q.ended ? "ครบแล้ว ค่อย ๆ วางมือถือลงได้เลย" : Q.running ? "หายใจตามสบาย" : Q.started ? "พักไว้ก่อน" : "พร้อมเมื่อไหร่ก็เริ่มได้") + '</span></div></div>' +
      '</div><div class="foot">' +
      (Q.started && !Q.ended ? '<button class="btn primary" id="qgo">' + (Q.running ? I.pause + '<span>พักไว้</span>' : I.play + '<span>ทำต่อ</span>') + '</button><button class="btn ghost" id="qstop">' + I.stop + '<span>หยุด</span></button>'
        : '<button class="btn primary big" id="qgo">' + I.play + '<span>' + (Q.ended ? "เริ่มใหม่" : "เริ่ม") + '</span></button>') +
      '</div></section>';
  };
  function quietGo() {
    if (!Q.started || Q.ended) { Q.started = true; Q.ended = false; Q.left = Q.min * 60; }
    if (Q.running) stopQuiet();
    else { Q.running = true; Q.iv = setInterval(quietTick, 1000); }
    render();
  }
  function quietTick() {
    if (!document.getElementById("qtime")) { stopQuiet(); return; }
    Q.left--; document.getElementById("qtime").textContent = fmtClock(Q.left);
    if (Q.left <= 0) { stopQuiet(); Q.ended = true; Q.started = false; chime(); render(); }
  }

  /* ---------- breathing ---------- */
  var PATTERNS = {
    box: { name: "หายใจเข้า 4 · กลั้น 4 · ออก 4 · พัก 4", short: "4-4-4-4", steps: [["in", "หายใจเข้า", 4], ["hold", "กลั้นไว้", 4], ["out", "หายใจออก", 4], ["rest", "พัก", 4]] },
    easy: { name: "หายใจเข้า 4 · ออก 6 (ง่ายกว่า)", short: "เข้า 4 · ออก 6", steps: [["in", "หายใจเข้า", 4], ["out", "หายใจออก", 6]] }
  };
  var B = { pat: "box", min: 1, running: false, iv: null, step: 0, count: 0, left: 0, done: false };
  function stopBreathe() { clearInterval(B.iv); B.iv = null; B.running = false; }
  screens.breathe = function () {
    var p = PATTERNS[B.pat], st = p.steps[B.step];
    return '<section class="screen sub breathe">' + topbar("bedtime", "หายใจช้า ๆ") +
      '<div class="body scroll center-col">' +
      (B.running ? "" : '<div class="opts"><p class="opt-label">' + I.breath + 'แบบการหายใจ</p><div class="seg col" role="group" aria-label="แบบการหายใจ">' +
        Object.keys(PATTERNS).map(function (k) { return '<button class="' + (B.pat === k ? "on" : "") + '" data-pat="' + k + '" aria-pressed="' + (B.pat === k) + '">' + PATTERNS[k].name + '</button>'; }).join("") + '</div>' +
        '<p class="opt-label">' + I.clock + 'นานเท่าไหร่</p><div class="seg" role="group" aria-label="เวลา">' + [1, 2, 3].map(function (m) {
          return '<button class="' + (B.min === m ? "on" : "") + '" data-bmin="' + m + '" aria-pressed="' + (B.min === m) + '">' + m + ' นาที</button>';
        }).join("") + '</div></div>') +
      '<div class="orb-wrap breath' + (B.running ? "" : " idle") + '"><div class="orb b-' + (B.running ? st[0] : "idle") + '" id="borb" style="--d:' + (B.running ? st[2] : 1) + 's"></div>' +
      '<div class="orb-tx"><span class="word' + (B.running ? "" : " idle") + '" id="bword">' + (B.running ? st[1] : B.done ? "เก่งมาก" : "กดเริ่มได้เลย") + '</span><span class="count" id="bcount">' + (B.running ? B.count : "") + '</span>' +
      '<span id="bleft">' + (B.running ? "เหลือ " + fmtClock(B.left) : B.done ? "ครบแล้ว หยุดพักได้เลย" : p.short) + '</span></div></div>' +
      '</div><div class="foot">' + (B.running ? '<button class="btn primary big" id="bgo">' + I.stop + '<span>หยุด</span></button>' : '<button class="btn primary big" id="bgo">' + I.play + '<span>' + (B.done ? "เริ่มอีกครั้ง" : "เริ่ม") + '</span></button>') + '</div></section>';
  };
  function breatheGo() {
    if (B.running) { stopBreathe(); B.done = false; render(); return; }
    B.running = true; B.done = false; B.step = 0; B.count = 1; B.left = B.min * 60;
    render(); B.iv = setInterval(breatheTick, 1000);
  }
  function breatheTick() {
    if (!document.getElementById("borb")) { stopBreathe(); return; }
    var p = PATTERNS[B.pat];
    B.left--; B.count++;
    if (B.count > p.steps[B.step][2]) { B.step = (B.step + 1) % p.steps.length; B.count = 1; }
    if (B.left <= 0 && B.step === 0 && B.count === 1) { stopBreathe(); B.done = true; chime(); render(); return; }
    if (B.left <= -30) { stopBreathe(); B.done = true; render(); return; }
    var st = p.steps[B.step], orb = document.getElementById("borb");
    orb.className = "orb b-" + st[0]; orb.style.setProperty("--d", st[2] + "s");
    document.getElementById("bword").textContent = st[1];
    document.getElementById("bcount").textContent = B.count;
    document.getElementById("bleft").textContent = B.left > 0 ? "เหลือ " + fmtClock(B.left) : "รอบสุดท้าย";
  }

  /* ---------- gentle chime (Web Audio) ---------- */
  var actx = null;
  function ctx() {
    if (!actx) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; actx = new C(); }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  function chime() {
    var c = ctx(); if (!c) return;
    var t = c.currentTime;
    [[528, 0.18], [792, 0.08], [1056, 0.04]].forEach(function (p, i) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = p[0];
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(p[1], t + 0.08 + i * 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 4.1);
    });
  }

  /* ---------- sound mixer ---------- */
  var SOUNDS = [
    ["rain", "ฝน", I.rain], ["waves", "คลื่น", I.wave], ["fire", "กองไฟ", I.fire],
    ["crickets", "ป่ากลางคืน (จิ้งหรีด)", I.leaf], ["fan", "พัดลม", I.fan], ["noise", "เสียงซ่า", I.noise]
  ];
  var VOL = [0.12, 0.25, 0.45, 0.7, 1.0];
  /* v3: lullabies (เพลงกล่อม) share the engine, the master gain and the sleep timer with the nature sounds.
     One lullaby at a time; its own volume (5 steps) saved in nightlight-music; off by default. */
  var MUS_KEY = "nightlight-music", MISSING = {}, musChecked = false;
  function isMus(id) { return id.indexOf("lullaby-") === 0; }
  function musCfg() {
    var m = null; try { m = JSON.parse(localStorage.getItem(MUS_KEY)); } catch (e) {}
    return { vol: m && m.vol >= 0 && m.vol <= 4 ? m.vol : 2, last: m && m.last || "" };
  }
  var MUS = musCfg();
  function musSave() { try { localStorage.setItem(MUS_KEY, JSON.stringify(MUS)); } catch (e) {} }
  function trackById(id) { return LULL.filter(function (t) { return t.id === id; })[0]; }
  function soundName(id) { if (isMus(id)) { var t = trackById(id); return t ? t.name : id; } var x = SOUNDS.filter(function (q) { return q[0] === id; })[0]; return x ? x[1] : id; }
  var FADE_S = 40;   /* the shared sleep timer fades everything out over the last 40 s, then stops */
  var Snd = {
    nodes: {}, buffers: {}, master: null, end: 0, iv: null, fading: false,
    ext: function () { var a = document.createElement("audio"); return a.canPlayType('audio/ogg; codecs="vorbis"') ? "ogg" : "m4a"; },
    cfg: function (id) { return state.snd[id] || (state.snd[id] = { on: false, vol: 2 }); },
    level: function (id) { return VOL[isMus(id) ? MUS.vol : this.cfg(id).vol]; },
    ensureMaster: function () { var c = ctx(); if (!c) return null; if (!this.master) { this.master = c.createGain(); this.master.connect(c.destination); } return c; },
    start: function (id) {
      var self = this, c = this.ensureMaster(), url = "assets/sounds/" + id + "." + this.ext(), v = this.level(id);
      if (this.nodes[id]) return;
      var node = { gain: null, src: null, el: null }; this.nodes[id] = node;
      state.lastSnd = id;
      function viaElement() { // fallback when fetch is not possible (e.g. opened from file://)
        if (self.nodes[id] !== node) return;
        var el = new Audio(url); el.loop = true; el.volume = v * self.masterLevel(); el.play().catch(function () {}); node.el = el;
      }
      if (!c || location.protocol === "file:") { viaElement(); return; }
      var go = function (buf) {
        if (self.nodes[id] !== node) return;
        var src = c.createBufferSource(), g = c.createGain(); src.buffer = buf; src.loop = true; g.gain.value = self.level(id);
        src.connect(g); g.connect(self.master); src.start(); node.src = src; node.gain = g;
      };
      if (this.buffers[id]) go(this.buffers[id]);
      else fetch(url).then(function (r) { if (!r.ok) throw new Error("missing"); return r.arrayBuffer(); }).then(function (ab) { return c.decodeAudioData(ab); })
        .then(function (buf) { buf = self.exactLoop(c, buf, self.loopOf(id)); self.buffers[id] = buf; go(buf); })
        .catch(function (e) { if (e && e.message === "missing") { MISSING[id] = true; self.stop(id); if (current === "music" || current === "sounds") render(); } else viaElement(); });
    },
    /* AAC (.m4a, Safari) adds encoder padding: up to ~2k priming samples at the start (if the decoder keeps them)
       and a padded, faded last frame. Cut the decoded audio to exactly one loop so the wrap point is the seamless
       crossfade made by tools/make_sounds.py / make_lullabies.py, not the padding (which would click).
       v3: the loop length is per file (nature 24 s; lullabies 48 s / 51.43 s), not a fixed 24 s. */
    LOOP_S: 24,
    loopOf: function (id) { var t = trackById(id); return t ? t.loop : this.LOOP_S; },
    exactLoop: function (c, buf, secs) {
      var sr = buf.sampleRate, n = Math.round((secs || this.LOOP_S) * sr), d = buf.getChannelData(0), off = 0, lim = Math.min(d.length, 4096);
      while (off < lim && Math.abs(d[off]) < 1e-4) off++;
      if (off >= lim) off = 0;
      if (off + n > d.length) return buf;
      var out = c.createBuffer(buf.numberOfChannels, n, sr);
      for (var ch = 0; ch < buf.numberOfChannels; ch++) out.getChannelData(ch).set(buf.getChannelData(ch).subarray(off, off + n));
      return out;
    },
    stop: function (id) { var n = this.nodes[id]; if (!n) return; try { if (n.src) n.src.stop(); } catch (e) {} if (n.el) n.el.pause(); delete this.nodes[id]; },
    setVol: function (id) { var n = this.nodes[id], v = this.level(id); if (!n) return; if (n.gain) n.gain.gain.setTargetAtTime(v, actx.currentTime, 0.1); if (n.el) n.el.volume = v * this.masterLevel(); },
    masterLevel: function () { if (!this.end) return 1; var left = (this.end - Date.now()) / 1000; return left >= FADE_S ? 1 : Math.max(0, left / FADE_S); },
    playingNames: function () { var self = this; return SOUNDS.filter(function (s) { return self.nodes[s[0]]; }).map(function (s) { return s[1]; }); },
    musicPlaying: function () { var self = this; return (LULL.filter(function (t) { return self.nodes[t.id]; })[0] || {}).id || null; },
    allNames: function () { var m = this.musicPlaying(), n = this.playingNames(); return (m ? ["เพลง" + soundName(m)] : []).concat(n.length ? [n.join(", ")] : []); },
    anyPlaying: function () { return Object.keys(this.nodes).length > 0; },
    playMusic: function (id) {
      var cur = this.musicPlaying(); if (cur === id) return;
      if (cur) this.stop(cur);
      MUS.last = id; musSave(); this.start(id);
    },
    stopMusic: function () { var m = this.musicPlaying(); if (m) this.stop(m); this.idleCheck(); },
    stopNature: function () { var self = this; SOUNDS.forEach(function (s) { self.stop(s[0]); self.cfg(s[0]).on = false; }); this.idleCheck(); save(); },
    idleCheck: function () { if (!this.anyPlaying() && this.end) this.setTimer(0); },
    stopAll: function () {
      var self = this; Object.keys(this.nodes).forEach(function (id) { self.stop(id); });
      SOUNDS.forEach(function (s) { self.cfg(s[0]).on = false; });
      this.setTimer(0); save();
    },
    setTimer: function (min) {
      var self = this; clearInterval(this.iv); this.iv = null; this.fading = false; state.sndTimer = min;
      if (this.master && actx) { this.master.gain.cancelScheduledValues(actx.currentTime); this.master.gain.setValueAtTime(1, actx.currentTime); }
      this.end = min ? Date.now() + min * 60000 : 0;
      if (!min) { updateTimerLabel(); return; }
      this.iv = setInterval(function () { self.tick(); }, 1000);
      updateTimerLabel();
    },
    tick: function () {
      var self = this, left = (this.end - Date.now()) / 1000;
      if (!this.end) return;
      if (left <= FADE_S && !this.fading) { // fade out over the last 40 s (Web Audio ramp; <audio> fallback steps each second)
        this.fading = true;
        if (this.master && actx) { this.master.gain.setValueAtTime(this.master.gain.value, actx.currentTime); this.master.gain.linearRampToValueAtTime(0, actx.currentTime + Math.max(0.1, left)); }
      }
      Object.keys(this.nodes).forEach(function (id) { var n = self.nodes[id]; if (n.el) n.el.volume = self.level(id) * self.masterLevel(); });
      if (left <= 0) { this.stopAll(); state.sndTimer = 0; save(); if (current === "sounds" || current === "music" || current === "night" || current === "bedtime") render(); return; }
      updateTimerLabel();
    }
  };
  function updateTimerLabel() {
    var el = document.getElementById("tleft2"); if (!el) return;
    el.textContent = Snd.end ? "จะค่อย ๆ เบาลง แล้วหยุดเองในอีก " + fmtClock((Snd.end - Date.now()) / 1000) + " นาที" : "ยังไม่ได้ตั้งเวลา เปิดไว้จนกว่าจะกดหยุด";
  }
  function timerCard() {
    return '<div class="card timer-card"><div class="card-head">' + I.clock + '<b>ตั้งเวลาให้เพลงและเสียงค่อย ๆ เบาลง แล้วหยุด</b></div>' +
      '<div class="seg" role="group" aria-label="ตั้งเวลาปิดเพลงและเสียง">' +
      [[0, "ไม่ตั้งเวลา"], [15, "15 นาที"], [30, "30 นาที"], [45, "45 นาที"], [60, "60 นาที"]].map(function (t) {
        return '<button class="' + (state.sndTimer === t[0] ? "on" : "") + '" data-stimer="' + t[0] + '" aria-pressed="' + (state.sndTimer === t[0]) + '">' + t[1] + '</button>';
      }).join("") + '</div><p class="sub" id="tleft2"></p><p class="sub small">ใช้เวลาเดียวกันทั้งเพลงกล่อมและเสียงก่อนนอน</p></div>';
  }
  function volRow(key, label, vol) {
    return '<div class="vol" role="group" aria-label="ความดัง ' + label + '"><button class="round" ' + key + ' data-d="-1" aria-label="เบาลง ' + label + '"' + (vol <= 0 ? " disabled" : "") + '>' + I.minus + '</button>' +
      '<span class="steps" aria-label="ความดัง ' + (vol + 1) + ' จาก 5">' + [0, 1, 2, 3, 4].map(function (k) { return '<i class="' + (k <= vol ? "f" : "") + '" style="height:' + (10 + k * 5) + 'px"></i>'; }).join("") +
      '<em>' + (vol + 1) + '/5</em></span>' +
      '<button class="round" ' + key + ' data-d="1" aria-label="ดังขึ้น ' + label + '"' + (vol >= 4 ? " disabled" : "") + '>' + I.plus + '</button></div>';
  }
  screens.sounds = function () {
    return '<section class="screen sub sounds">' + topbar("bedtime", "เสียงก่อนนอน") +
      '<div class="body scroll"><p class="lead">เปิดได้หลายเสียงพร้อมกัน ปรับเสียงดังเบาด้วยปุ่ม − และ +</p>' +
      SOUNDS.map(function (s) {
        var c = Snd.cfg(s[0]), on = !!Snd.nodes[s[0]];
        return '<div class="snd' + (on ? " on" : "") + '" data-snd-row="' + s[0] + '"><button class="snd-toggle" data-snd="' + s[0] + '" aria-pressed="' + on + '">' +
          '<span class="ico">' + s[2] + '</span><span class="tx"><b>' + s[1] + '</b><span class="st">' + (on ? I.play + "กำลังเล่น" : "แตะเพื่อเปิด") + '</span></span><span class="onoff">' + (on ? "ปิด" : "เปิด") + '</span></button>' +
          volRow('data-vol="' + s[0] + '"', s[1], c.vol) + '</div>';
      }).join("") + timerCard() +
      '<p class="fine-print">' + I.info + '<span>เสียงทั้งหมดสร้างขึ้นเองด้วยโปรแกรมสำหรับเดโมนี้</span></p></div>' +
      '<div class="foot"><button class="btn primary" id="stopNature"' + (Snd.playingNames().length ? "" : " disabled") + '>' + I.stop + '<span>หยุดเสียงทั้งหมด</span></button></div></section>';
  };

  /* ---------- v3: เพลงกล่อม ---------- */
  function checkTracks() {
    if (musChecked || location.protocol === "file:") return; musChecked = true;
    var ext = Snd.ext();
    LULL.forEach(function (t) {
      fetch("assets/sounds/" + t.id + "." + ext, { method: "HEAD" }).then(function (r) { if (!r.ok) { MISSING[t.id] = true; if (current === "music") render(); } }).catch(function () {});
    });
  }
  screens.music = function () {
    var cur = Snd.musicPlaying(), list = LULL.filter(function (t) { return !MISSING[t.id]; });
    return '<section class="screen sub music">' + topbar("bedtime", "เพลงกล่อม") +
      '<div class="body scroll"><p class="lead">เลือกได้ทีละเพลง เปิดพร้อมเสียงก่อนนอนก็ได้</p>' +
      (list.length ? list.map(function (t) {
        var on = cur === t.id;
        return '<button class="track' + (on ? " on" : "") + '" data-mus="' + t.id + '" aria-pressed="' + on + '"><span class="ico">' + I.note + '</span>' +
          '<span class="tx"><b>' + t.name + '</b><span class="st">' + (on ? I.play + "กำลังเล่น" : t.note) + '</span></span><span class="onoff">' + (on ? "หยุด" : "เล่น") + '</span></button>';
      }).join("") : '<p class="empty">ยังไม่มีเพลงในเครื่องนี้</p>') +
      '<div class="card"><div class="card-head">' + I.music + '<b>ความดังของเพลง</b></div>' + volRow('data-mvol="1"', "เพลงกล่อม", MUS.vol) + '</div>' +
      timerCard() +
      '<p class="fine-print">' + I.info + '<span>เพลงทั้งหมดแต่งและสร้างขึ้นเองสำหรับเดโมนี้</span></p></div>' +
      '<div class="foot"><button class="btn primary" id="stopMusic"' + (cur ? "" : " disabled") + '>' + I.stop + '<span>หยุดเพลง</span></button></div></section>';
  };

  /* ---------- v3: ถ้าตื่นกลางดึก ---------- */
  screens.night = function () {
    var id = state.lastSnd && (isMus(state.lastSnd) ? trackById(state.lastSnd) && !MISSING[state.lastSnd] : SOUNDS.some(function (x) { return x[0] === state.lastSnd; })) ? state.lastSnd : "rain";
    var playing = Snd.anyPlaying();
    return '<section class="screen sub night">' + topbar("bedtime", "ถ้าตื่นกลางดึก") +
      '<div class="body scroll center-col"><p class="lead center">ไม่ต้องรีบ ค่อย ๆ หายใจตามวงกลม</p>' +
      '<div class="orb-wrap"><div class="orb run"></div><div class="orb-tx"><span class="night-word">หายใจเข้าช้า ๆ<br>แล้วหายใจออกยาว ๆ</span></div></div>' +
      '<p class="sub center" id="tleft2"></p></div>' +
      '<div class="foot">' + (playing ? '<button class="btn ghost big" id="nightStop">' + I.stop + '<span>หยุดเสียง</span></button>'
        : '<button class="btn primary big" id="nightPlay" data-id="' + id + '">' + I.play + '<span>' + (isMus(id) ? "เปิดเพลง" : "เปิดเสียง") + soundName(id) + '</span></button>') + '</div></section>';
  };

  /* ---------- reading ---------- */
  screens.read = function () {
    return '<section class="screen sub read">' + topbar("bedtime", "อ่านก่อนนอน 5 นาที") +
      '<div class="body scroll"><p class="lead">อ่านเรื่องสั้น ๆ ช้า ๆ แล้ววางมือถือลงได้เลย</p>' + STORIES.map(function (s) {
        return '<a class="story" href="#reader/' + s.id + '"><span class="th">' + Art.thumb(s.thumb) + '</span><span class="tx"><b>' + s.title + '</b><span class="teaser">“' + s.teaser + '”</span>' +
          '<span class="meta">' + I.clock + 'อ่าน ' + s.minutes + ' นาที' + (state.read[s.id] ? ' · อ่านแล้ว ' + I.check : "") + '</span></span>' + I.chev + '</a>';
      }).join("") + '</div></section>';
  };
  var timer = { left: 300, running: false, iv: null };
  function stopTimer() { clearInterval(timer.iv); timer.iv = null; timer.running = false; }
  screens.reader = function (id) {
    var s = STORIES.filter(function (x) { return x.id === id; })[0] || STORIES[0];
    var done = !!state.read[s.id];
    var body = s.body.map(function (p, i) { return '<p' + (i === s.body.length - 1 ? ' class="end"' : "") + '>' + p + '</p>'; }).join("");
    return '<section class="screen sub reader" data-id="' + s.id + '">' + topbar("read", "กำลังอ่าน") +
      '<div class="timer"><div class="ring"><svg viewBox="0 0 88 88" aria-hidden="true"><circle cx="44" cy="44" r="40" fill="none" stroke="rgba(246,227,161,.18)" stroke-width="5"/>' +
      '<circle id="ringc" cx="44" cy="44" r="40" fill="none" stroke="#F6E3A1" stroke-width="5" stroke-linecap="round" stroke-dasharray="251.3" stroke-dashoffset="0"/></svg><span class="t" id="tleft">5:00</span></div>' +
      '<div class="tl"><b>พักสายตา 5 นาที</b><span>อ่านจบแล้วหลับตาต่อได้เลย</span></div>' +
      '<button class="icon-btn" id="tbtn" aria-label="หยุดเวลาไว้ก่อน">' + I.pause + '</button></div>' +
      '<article class="reading scroll"><h2>' + s.title + '</h2>' + body + '</article>' +
      '<div class="foot"><button class="btn ' + (done ? "done" : "primary") + '" id="gn">' + (done ? I.check + "<span>ฝันดีนะ · ได้แสงแล้ว</span>" : I.spark + "<span>ฝันดีนะ +" + READ_REWARD + " แสง</span>") + '</button></div></section>';
  };
  function startReader() { stopTimer(); timer.left = 300; renderTimer(); timer.running = true; timer.iv = setInterval(tick, 1000); setTBtn(); }
  function tick() {
    if (!document.getElementById("tleft")) { stopTimer(); return; }
    timer.left = Math.max(0, timer.left - 1); renderTimer();
    if (timer.left === 0) { stopTimer(); setTBtn(); toast("ครบ 5 นาทีแล้ว วางมือถือลงได้เลยนะ"); }
  }
  function renderTimer() {
    var t = document.getElementById("tleft"), c = document.getElementById("ringc"); if (!t) return;
    t.textContent = fmtClock(timer.left);
    c.setAttribute("stroke-dashoffset", (251.3 * (1 - timer.left / 300)).toFixed(1));
  }
  function setTBtn() {
    var b = document.getElementById("tbtn"); if (!b) return;
    b.innerHTML = timer.running ? I.pause : I.play; b.setAttribute("aria-label", timer.running ? "หยุดเวลาไว้ก่อน" : "เดินเวลาต่อ");
  }
  function toggleTimer() {
    if (timer.running) stopTimer();
    else { if (timer.left === 0) timer.left = 300; timer.running = true; timer.iv = setInterval(tick, 1000); renderTimer(); }
    setTBtn();
  }

  /* ---------- gratitude ---------- */
  function thDate(iso) {
    var m = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."], p = iso.split("-");
    return (+p[2]) + " " + m[+p[1] - 1] + " " + (+p[0] + 543);
  }
  screens.gratitude = function () {
    var gotToday = state.noteDay === todayIso();
    return '<section class="screen sub gratitude">' + topbar("bedtime", "ขอบคุณวันนี้") +
      '<div class="body scroll">' +
      '<label class="field"><span class="flabel">' + I.heart + 'วันนี้ขอบคุณอะไร</span><textarea id="g1" rows="3" placeholder="เช่น ขอบคุณลูกที่โทรมาหา"></textarea></label>' +
      '<label class="field"><span class="flabel">' + I.pencil + 'เรื่องในหัวที่ขอวางไว้ก่อน <small>(ไม่เขียนก็ได้)</small></span><textarea id="g2" rows="2" placeholder="เขียนไว้ตรงนี้ พรุ่งนี้ค่อยคิดต่อ"></textarea></label>' +
      '<p class="sub">' + I.lock + ' เก็บไว้ในเครื่องนี้เท่านั้น · ' + (gotToday ? 'วันนี้ได้ +' + NOTE_REWARD + ' แสงแล้ว ' + I.check : 'บันทึกวันนี้ได้ +' + NOTE_REWARD + ' แสง (เดโม)') + '</p>' +
      '<button class="btn primary" id="gsave">' + I.check + '<span>บันทึก</span></button>' +
      '<h2 class="sec">' + I.book + 'บันทึกที่ผ่านมา</h2>' +
      (state.notes.length ? state.notes.map(function (n) {
        return '<div class="note-item"><div class="nd">' + thDate(n.date) + '</div><p>' + esc(n.thanks) + '</p>' + (n.mind ? '<p class="mind"><b>วางไว้ก่อน:</b> ' + esc(n.mind) + '</p>' : "") +
          '<button class="btn ghost small del" data-del="' + n.id + '">' + I.trash + '<span>ลบ</span></button></div>';
      }).join("") : '<p class="empty">ยังไม่มีบันทึก</p>') +
      '</div></section>';
  };
  function saveNote() {
    var a = document.getElementById("g1").value.trim(), b = document.getElementById("g2").value.trim();
    if (!a) { toast("เขียนเรื่องที่ขอบคุณสักนิดก่อนนะ", true); document.getElementById("g1").focus(); return; }
    var t = todayIso(), bonus = state.noteDay !== t;
    state.notes.unshift({ id: Date.now(), date: t, thanks: a, mind: b });
    if (bonus) { state.balance += NOTE_REWARD; state.noteDay = t; }
    save(); render(); toast(bonus ? "บันทึกแล้ว ได้ +" + NOTE_REWARD + " แสง (เดโม)" : "บันทึกแล้ว");
  }
  function delNote(id) {
    modal({ title: "ลบบันทึกนี้ไหม?", body: "ลบแล้วจะเอาคืนไม่ได้", actions: [
      { label: "ไม่ลบ", icon: I.close, kind: "primary" },
      { label: "ลบเลย", icon: I.trash, kind: "ghost danger", fn: function () { state.notes = state.notes.filter(function (n) { return n.id !== id; }); save(); render(); toast("ลบแล้ว"); } }
    ] });
  }

  /* ---------- wind-down reminder (demo) ---------- */
  function hhmm(m) { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
  screens.winddown = function () {
    var w = state.wind;
    return '<section class="screen sub winddown">' + topbar("bedtime", "เวลาเตรียมนอน") +
      '<div class="body scroll">' +
      '<div class="banner">' + I.info + '<span><b>เดโม: ยังไม่แจ้งเตือนจริง</b></span></div>' +
      '<p class="lead">เลือกเวลาที่อยากเริ่มพักก่อนนอน แนะนำราว 30 นาทีก่อนเข้านอน (เป้า 23:00 น.)</p>' +
      '<div class="card time-pick"><button class="round big" id="wminus" aria-label="เร็วขึ้น 15 นาที">' + I.minus + '</button>' +
      '<div class="tp"><span class="big-time">' + hhmm(w.time) + '</span><span>น.</span></div>' +
      '<button class="round big" id="wplus" aria-label="ช้าลง 15 นาที">' + I.plus + '</button></div>' +
      '<p class="sub center">ปรับครั้งละ 15 นาที</p>' +
      '<div class="row toggle-row"><span class="ico">' + I.bell + '</span><span class="txt"><span class="name">เตือนให้เตรียมนอน</span><span class="sub">ทุกวัน เวลา ' + hhmm(w.time) + ' น.</span></span>' +
      '<button class="switch" role="switch" aria-checked="' + w.on + '" id="wtoggle" aria-label="เตือนให้เตรียมนอน"><span class="knob"></span><span class="st">' + (w.on ? "เปิด" : "ปิด") + '</span></button></div>' +
      '</div><div class="foot"><button class="btn primary" id="wsave">' + I.check + '<span>บันทึก</span></button></div></section>';
  };

  /* ---------- stats ---------- */
  screens.stats = function () {
    var s = S(), last = s.nights.slice(-7);
    var total = last.reduce(function (a, r) { return a + window.NL_lightFor(r.night).total; }, 0);
    var avg = Math.round(last.reduce(function (a, r) { return a + r.night.mins; }, 0) / last.length);
    var ontime = last.filter(function (r) { return r.kind === "ontime"; }).length;
    return '<section class="screen sub stats">' + topbar("settings", "สถิติการนอน") +
      '<div class="body scroll"><p class="lead">' + last.length + ' คืนล่าสุด (' + last[0].night.label + ' – ' + last[last.length - 1].night.label + ')</p>' + dataLabel() +
      '<a class="row link" href="#week"><span class="ico">' + I.week + '</span><span class="txt"><span class="name">สรุปการนอน 7 คืน</span><span class="sub">ดูแบบง่าย ๆ เป็นประโยค</span></span>' + I.chev + '</a>' +
      '<div class="card chart"><div class="card-head">' + I.chart + '<b>ชั่วโมงนอน</b></div>' + chartSVG(last) +
      '<div class="legend"><span>' + I.star + 'ตรงเวลา</span><span>' + I.restMoon + 'คืนพัก</span><span>' + I.lateDot + 'นอนดึก</span><span><i class="dash"></i>7 ชม. = แสงเต็ม</span></div>' +
      '</div>' +
      '<h2 class="sec">' + I.moon + 'แต่ละคืน</h2><div class="night-list">' + last.slice().reverse().map(function (r) {
        var n = r.night, L = window.NL_lightFor(n), k = { ontime: [I.star, "ตรงเวลา"], rest: [I.restMoon, "คืนพัก"], late: [I.lateDot, "นอนดึก"] }[r.kind];
        return '<div class="nrow"><span class="nd">' + n.day + ' ' + n.label + '</span><span class="nh">' + fmtHM(n.mins) + '<small>เข้านอน ' + n.bed + ' น.</small></span><span class="nk">' + k[0] + k[1] + '</span><span class="nl">+' + L.total + '</span></div>';
      }).join("") + '</div>' +
      '<div class="tiles">' +
      '<div class="tile"><div class="k">' + I.moon + 'นอนเฉลี่ย</div><div class="v">' + Math.floor(avg / 60) + '<small>ชม.</small> ' + (avg % 60) + '<small>นาที</small></div></div>' +
      '<div class="tile"><div class="k">' + I.clock + 'ตรงเวลา</div><div class="v">' + ontime + '<small>/' + last.length + ' คืน</small></div></div>' +
      '<div class="tile"><div class="k">' + I.spark + 'แสงจากการนอน</div><div class="v light">' + total + '<small>แสง</small></div></div>' +
      '<div class="tile"><div class="k">' + I.restMoon + 'คืนพักสัปดาห์นี้</div><div class="v">' + s.restUsedThisWeek + '<small>/2 ใช้แล้ว</small></div></div></div>' +
      '<div class="card"><div class="card-head">' + I.star + '<b>ต่อกันตอนนี้ ' + s.run + ' คืน · ตรงเวลารวม ' + s.totalOnTime + ' คืน</b></div>' +
      '<p class="sub">คืนที่นอนดึกจะใช้คืนพักให้เอง (สัปดาห์ละ 2 คืน เริ่มนับใหม่ทุกวันจันทร์) ไม่มีอะไรหายไป</p></div>' +
      '</div></section>';
  };
  function chartSVG(rows) {
    var W = 326, H = 200, top = 26, bot = 32, left = 30;
    var maxH = Math.min(12, Math.max(9, Math.ceil(Math.max.apply(0, rows.map(function (r) { return r.night.mins / 60; })))));
    var ph = H - top - bot, bw = 26, step = (W - left - 4) / rows.length;
    var y = function (h) { return top + ph * (1 - h / maxH); };
    var col = { ontime: "#FFD27A", rest: "#C7BCF5", late: "#8D94C4" };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="กราฟชั่วโมงนอน ' + rows.length + ' คืน ' + (IMP ? "ข้อมูลที่คุณนำเข้า" : "ข้อมูลตัวอย่าง") + '">';
    [0, 3, 6, 9, 12].filter(function (h) { return h <= maxH; }).forEach(function (h) {
      s += '<line x1="' + left + '" x2="' + (W - 4) + '" y1="' + y(h) + '" y2="' + y(h) + '" stroke="rgba(221,224,245,.18)"/>' +
        '<text x="' + (left - 8) + '" y="' + (y(h) + 5) + '" text-anchor="end" font-size="16" fill="#C2C7EA">' + h + '</text>';
    });
    s += '<line x1="' + left + '" x2="' + (W - 4) + '" y1="' + y(7) + '" y2="' + y(7) + '" stroke="#FFF3C4" stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="5 4"/>';
    rows.forEach(function (r, i) {
      var n = r.night, cx = left + step * i + step / 2, yt = y(n.mins / 60), x = cx - bw / 2, base = y(0), rr = 5, last = i === rows.length - 1;
      s += '<g class="bar">' +
        '<path d="M' + x + ' ' + base + ' V' + (yt + rr) + ' Q' + x + ' ' + yt + ' ' + (x + rr) + ' ' + yt + ' H' + (x + bw - rr) + ' Q' + (x + bw) + ' ' + yt + ' ' + (x + bw) + ' ' + (yt + rr) + ' V' + base + 'Z" fill="' + col[r.kind] + '"' + (last ? ' stroke="#FFFFFF" stroke-width="2.5"' : '') + '/>' + glyph(r.kind, cx, base - 14) +
        '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" font-size="16" fill="' + (last ? "#FFFFFF" : "#C2C7EA") + '"' + (last ? ' font-weight="700"' : "") + '>' + n.day + '</text></g>';
    });
    return s + '</svg>';
  }
  function glyph(st, x, y) {
    if (st === "ontime") return '<path transform="translate(' + x + ' ' + y + ') scale(.42) translate(-12 -12)" d="' + SPARK_D + '" fill="#1A1633"/>';
    if (st === "rest") return '<path transform="translate(' + x + ' ' + y + ') scale(.46) translate(-12 -12)" d="M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4z" fill="#1A1633"/>';
    return '<circle cx="' + x + '" cy="' + y + '" r="4" fill="none" stroke="#1A1633" stroke-width="2"/>';
  }

  /* ---------- v3: สรุปการนอน 7 คืน (ตัวเลขชุดเดียวกับหน้าสถิติ) ---------- */
  function weekNumbers() {
    var last = S().nights.slice(-7);
    return { rows: last, avg: Math.round(last.reduce(function (a, r) { return a + r.night.mins; }, 0) / last.length),
      ontime: last.filter(function (r) { return r.kind === "ontime"; }).length, rest: last.filter(function (r) { return r.kind === "rest"; }).length };
  }
  function fmtLong(m) { var h = Math.floor(m / 60), mm = m % 60; return h + " ชั่วโมง" + (mm ? " " + mm + " นาที" : ""); }
  var weekBack = "settings";
  screens.week = function () {
    var w = weekNumbers(), k = w.rows.length;
    var s1 = k + " คืนที่ผ่านมา นอนเฉลี่ย " + fmtLong(w.avg) + " · เข้านอนตรงเวลา " + w.ontime + " คืน";
    var s2 = w.ontime >= 5 ? "เยี่ยมเลย ฟ้าของคุณสว่างขึ้นอีกหลายดวง" : w.ontime >= 3 ? "ดีแล้ว ค่อย ๆ ไปทีละคืนนะ" : "ไม่เป็นไร คืนนี้เริ่มใหม่ได้เสมอ";
    if (w.rest) s2 = "ใช้คืนพัก " + w.rest + " คืน ไม่มีอะไรหายไป · " + s2;
    return '<section class="screen sub week">' + topbar(weekBack, "สรุปการนอน 7 คืน") +
      '<div class="body scroll"><div class="card week-say"><p class="say1" id="weekS1">' + s1 + '</p><p class="say2" id="weekS2">' + s2 + '</p>' + dataLabel() + '</div>' +
      '<div class="wk-list">' + w.rows.map(function (r) {
        var n = r.night, k2 = { ontime: [I.star, "ตรงเวลา"], rest: [I.restMoon, "คืนพัก"], late: [I.lateDot, "นอนดึก"] }[r.kind];
        var d = new Date(n.date + "T12:00:00Z");
        return '<div class="wk-row ' + r.kind + '"><div class="wk-top"><b>' + TH_DAYS[d.getUTCDay()] + ' ' + n.label + '</b><span class="wk-k">' + k2[0] + k2[1] + '</span></div>' +
          '<div class="wk-bar" aria-hidden="true"><i style="width:' + (Math.min(n.mins, 600) / 6).toFixed(1) + '%"></i><em></em></div>' +
          '<span class="wk-h">นอน ' + fmtLong(n.mins) + '</span></div>';
      }).join("") + '</div>' +
      '<p class="sub small center"><i class="wk-tick-key"></i> เส้นตรงกลางคือ 7 ชั่วโมง (แสงเต็ม)</p></div></section>';
  };

  /* ---------- v3: settings helpers (warm light, season, idle lock) ---------- */
  var WARM_KEY = "nightlight-warm", SEASON_KEY = "nightlight-season", IDLE_KEY = "nightlight-idle";
  function warmGet() {
    try { var w = JSON.parse(localStorage.getItem(WARM_KEY)); if (w && typeof w.on === "boolean") return { on: w.on, dim: [0, 1, 2, 3].indexOf(w.dim) > -1 ? w.dim : 0 }; } catch (e) {}
    return { on: false, dim: 0 };
  }
  function warmSet(w) { try { localStorage.setItem(WARM_KEY, JSON.stringify(w)); } catch (e) {} warmApply(); }
  function warmApply() { var w = warmGet(), h = document.documentElement; h.classList.toggle("warm", w.on); h.setAttribute("data-dim", w.on ? w.dim : 0); }
  warmApply();
  var NOW_OVERRIDE = null;
  function bkkDate() {
    var d = NOW_OVERRIDE ? new Date(NOW_OVERRIDE) : new Date();
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(d); }
    catch (e) { return new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 10); }
  }
  function seasonPick() { var v = null; try { v = localStorage.getItem(SEASON_KEY); } catch (e) {} return SEASONS.some(function (x) { return x.id === v; }) ? v : "auto"; }
  function seasonNow() { var p = seasonPick(); return p === "auto" ? window.NL_seasonForDate(bkkDate()) : p; }
  function seasonName(id) { return (SEASONS.filter(function (x) { return x.id === id; })[0] || {}).name || id; }
  function seaLayoutKey() { var s = seasonNow(); return s === "normal" || !Art.PLACE_LAYOUT["sea-" + s] ? "sea" : "sea-" + s; }
  function layoutKey() { return state.place === "sea" ? seaLayoutKey() : state.place; }
  function idleMin() { var v = null; try { v = localStorage.getItem(IDLE_KEY); } catch (e) {} return v === "off" ? 0 : [5, 10, 15].indexOf(+v) > -1 ? +v : 10; }
  function settingCard(icon, title, sub, id, on) {
    return '<div class="card"><div class="motion-row"><div class="motion-tx"><b>' + title + '</b><span class="sub">' + sub + '</span></div>' +
      '<button class="switch" role="switch" aria-checked="' + on + '" id="' + id + '" aria-label="' + title + '"><span class="knob"></span><span class="st">' + (on ? "เปิด" : "ปิด") + '</span></button></div>';
  }
  function warmCard() {
    var w = warmGet();
    return settingCard(I.sun, "โหมดแสงอุ่น", "แสงบนจออุ่นขึ้น ดูสบายตาก่อนนอน", "warmToggle", w.on) +
      (w.on ? '<p class="opt-label">ความสว่างของจอในแอป</p><div class="seg grid" role="group" aria-label="ความสว่างของจอในแอป">' +
        [[0, "ปกติ"], [1, "หรี่นิดหน่อย"], [2, "หรี่ลง"], [3, "หรี่มาก"]].map(function (d) {
          return '<button class="' + (w.dim === d[0] ? "on" : "") + '" data-dim="' + d[0] + '" aria-pressed="' + (w.dim === d[0]) + '">' + d[1] + '</button>';
        }).join("") + '</div>' : "") + '</div>';
  }
  function seasonCard() {
    var pick = seasonPick(), now = seasonNow();
    return '<div class="card"><div class="card-head">' + I.garden + '<b>ฉากตามฤดู (สวนดาวริมทะเล)</b></div><div class="seg grid" role="group" aria-label="ฉากตามฤดู">' +
      SEASONS.map(function (x) {
        return '<button class="' + (pick === x.id ? "on" : "") + '" data-season="' + x.id + '" aria-pressed="' + (pick === x.id) + '">' + x.name + (x.id === "auto" ? " (เริ่มต้น)" : "") + '</button>';
      }).join("") + '</div><p class="sub" id="seasonNow">ตอนนี้เป็นฉาก: <b class="hi">' + seasonName(now) + '</b></p>' +
      '<p class="sub small">ตามวันที่: ลอยกระทง 21–26 พ.ย. (ปีนี้ตรงกับวันที่ 24 พ.ย. 2569) · สงกรานต์ 12–16 เม.ย. · หน้าหนาว ธ.ค.–ก.พ.</p></div>';
  }
  function idleCard() {
    var m = idleMin();
    return '<div class="card"><div class="card-head">' + I.lock + '<b>พักหน้าจอเมื่อไม่ได้แตะ</b></div><div class="seg grid" role="group" aria-label="พักหน้าจอเมื่อไม่ได้แตะ">' +
      [[5, "5 นาที"], [10, "10 นาที"], [15, "15 นาที"], [0, "ปิด"]].map(function (x) {
        return '<button class="' + (m === x[0] ? "on" : "") + '" data-idle="' + x[0] + '" aria-pressed="' + (m === x[0]) + '">' + x[1] + (x[0] === 10 ? " (เริ่มต้น)" : "") + '</button>';
      }).join("") + '</div><p class="sub">จอจะมืดลง เหลือแค่นาฬิกา เพลงและเสียงยังเล่นต่อ แตะค้างไว้เพื่อกลับมา</p></div>';
  }

  /* ---------- settings ---------- */
  var lastDemo = "";
  screens.settings = function () {
    var s = S(), k = fsKey();
    return '<section class="screen settings"><header class="head"><h1>' + I.gear + 'ตั้งค่า</h1></header><div class="body scroll">' +
      '<div class="card"><div class="card-head">' + I.textsize + '<b>ขนาดตัวอักษร</b></div><div class="seg fs" role="group" aria-label="ขนาดตัวอักษร">' +
      [["small", "เล็ก"], ["normal", "กลาง"], ["large", "ใหญ่"], ["xlarge", "ใหญ่มาก"]].map(function (f) {
        return '<button class="' + (k === f[0] ? "on" : "") + '" data-fs="' + f[0] + '" aria-pressed="' + (k === f[0]) + '"><span class="ka" style="font-size:' + Math.round(22 * FS[f[0]]) + 'px" aria-hidden="true">ก</span>' + f[1] + (f[0] === "normal" ? " (เริ่มต้น)" : "") + '</button>';
      }).join("") + '</div>' +
      '<p class="fs-preview" aria-live="polite"><small>ตัวอย่างข้อความ</small>คืนนี้ท้องฟ้าใส ดาวเล็ก ๆ ค่อย ๆ ส่องแสง</p></div>' +
      motionCard() + warmCard() + seasonCard() + idleCard() +
      '<div class="list">' +
      '<a class="row link" href="#stats"><span class="ico">' + I.chart + '</span><span class="txt"><span class="name">สถิติการนอน</span><span class="sub">7 คืนล่าสุด</span></span>' + I.chev + '</a>' +
      '<a class="row link" href="#week"><span class="ico">' + I.week + '</span><span class="txt"><span class="name">สรุปการนอน 7 คืน</span><span class="sub">อ่านง่าย เป็นประโยคสั้น ๆ</span></span>' + I.chev + '</a>' +
      '<a class="row link" href="#import"><span class="ico">' + I.heart + '</span><span class="txt"><span class="name">นำเข้าข้อมูลการนอนจาก Apple Health</span><span class="sub">' + (IMP ? "ใช้ข้อมูลที่นำเข้า " + IMP.nights.length + " คืน" : "ไฟล์อ่านในเครื่องนี้ ไม่ส่งไปไหน") + '</span></span>' + I.chev + '</a>' +
      '<a class="row link" href="#winddown"><span class="ico">' + I.bell + '</span><span class="txt"><span class="name">เวลาเตรียมนอน</span><span class="sub">' + (state.wind.on ? "เปิด · " + hhmm(state.wind.time) + " น." : "ปิดอยู่") + '</span></span>' + I.chev + '</a>' +
      '<a class="row link" href="#connect"><span class="ico">' + I.link + '</span><span class="txt"><span class="name">เชื่อมข้อมูลการนอน</span><span class="sub">แอปหรือนาฬิกาที่ใช้</span></span>' + I.chev + '</a>' +
      '<a class="row link" href="#morning"><span class="ico">' + I.spark + '</span><span class="txt"><span class="name">หน้าเช้านี้</span><span class="sub">แสงและการ์ดความฝัน</span></span>' + I.chev + '</a>' +
      '</div>' +
      (IMP ? '<div class="card demo-box"><div class="card-head">' + I.info + '<b>ทดลองกติกา</b></div><p class="sub">ตอนนี้ใช้ข้อมูลที่คุณนำเข้า ปุ่มเพิ่มคืนตัวอย่างจึงซ่อนไว้ ลบข้อมูลที่นำเข้าเมื่อไหร่ ปุ่มจะกลับมา</p></div>' :
      '<div class="card demo-box"><div class="card-head">' + I.info + '<b>ทดลองกติกา</b><span class="tag">เดโม</span></div>' +
      '<p class="sub">ต่อกันตอนนี้ <b class="hi">' + s.run + ' คืน</b> · ตรงเวลารวม <b class="hi">' + s.totalOnTime + ' คืน</b></p>' +
      '<p class="sub">คืนพักสัปดาห์นี้ ใช้แล้ว <b class="hi">' + s.restUsedThisWeek + '/2</b></p>' +
      '<div class="demo-btns"><button class="btn ghost" data-addnight="ontime">' + I.star + '<span>เพิ่มคืนตัวอย่าง: ตรงเวลา</span></button>' +
      '<button class="btn ghost" data-addnight="late">' + I.moon + '<span>เพิ่มคืนตัวอย่าง: นอนดึก</span></button></div>' +
      (lastDemo ? '<p class="demo-result" role="status">' + lastDemo + '</p>' : "") +
      '<p class="sub small">นอนดึกจะใช้คืนพักให้เอง (สัปดาห์ละ 2 คืน) ครบ 7 คืนต่อกันได้ฉากห้องนอนอบอุ่น</p></div>') +
      '<button class="btn ghost" id="resetBtn">' + I.reset + '<span>รีเซ็ตเดโม</span></button>' +
      '</div>' + tabbar("settings") + '</section>';
  };
  /* animation pass: "ภาพเคลื่อนไหว เปิด/ปิด" (default เปิด, saved in localStorage by js/ambient.js) */
  function motionCard() {
    var on = !window.Ambient || Ambient.settingOn();
    return '<div class="card"><div class="motion-row"><div class="motion-tx"><b>ภาพเคลื่อนไหว</b>' +
      '<span class="sub">หิ่งห้อย ดาว และกองไฟขยับช้า ๆ ปิดได้ถ้าอยากให้ภาพนิ่ง</span></div>' +
      '<button class="switch" role="switch" aria-checked="' + on + '" id="motionToggle" aria-label="ภาพเคลื่อนไหว"><span class="knob"></span><span class="st">' + (on ? "เปิด" : "ปิด") + '</span></button></div>' +
      (reduced ? '<p class="sub small">เครื่องนี้ตั้งให้ลดภาพเคลื่อนไหวไว้ ภาพจึงนิ่งอยู่</p>' : "") + '</div>';
  }
  function addNight(kind) {
    if (IMP) return;
    state.extra.push(kind); catCount();
    var s = S(), r = s.nights[s.nights.length - 1], L = window.NL_lightFor(r.night);
    state.balance += L.total; save();
    lastDemo = r.night.label + ": " + (r.kind === "ontime" ? "ตรงเวลา" : r.kind === "rest" ? "นอนดึก ใช้คืนพักให้แล้ว" : "นอนดึก คืนพักหมดแล้ว เริ่มนับต่อกันใหม่ (ไม่มีอะไรหาย)") + " · +" + L.total + " แสง";
    render();
  }
  function confirmReset() {
    modal({ title: "รีเซ็ตเดโมไหม?", body: "แสง ของแต่ง บันทึก และคืนตัวอย่างจะกลับเป็นค่าเริ่มต้น (ขนาดตัวอักษรยังเหมือนเดิม)", actions: [
      { label: "ไม่รีเซ็ต", icon: I.close, kind: "primary" },
      { label: "รีเซ็ตเลย", icon: I.reset, kind: "ghost danger", fn: function () { Snd.stopAll(); state = fresh(); MUS = { vol: 2, last: "" }; try { localStorage.removeItem(MUS_KEY); } catch (e) {} save(); lastDemo = ""; G.mode = G.sel = null; location.hash = "#splash"; toast("รีเซ็ตเดโมแล้ว"); } }
    ] });
  }

  /* ---------- v3: นำเข้าจาก Apple Health (อ่านในเครื่องเท่านั้น) ---------- */
  var IMPST = { busy: false, p: 0, err: "" };
  var IMP_ERR = {
    notzip: "ไฟล์นี้ไม่ใช่ export.zip หรือ export.xml ลองเลือกใหม่อีกครั้ง",
    noexport: "ไม่พบ export.xml ในไฟล์นี้ ลองส่งออกจากแอปสุขภาพอีกครั้ง",
    nosleep: "ไม่พบข้อมูลการนอนในไฟล์นี้",
    other: "อ่านไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง"
  };
  function thDateShort(iso) { var p = iso.split("-"); return (+p[2]) + " " + TH_MON[+p[1] - 1] + " " + (+p[0] + 543); }
  screens["import"] = function () {
    var body = '<div class="banner safe">' + I.lock + '<span><b>ไฟล์ไม่ออกจากเครื่องคุณ เราไม่ส่งไปที่ไหน</b><br>แอปอ่านไฟล์ในเครื่องนี้ แล้วเก็บไว้แค่สรุปเวลานอนแต่ละคืน</span></div>';
    if (IMP) {
      var a = IMP.nights[0], b = IMP.nights[IMP.nights.length - 1];
      body += '<div class="card got"><div class="card-head">' + I.check + '<b>นำเข้าแล้ว ' + IMP.nights.length + ' คืน</b></div>' +
        '<p class="sub">ตั้งแต่ ' + thDateShort(a.date) + ' ถึง ' + thDateShort(b.date) + '</p>' + IMPL +
        '<p class="sub">หน้าเช้านี้ สวน สถิติ และสรุป 7 คืน ใช้ข้อมูลชุดนี้แล้ว</p>' +
        '<button class="btn ghost danger" id="delImport">' + I.trash + '<span>ลบข้อมูลที่นำเข้า</span></button></div>';
    } else {
      body += '<div class="card"><div class="card-head">' + I.info + '<b>วิธีส่งออกไฟล์จาก iPhone</b></div><ol class="steps-list">' +
        '<li>เปิดแอป “สุขภาพ” (Health)</li><li>แตะรูปโปรไฟล์ที่มุมขวาบน</li><li>เลื่อนลงล่างสุด แตะ “ส่งออกข้อมูลสุขภาพทั้งหมด”</li><li>บันทึกไฟล์ export.zip ไว้ในแอป “ไฟล์” แล้วกดปุ่มด้านล่าง</li></ol>' +
        '<p class="sub">ใช้เฉพาะเวลาที่หลับ (ไม่นับเวลาที่แค่นอนอยู่บนเตียง) ถ้ามีทั้งนาฬิกาและ iPhone จะรวมช่วงที่ซ้อนกันให้ ไม่นับซ้ำ</p></div>';
    }
    if (IMPST.busy) body += '<div class="card" role="status"><div class="card-head">' + I.clock + '<b>กำลังอ่านไฟล์…</b></div>' +
      '<div class="progress big"><i id="impBar" style="width:' + Math.round(IMPST.p * 100) + '%"></i></div><p class="sub" id="impPct">อ่านแล้ว ' + Math.round(IMPST.p * 100) + '%</p>' +
      '<p class="sub">ไฟล์ใหญ่อาจใช้เวลาสักครู่ ไม่ต้องปิดหน้านี้</p></div>';
    if (IMPST.err) body += '<p class="warn-line" role="alert">' + I.info + '<span>' + IMPST.err + '</span></p>';
    return '<section class="screen sub import">' + topbar("settings", "นำเข้าจาก Apple Health") + '<div class="body scroll">' + body + '</div>' +
      '<div class="foot"><label class="btn ' + (IMP ? "ghost" : "primary big") + ' file-btn' + (IMPST.busy ? " busy" : "") + '">' + I.upload + '<span>' + (IMPST.busy ? "กำลังอ่านไฟล์…" : IMP ? "เลือกไฟล์ใหม่" : "เลือกไฟล์ export.zip") + '</span>' +
      '<input type="file" id="hfile" accept=".zip,.xml,application/zip,text/xml"' + (IMPST.busy ? " disabled" : "") + ' aria-label="เลือกไฟล์ export.zip หรือ export.xml"></label></div></section>';
  };
  function setImpProgress(p) {
    IMPST.p = p;
    var b = document.getElementById("impBar"), t = document.getElementById("impPct");
    if (b) b.style.width = Math.round(p * 100) + "%"; if (t) t.textContent = "อ่านแล้ว " + Math.round(p * 100) + "%";
  }
  function loadScript(src) {
    return new Promise(function (ok, bad) { var e = document.createElement("script"); e.src = src; e.onload = ok; e.onerror = bad; document.head.appendChild(e); });
  }
  function startImport(file) {
    if (!file || IMPST.busy) return;
    IMPST = { busy: true, p: 0, err: "" }; render();
    function fail(code) { IMPST = { busy: false, p: 0, err: IMP_ERR[code] || IMP_ERR.other }; if (current === "import") render(); }
    function done(r) {
      if (!r.nights || !r.nights.length) { fail("nosleep"); return; }
      var nights = r.nights.map(function (n) { return { date: n.date, bed: n.bed, wake: n.wake, mins: n.mins, inBed: n.inBed || 0 }; });
      var rec = { v: 1, at: new Date().toISOString(), records: r.records, nights: nights };
      try { localStorage.setItem(IMP_KEY, JSON.stringify(rec)); }
      catch (e) { rec.nights = nights.slice(-60); try { localStorage.setItem(IMP_KEY, JSON.stringify(rec)); } catch (e2) { fail("other"); return; } }
      rec.nights.forEach(decorate); IMP = rec;
      state.extra = []; lastDemo = ""; save(); catCount();   /* one story per imported night is already collected (no popups) */
      IMPST = { busy: false, p: 1, err: "" };
      if (current === "import") render();
      toast("นำเข้าแล้ว " + rec.nights.length + " คืน");
    }
    function onMain() {
      var go = function () { window.NLHealth.readFile(file, setImpProgress, window.fflate).then(done, function (e) { fail(e && e.message); }); };
      if (window.fflate) go(); else loadScript("vendor/fflate.min.js").then(go, function () { fail("other"); });
    }
    if (window.Worker && location.protocol !== "file:" && !NL.noWorker) {
      try {
        var w = new Worker("js/health-worker.js");
        w.onmessage = function (e) {
          var m = e.data;
          if (m.type === "progress") setImpProgress(m.p);
          else if (m.type === "done") { w.terminate(); done(m); }
          else if (m.type === "error") { w.terminate(); fail(m.msg); }
        };
        w.onerror = function (e) { if (e.preventDefault) e.preventDefault(); w.terminate(); onMain(); };
        w.postMessage({ file: file });
        return;
      } catch (e) {}
    }
    onMain();
  }
  function confirmDelImport() {
    modal({ title: "ลบข้อมูลที่นำเข้าไหม?", body: "แอปจะกลับไปใช้ข้อมูลตัวอย่าง (เดโม) ไฟล์ที่อยู่ในเครื่องคุณจะไม่ถูกลบ", actions: [
      { label: "ไม่ลบ", icon: I.close, kind: "primary" },
      { label: "ลบเลย", icon: I.trash, kind: "ghost danger", fn: function () {
        try { localStorage.removeItem(IMP_KEY); } catch (e) {}
        IMP = null; IMPST = { busy: false, p: 0, err: "" }; render(); toast("ลบข้อมูลที่นำเข้าแล้ว กลับไปใช้ข้อมูลตัวอย่าง");
      } }
    ] });
  }

  /* ---------- v3: พักหน้าจอ (idle auto-lock) ----------
     After N minutes with no pointer/touch/key/wheel event, a near-black overlay with a dim moon and a large
     Bangkok clock covers the app. A ~0.8 s hold (pointer, or Enter/Space held) brings the app back; a quick
     tap does nothing, so a pocket bump is less likely to wake it. Sleep timers keep running. The app never
     requests a Screen Wake Lock; if one is ever held, it is released on lock. A web page cannot lock the phone. */
  var HOLD_MS = 800;
  var Idle = { ms: idleMin() * 60000, t: null, locked: false, clockT: null, holdT: null, prevFocus: null };
  var wakeLock = null;
  function releaseWakeLock() { if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; } }
  function idleArm() { clearTimeout(Idle.t); Idle.t = null; if (!Idle.ms || Idle.locked) return; Idle.t = setTimeout(idleFire, Idle.ms); }
  function idleFire() { if (Q.running || B.running) { idleArm(); return; } lockNow(); }   /* never during a running quiet/breath timer */
  function activity() { if (!Idle.locked) idleArm(); }
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (ev) { document.addEventListener(ev, activity, { passive: true, capture: true }); });
  var idleEl = document.getElementById("idle");
  var clockFmt = null, dateFmt = null;
  try {
    clockFmt = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    dateFmt = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", weekday: "long", day: "numeric", month: "short" });
  } catch (e) {}
  function idleClock() {
    var c = document.getElementById("idleClock"), d = document.getElementById("idleDate"), now = new Date();
    if (c) c.textContent = clockFmt ? clockFmt.format(now) : hhmm(Math.floor((now.getTime() / 60000 + 420) % 1440));
    if (d) d.textContent = dateFmt ? dateFmt.format(now) : "";
  }
  function lockNow() {
    if (Idle.locked || !idleEl) return;
    Idle.locked = true; clearTimeout(Idle.t); releaseWakeLock();
    Idle.prevFocus = document.activeElement;
    var playing = Snd.anyPlaying();
    idleEl.innerHTML = '<div class="idle-in"><svg class="idle-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4z" fill="#6E6A55"/></svg>' +
      '<p class="idle-clock" id="idleClock"></p><p class="idle-date" id="idleDate"></p>' +
      (playing ? '<p class="idle-note">เพลงและเสียงยังเล่นอยู่</p>' : "") + '</div>' +
      '<button class="idle-hold" id="idleHold" aria-label="แตะค้างไว้เพื่อกลับ"><span class="hold-ring"><i></i></span><span class="hold-tx" id="idleTx">แตะค้างเพื่อกลับ</span></button>';
    idleEl.className = "idle show"; idleEl.setAttribute("aria-hidden", "false");
    document.getElementById("app").setAttribute("aria-hidden", "true");
    idleClock(); Idle.clockT = setInterval(idleClock, 15000);
    var h = document.getElementById("idleHold"); if (h) h.focus({ preventScroll: true });
  }
  function unlock() {
    if (!Idle.locked) return;
    Idle.locked = false; clearInterval(Idle.clockT); holdCancel();
    idleEl.className = "idle"; idleEl.setAttribute("aria-hidden", "true"); idleEl.innerHTML = "";
    document.getElementById("app").removeAttribute("aria-hidden");
    if (Idle.prevFocus && document.body.contains(Idle.prevFocus)) Idle.prevFocus.focus({ preventScroll: true });
    idleArm();
  }
  function holdStart() {
    if (!Idle.locked || Idle.holdT) return;
    idleEl.classList.add("holding"); var t = document.getElementById("idleTx"); if (t) t.textContent = "ค้างไว้อีกนิด…";
    Idle.holdT = setTimeout(function () { Idle.holdT = null; unlock(); }, HOLD_MS);
  }
  function holdCancel() {
    clearTimeout(Idle.holdT); Idle.holdT = null;
    if (idleEl) { idleEl.classList.remove("holding"); var t = document.getElementById("idleTx"); if (t) t.textContent = "แตะค้างเพื่อกลับ"; }
  }
  if (idleEl) {
    idleEl.addEventListener("pointerdown", function (e) { e.preventDefault(); holdStart(); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) { idleEl.addEventListener(ev, holdCancel); });
    idleEl.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    idleEl.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); holdStart(); } });
    idleEl.addEventListener("keyup", function (e) { if (e.key === "Enter" || e.key === " ") holdCancel(); });
    idleEl.addEventListener("click", function (e) { e.preventDefault(); });
  }
  idleArm();

  /* ---------- celebration (once) ---------- */
  function maybeCelebrate() {
    var s = S();
    if (!s.rewardReached || state.celebrated) return;
    state.celebrated = true; save();
    modal({
      celebrate: true,
      art: '<span class="cele-art">' + Art.miniConst(Art.CONST2, 7) + '</span>',
      title: "ครบ 7 คืนต่อกันแล้ว",
      body: "ได้ฉากใหม่ “ห้องนอนอบอุ่น” และ “กลุ่มดาวแมวหลับ” เก่งมากเลย",
      actions: [
        { label: "ไปดูห้องนอนอบอุ่น", icon: I.garden, fn: function () { state.place = "bedroom"; save(); location.hash = "#garden"; } },
        { label: "ไว้ทีหลัง", icon: I.close, kind: "ghost" }
      ]
    });
  }

  /* ---------- router ---------- */
  var current = "";
  var TITLES = { splash: "หน้าแรก", connect: "เชื่อมข้อมูลการนอน", morning: "อรุณสวัสดิ์", garden: "สวนดาว", decor: "ของแต่งสวน", places: "เลือกฉาก", pet: "แมวน้อย",
    collect: "สมุดสะสม", bedtime: "ก่อนนอน", quiet: "นั่งนิ่ง ๆ", breathe: "หายใจช้า ๆ", sounds: "เสียงก่อนนอน", read: "อ่านก่อนนอน", reader: "กำลังอ่าน",
    gratitude: "ขอบคุณวันนี้", winddown: "เวลาเตรียมนอน", stats: "สถิติ", settings: "ตั้งค่า",
    music: "เพลงกล่อม", cat: "นิทานของนุ่มนิ่ม", night: "ถ้าตื่นกลางดึก", week: "สรุปการนอน 7 คืน", "import": "นำเข้าจาก Apple Health" };
  function parse() { var h = (location.hash || "#splash").slice(1).split("/"); return { name: screens[h[0]] ? h[0] : "splash", arg: h[1] }; }
  function render() {
    var r = parse(), y = 0, sc = app.querySelector(".body.scroll");
    if (r.name === current && sc) y = sc.scrollTop;
    app.innerHTML = screens[r.name](r.arg);
    /* animation pass: soft settle only when the screen changes (re-renders of the same screen stay still) */
    if (r.name !== current && app.firstElementChild) app.firstElementChild.classList.add("enter");
    if (window.Ambient) Ambient.scan({ place: layoutKey() });
    var sc2 = app.querySelector(".body.scroll"); if (sc2 && r.name === current) sc2.scrollTop = y;
    if (r.name === "sounds" || r.name === "music" || r.name === "night") updateTimerLabel();
    if (r.name === "music") checkTracks();
  }
  function route() {
    var r = parse();
    if (r.name === "week" && r.name !== current) weekBack = current === "stats" ? "stats" : "settings";
    if (r.name !== current) { if (Date.now() - toastAt > 400) { toastEl.className = "toast"; } stopTimer(); stopQuiet(); stopBreathe(); Q.started = false; Q.ended = false; B.done = false; if (r.name !== "garden") G.mode = G.sel = null; }
    if (modalEl.classList.contains("show")) closeModal();
    render();
    var changed = r.name !== current; current = r.name;
    document.title = "Moonpuff · " + TITLES[r.name] + (IMP ? "" : " (เดโม)");
    if (changed) { var h = app.querySelector("h1"); if (h) { h.setAttribute("tabindex", "-1"); } }
    if (r.name === "reader") startReader();
    maybeCelebrate();
  }
  window.addEventListener("hashchange", route);

  app.addEventListener("click", function (e) {
    var t = e.target.closest("[data-go],[data-src],[data-star],[data-wander],[data-decor],[data-placed],[data-spot],[data-place],[data-card],[data-qmin],[data-pat],[data-bmin],[data-snd],[data-vol],[data-stimer],[data-del],[data-fs],[data-addnight],[data-mus],[data-mvol],[data-season],[data-idle],[data-dim],button[id]");
    if (!t || t.disabled) return;
    var d = t.dataset;
    if (d.go) { location.hash = "#" + d.go; return; }
    if (d.src) {
      var on = !state.connected[d.src]; state.connected[d.src] = on; save();
      t.setAttribute("aria-checked", on); t.querySelector(".st").textContent = on ? "เปิด" : "ปิด";
      if (on) toast("เชื่อมแล้ว (จำลอง)");
      return;
    }
    if (d.star) { lightStar(+d.star); return; }
    if (d.wander) { lightWander(+d.wander); return; }
    if (d.spot) { dropAt(+d.spot); return; }
    if (d.placed) { if (!G.mode) decorSheet(d.placed); return; }
    if (d.decor) {
      if (current !== "garden") {
        if (placedOf(d.decor)) { decorSheet(d.decor); return; }
        var dd = decorById(d.decor), gift = d.decor === "lantern" && state.gift;
        if (!gift && state.balance < dd.price) { toast("แสงยังไม่พอ ไว้คืนนี้นอนเก็บแสงเพิ่มนะ", true); return; }
        G.mode = "place"; G.sel = d.decor; location.hash = "#garden"; return;
      }
      pickDecor(d.decor); return;
    }
    if (d.place) { choosePlace(d.place); return; }
    if (d.card) { cardModal(d.card); return; }
    if (d.qmin) { Q.min = +d.qmin; render(); return; }
    if (d.pat) { B.pat = d.pat; B.done = false; render(); return; }
    if (d.bmin) { B.min = +d.bmin; B.done = false; render(); return; }
    if (d.snd) {
      var c = Snd.cfg(d.snd);
      if (Snd.nodes[d.snd]) { Snd.stop(d.snd); c.on = false; Snd.idleCheck(); } else { Snd.start(d.snd); c.on = true; }
      save(); render(); return;
    }
    if (d.vol) {
      var cv = Snd.cfg(d.vol); cv.vol = Math.max(0, Math.min(4, cv.vol + (+d.d))); Snd.setVol(d.vol); save(); render(); return;
    }
    if (d.stimer != null) { Snd.setTimer(+d.stimer); save(); render(); return; }
    if (d.mus) { if (Snd.musicPlaying() === d.mus) Snd.stopMusic(); else Snd.playMusic(d.mus); save(); render(); return; }
    if (d.mvol) { MUS.vol = Math.max(0, Math.min(4, MUS.vol + (+d.d))); musSave(); var mp = Snd.musicPlaying(); if (mp) Snd.setVol(mp); render(); return; }
    if (d.season) { try { localStorage.setItem(SEASON_KEY, d.season); } catch (e) {} render(); toast("ตอนนี้เป็นฉาก" + seasonName(seasonNow())); return; }
    if (d.idle != null) { var im = +d.idle; try { localStorage.setItem(IDLE_KEY, im ? String(im) : "off"); } catch (e) {} Idle.ms = im * 60000; idleArm(); render(); toast(im ? "พักหน้าจอเมื่อไม่ได้แตะ " + im + " นาที" : "ปิดการพักหน้าจอแล้ว"); return; }
    if (d.dim != null) { var wd = warmGet(); wd.dim = +d.dim; warmSet(wd); render(); return; }
    if (d.del) { delNote(+d.del); return; }
    if (d.fs) { applyFs(d.fs); render(); toast("เปลี่ยนขนาดตัวอักษรแล้ว"); return; }
    if (d.addnight) { addNight(d.addnight); maybeCelebrate(); return; }
    switch (t.id) {
      case "collect": collectMorning(); return;
      case "cancelMode": G.mode = G.sel = null; rerenderGarden(); return;
      case "tbtn": toggleTimer(); return;
      case "qgo": quietGo(); return;
      case "qstop": stopQuiet(); Q.started = false; render(); return;
      case "bgo": breatheGo(); return;
      case "stopAll": Snd.stopAll(); render(); toast("หยุดเพลงและเสียงแล้ว"); return;
      case "stopNature": Snd.stopNature(); render(); toast("หยุดเสียงแล้ว"); return;
      case "stopMusic": Snd.stopMusic(); render(); toast("หยุดเพลงแล้ว"); return;
      case "nightPlay":
        var nid = t.dataset.id; if (isMus(nid)) Snd.playMusic(nid); else { Snd.start(nid); Snd.cfg(nid).on = true; }
        if (!Snd.end) Snd.setTimer(30);
        save(); render(); return;
      case "nightStop": Snd.stopAll(); render(); toast("หยุดเสียงแล้ว"); return;
      case "warmToggle": var w0 = warmGet(); w0.on = !w0.on; warmSet(w0); render(); toast(w0.on ? "เปิดโหมดแสงอุ่นแล้ว" : "ปิดโหมดแสงอุ่นแล้ว"); return;
      case "delImport": confirmDelImport(); return;
      case "gsave": saveNote(); return;
      case "wminus": state.wind.time = (state.wind.time - 15 + 1440) % 1440; save(); render(); return;
      case "wplus": state.wind.time = (state.wind.time + 15) % 1440; save(); render(); return;
      case "wtoggle": state.wind.on = !state.wind.on; save(); render(); return;
      case "wsave": save(); toast("บันทึกแล้ว (เดโม ยังไม่แจ้งเตือนจริง)"); return;
      case "resetBtn": confirmReset(); return;
      case "motionToggle":
        var mon = !Ambient.settingOn(); Ambient.setEnabled(mon); render(); toast(mon ? "เปิดภาพเคลื่อนไหวแล้ว" : "ปิดภาพเคลื่อนไหวแล้ว"); return;
      case "gn":
        var sid = t.closest(".reader").dataset.id;
        if (state.read[sid]) { toast("ฝันดีนะ ✦"); return; }
        state.read[sid] = true; state.balance += READ_REWARD; save();
        t.className = "btn done"; t.innerHTML = I.check + "<span>ฝันดีนะ · ได้แสงแล้ว</span>";
        toast("ฝันดีนะ ได้ +" + READ_REWARD + " แสง (เดโม)");
        return;
    }
  });
  app.addEventListener("change", function (e) { if (e.target.id === "hfile") { var f = e.target.files && e.target.files[0]; e.target.value = ""; startImport(f); } });
  app.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("svg [role=button]")) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
  });

  window.NL = {
    state: function () { return state; }, streak: S,
    reset: function () { state = fresh(); save(); G.mode = G.sel = null; },
    setMode: function (mode, id) { G.mode = mode; G.sel = id; rerenderGarden(); },
    sound: Snd,
    /* v3 test hooks */
    lockNow: lockNow, unlock: unlock, locked: function () { return Idle.locked; },
    setIdleMs: function (ms) { Idle.ms = ms; idleArm(); },
    setNow: function (iso) { NOW_OVERRIDE = iso || null; if (current) render(); },
    season: function () { return seasonNow(); }, layout: function () { return layoutKey(); },
    imported: function () { return IMP; }, catCount: function () { return catCount(); },
    week: weekNumbers, startImport: startImport, noWorker: false
  };
  route();
})();
