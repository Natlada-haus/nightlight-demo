#!/usr/bin/env python3
"""Nightlight v2 preview: capture EVERY screen/state + run senior-friendly audits.

Playwright + /usr/bin/google-chrome, 390x844 @2x, prefers-reduced-motion: reduce.
Writes ../art-v2/screens/NN-name.png, ../art-v2/screens/contact-sheet-all.png,
extra passes at the other text sizes into ../art-v2/screens/{small,large,xlarge}/
(เล็ก .83 / ใหญ่ 1.15 / ใหญ่มาก 1.3; the main set is กลาง = default), and
../art-v2/screens/audit.json + a printed summary:
  - horizontal overflow of the page and of any element (no element past the phone edge)
  - clipped text (element with text whose content overflows a non-scrolling box)
  - interactive elements smaller than 48x48 and pairs closer than 8 px
  - text nodes with computed font-size < 16 px at กลาง/ใหญ่/ใหญ่มาก, < 14 px at เล็ก
    (the tiny "เดโม" tag is the only allowed exception)
  - text contrast against the nearest solid background (WCAG 2.2 AA: 4.5:1, 3:1 for large text)
  - JS errors (pageerror + console.error) and any non-localhost request
Usage: python3 tools/screenshot-v2.py [outdir]
"""
import functools, http.server, json, os, socket, sys, threading
from playwright.sync_api import sync_playwright

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(APP), "art-v2", "screens")
os.makedirs(OUT, exist_ok=True)
SIZES = ["normal", "small", "large", "xlarge"]
for _k in SIZES[1:]: os.makedirs(os.path.join(OUT, _k), exist_ok=True)

s = socket.socket(); s.bind(("127.0.0.1", 0)); PORT = s.getsockname()[1]; s.close()
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Q, directory=APP))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORT}/index.html"

AUDIT_JS = r"""
(minFs) => {
  const phone = document.getElementById('phone').getBoundingClientRect();
  const out = { pageOverflowX: document.documentElement.scrollWidth > window.innerWidth + 1, offEdge: [], clipped: [], small: [], close: [], tinyText: [], lowContrast: [], minContrast: 99 };
  const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > phone.top && r.top < phone.bottom && !el.closest('.toast:not(.show)'); };
  const modalOpen = document.getElementById('modal').classList.contains('show');
  const inScope = el => modalOpen ? !!el.closest('#modal') : !el.closest('#modal');
  const label = el => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g,' ').slice(0, 40);
  // elements past the phone edge
  document.querySelectorAll('#app *, #modal *').forEach(el => {
    if (!vis(el) || el.closest('.tray-list') || el.closest('svg')) return;
    const r = el.getBoundingClientRect();
    if (r.right > phone.right + 1 || r.left < phone.left - 1) out.offEdge.push(label(el) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
  });
  // clipped text
  document.querySelectorAll('#app *, #modal *').forEach(el => {
    if (!vis(el) || el.closest('svg')) return;
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) return;
    const cs = getComputedStyle(el);
    const scrolls = /(auto|scroll)/.test(cs.overflowY) || /(auto|scroll)/.test(cs.overflowX);
    if (scrolls) return;
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) out.clipped.push('ellipsis: ' + label(el));
    else if ((cs.overflow !== 'visible') && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2)) out.clipped.push(label(el));
  });
  // tap targets: measured on what the user can actually tap.
  //  - targets fully hidden by another layer (e.g. under the move-mode bar) are skipped
  //  - targets inside a scrolling list are clipped to that list; pairs split by a scroll edge are not compared
  //  - SVG targets with a .hit shape use that shape (circles are compared as circles)
  const sel = 'a[href], button, [role=button], [role=switch], [role=tab], textarea, input';
  const scroller = el => { for (let e = el.parentElement; e; e = e.parentElement) { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX)) return e; } return null; };
  const shapeOf = el => {
    const hit = el.querySelector(':scope > .hit');
    if (hit && hit.tagName === 'circle') { const r = hit.getBoundingClientRect(); return { circle: true, cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2, rect: r }; }
    let r = (hit || el).getBoundingClientRect();
    const sc = scroller(el);
    if (sc) { const c = sc.getBoundingClientRect(); r = { left: Math.max(r.left, c.left), right: Math.min(r.right, c.right), top: Math.max(r.top, c.top), bottom: Math.min(r.bottom, c.bottom), width: (hit || el).getBoundingClientRect().width, height: (hit || el).getBoundingClientRect().height }; }
    return { circle: false, rect: r };
  };
  const occluded = el => {
    const r = el.getBoundingClientRect(); const pts = [[.5, .5], [.25, .5], [.75, .5], [.5, .25], [.5, .75]];
    return pts.every(([fx, fy]) => { const x = r.left + r.width * fx, y = r.top + r.height * fy; if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) return true; const t = document.elementFromPoint(x, y); return !t || !(el === t || el.contains(t)); });
  };
  const targets = [...document.querySelectorAll(sel)].filter(el => vis(el) && inScope(el) && !el.disabled && !occluded(el));
  const items = targets.map(el => ({ el, sh: shapeOf(el), sc: scroller(el) }));
  items.forEach(({ el, sh }) => {
    const full = (el.querySelector(':scope > .hit') || el).getBoundingClientRect();
    if (full.width < 47.5 || full.height < 47.5) out.small.push(label(el) + ' ' + Math.round(full.width) + 'x' + Math.round(full.height));
  });
  const rectGap = (a, b) => Math.max(Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right)), Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom)));
  const circRect = (c, r) => { const dx = Math.max(r.left - c.cx, 0, c.cx - r.right), dy = Math.max(r.top - c.cy, 0, c.cy - r.bottom); return Math.hypot(dx, dy) - c.r; };
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    if (a.sc !== b.sc && (a.sc || b.sc)) continue;   // separated by a scroll edge
    let gap;
    if (a.sh.circle && b.sh.circle) gap = Math.hypot(a.sh.cx - b.sh.cx, a.sh.cy - b.sh.cy) - a.sh.r - b.sh.r;
    else if (a.sh.circle) gap = circRect(a.sh, b.sh.rect);
    else if (b.sh.circle) gap = circRect(b.sh, a.sh.rect);
    else gap = rectGap(a.sh.rect, b.sh.rect);
    if (gap < 7.5) out.close.push(label(a.el) + ' <-> ' + label(b.el) + ' gap ' + gap.toFixed(1));
  }
  // font sizes + contrast
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function bgOf(el) {
    // composite translucent backgrounds upward until an opaque one; stop (null) at images/gradients
    let layers = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return { img: true, el: e };
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 0.99) break; }
    }
    let base = { r: 14, g: 24, b: 56 };
    for (let i = layers.length - 1; i >= 0; i--) { const c = layers[i]; base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) }; }
    return { c: base };
  }
  const walker = document.createTreeWalker(document.getElementById('phone'), NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent.trim(); if (!t) continue;
    const el = n.parentElement; if (!el || seen.has(el) || !vis(el) || !inScope(el)) continue; seen.add(el);
    if (el.closest('svg') && !el.matches('text')) continue;
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize);
    const isDemoTag = el.classList.contains('tag') && t === 'เดโม';
    if (fs < minFs - 0.05 && !isDemoTag) out.tinyText.push(t.slice(0, 30) + ' ' + fs + 'px');
    if (el.closest('svg')) continue;
    const fg = parse(cs.color); if (!fg) continue;
    const bg = bgOf(el);
    if (bg.img) continue;
    const r = ratio(fg, bg.c), large = fs >= 24 || (fs >= 18.66 && parseInt(cs.fontWeight) >= 700);
    out.minContrast = Math.min(out.minContrast, +r.toFixed(2));
    if (r < (large ? 3 : 4.5)) out.lowContrast.push(t.slice(0, 30) + ' ' + r.toFixed(2) + ':1');
  }
  out.small = [...new Set(out.small)]; out.close = [...new Set(out.close)].slice(0, 12);
  return out;
}
"""

audit = {}
errors, foreign = [], []
shots = []

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--autoplay-policy=no-user-gesture-required"])

    def run_pass(size):
        xl = size != "normal"; tag = "" if size == "normal" else size + "/"
        ctx = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, reduced_motion="reduce")
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(tag + "pageerror: " + str(e)))
        pg.on("console", lambda m: m.type == "error" and errors.append(tag + "console: " + m.text))
        pg.on("request", lambda r: (not r.url.startswith(f"http://127.0.0.1:{PORT}") and not r.url.startswith("data:")) and foreign.append(r.url))
        pg.goto(BASE + "#splash")
        pg.evaluate("localStorage.clear()")
        if xl: pg.evaluate(f"localStorage.setItem('nightlight-text-size','{size}')")
        pg.reload(); pg.wait_for_selector(".splash")
        pg.evaluate("document.fonts.ready")
        n = [0]
        folder = os.path.join(OUT, size) if xl else OUT
        min_fs = 14 if size == "small" else 16

        def go(h):
            pg.evaluate(f"location.hash='{h}'"); pg.wait_for_timeout(250)

        def snap(name, ms=350, keep_toast=False, top=True):
            pg.wait_for_timeout(ms)
            if not keep_toast: pg.evaluate("document.getElementById('toast').className='toast'")
            if top: pg.evaluate("document.querySelectorAll('#app .scroll').forEach(e => e.scrollTop = 0)")
            n[0] += 1
            fn = f"{n[0]:02d}-{name}.png"
            pg.screenshot(path=os.path.join(folder, fn))
            a = pg.evaluate(AUDIT_JS, 14 if pg.evaluate("document.documentElement.getAttribute('data-textsize')") == 'small' else 16)
            audit[tag + fn] = a
            if not xl: shots.append(fn)
            flag = [k for k in ("pageOverflowX",) if a[k]] + [k for k in ("offEdge", "clipped", "small", "close", "tinyText", "lowContrast") if a[k]]
            print(tag.ljust(8) + fn.ljust(34), "OK" if not flag else "CHECK " + ", ".join(flag), f"(min contrast {a['minContrast']})")

        snap("splash")
        pg.click("[data-go=connect]"); snap("connect")
        pg.click("[data-src=apple]"); pg.wait_for_timeout(100)
        pg.click(".connect .foot .btn"); snap("morning-before")
        pg.click("#collect"); pg.wait_for_timeout(300); snap("morning-after", 1600, keep_toast=True)
        pg.click(".morning .foot .btn")
        for i in range(4): pg.click(f"[data-star='{i}']")
        pg.click("[data-wander='1']")
        pg.click("[data-decor=lantern]"); pg.click("[data-spot='0']")
        pg.click("[data-decor=pine]"); pg.click("[data-spot='5']")
        snap("garden", 1000)
        pg.click("[data-decor=bench]"); snap("garden-place-mode")
        pg.click("[data-spot='2']"); pg.wait_for_timeout(200)
        pg.click("[data-placed=lantern]"); snap("garden-decor-sheet")
        pg.click("#modal [data-m='0']"); snap("garden-move-mode")
        pg.click("[data-spot='3']"); pg.wait_for_timeout(200)
        go("#decor"); snap("decor-grid")
        go("#places"); snap("places")
        pg.click("[data-place=meadow]"); go("#garden"); snap("garden-meadow", 1000)
        go("#places"); pg.click("[data-place=camp]"); go("#garden"); snap("garden-camp", 1000)
        go("#places"); pg.click("[data-place=sea]")
        go("#pet"); snap("pet", 700)
        go("#collect/cards"); snap("collect-cards", 700)
        pg.click("[data-card=river]"); snap("collect-card-detail", 500); pg.keyboard.press("Escape")
        go("#collect/const"); snap("collect-const")
        go("#collect/decor"); snap("collect-decor")
        go("#bedtime"); snap("bedtime")
        go("#quiet"); pg.click("[data-qmin='3']"); pg.click("#qgo"); pg.wait_for_timeout(2100); snap("quiet-running")
        go("#breathe"); snap("breathe-options")
        pg.click("#bgo"); pg.wait_for_timeout(1100); snap("breathe-running")
        go("#sounds"); pg.click("[data-snd=rain]"); pg.click("[data-snd=waves]"); pg.click("[data-vol=rain][data-d='1']"); pg.click("[data-stimer='30']"); snap("sounds", 800)
        go("#bedtime"); snap("bedtime-playing")
        pg.evaluate("NL.sound.stopAll()")
        go("#read"); snap("read")
        go("#reader/waves"); snap("reader", 700)
        go("#gratitude")
        pg.fill("#g1", "ขอบคุณลูกที่โทรมาถามว่ากินข้าวหรือยัง")
        pg.fill("#g2", "เรื่องค่าซ่อมหลังคา พรุ่งนี้ค่อยโทรถามช่าง")
        pg.click("#gsave"); pg.wait_for_timeout(300); snap("gratitude")
        pg.click("[data-del]"); snap("gratitude-delete-confirm"); pg.click("#modal [data-m='0']")
        go("#winddown"); pg.click("#wplus"); pg.click("#wtoggle"); snap("winddown")
        go("#stats"); snap("stats")
        go("#settings"); snap("settings")
        pg.click("[data-addnight=late]"); pg.evaluate("document.querySelector('.demo-box').scrollIntoView({block:'center'})"); snap("settings-demo-rest-night", top=False)
        if not xl:
            # founder fix pass 2: the 4 sizes + the same screens at เล็ก / ใหญ่มาก
            go("#settings"); snap("settings-text-sizes")
            pg.click("[data-fs=small]"); pg.wait_for_timeout(300); snap("settings-text-small")
            go("#bedtime"); snap("bedtime-text-small")
            go("#garden"); snap("garden-text-small", 1000)
            go("#settings"); pg.click("[data-fs=xlarge]"); pg.wait_for_timeout(300); snap("settings-text-xlarge")
            go("#bedtime"); snap("bedtime-text-xlarge")
            go("#reader/waves"); snap("reader-text-xlarge", 700)
            go("#garden"); snap("garden-text-xlarge", 1000)
            pg.evaluate("var e=document.querySelector('.tray'); e && e.scrollIntoView({block:'end'})")
            snap("garden-text-xlarge-tray", top=False)
            go("#settings"); pg.click("[data-fs=normal]"); pg.wait_for_timeout(200)
        for _ in range(7):  # add on-time demo nights until the 7-in-a-row celebration appears
            if pg.evaluate("document.getElementById('modal').classList.contains('show')"): break
            pg.click("[data-addnight=ontime]"); pg.wait_for_timeout(150)
        snap("celebration", 600)
        pg.click("#modal [data-m='0']"); snap("garden-bedroom", 1000)
        st = pg.evaluate("JSON.stringify(NL.streak())")
        ctx.close()
        return st

    final = run_pass("normal")
    for size in SIZES[1:]: run_pass(size)
    br.close()
httpd.shutdown()

json.dump({"audit": audit, "errors": errors, "foreignRequests": foreign}, open(os.path.join(OUT, "audit.json"), "w"), ensure_ascii=False, indent=1)
print("\nJS errors:", errors or "none")
print("Non-local requests:", foreign or "none")
for k, a in audit.items():
    for key in ("offEdge", "clipped", "small", "close", "tinyText", "lowContrast"):
        if a[key]: print(f"  {k} {key}: {a[key][:8]}")
print("min contrast over all screens:", min(a["minContrast"] for a in audit.values()))

# contact sheet
from PIL import Image, ImageDraw, ImageFont
thumbs = [Image.open(os.path.join(OUT, f)) for f in shots]
cols = 8; tw = 260; th = int(tw * 844 / 390); pad = 16; lab = 28
rows = (len(thumbs) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (tw + pad) + pad, rows * (th + pad + lab) + pad), (10, 14, 34))
d = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
except Exception: font = ImageFont.load_default()
for i, (im, fn) in enumerate(zip(thumbs, shots)):
    x = pad + (i % cols) * (tw + pad); y = pad + (i // cols) * (th + pad + lab)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y + lab))
    d.text((x, y + 4), fn[:-4], fill=(230, 230, 250), font=font)
sheet.save(os.path.join(OUT, "contact-sheet-all.png"))
print("wrote", len(shots), "screens + contact-sheet-all.png to", OUT)
