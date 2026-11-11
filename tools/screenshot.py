#!/usr/bin/env python3
"""Capture the 7 demo screens (390x844 @2x) + a contact sheet.

Usage:  python3 tools/screenshot.py [out_dir]
Default out_dir: ../demo-screens (sibling of the app folder).
Runs fully offline: serves the app folder with http.server on a free port and
drives the locally installed Chrome via Playwright.
"""
import functools, http.server, os, socket, sys, threading
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(os.path.dirname(APP), "demo-screens")
os.makedirs(OUT, exist_ok=True)


def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


port = free_port()
httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Quiet, directory=APP))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{port}/index.html"

SHOTS = []
external = []


def settle(page, ms=500):
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(ms)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/google-chrome")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, reduced_motion="reduce")
    page = ctx.new_page()
    page.on("request", lambda r: external.append(r.url) if not r.url.startswith(f"http://127.0.0.1:{port}") and not r.url.startswith("data:") else None)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    page.goto(BASE + "#splash")
    page.evaluate("localStorage.clear(); NL.reset()")
    page.goto(BASE + "#splash"); page.reload()

    def shot(name, hash_=None, before=None, wait=500):
        if hash_:
            page.evaluate(f"location.hash = '{hash_}'")
        if before:
            before()
        settle(page, wait)
        path = os.path.join(OUT, name + ".png")
        page.screenshot(path=path)
        SHOTS.append((name, path))
        # overflow check: any element wider than the phone / page scroll
        ov = page.evaluate("""() => {
          const bad = [];
          const W = document.documentElement.clientWidth;
          document.querySelectorAll('#app *').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.width && (r.right > W + 1 || r.left < -1) && !el.closest('.tray-list') && !el.closest('svg')) bad.push(el.className || el.tagName);
          });
          return {bad: bad.slice(0, 8), scrollH: document.documentElement.scrollHeight, scrollW: document.documentElement.scrollWidth};
        }""")
        print(f"{name}: overflow={ov}")

    shot("01-splash", wait=800)
    page.click("text=เริ่มเลย")

    def connect2():
        page.wait_for_selector(".src")
        page.click("[data-src=apple]")
        page.click("[data-src=samsung]")
        page.wait_for_timeout(1900)  # let the toast fade
    shot("02-connect", before=connect2)

    page.click("text=ต่อไป")
    shot("03-morning", wait=1800)  # count-up done

    def garden():
        page.wait_for_selector("#stage")
        for i in range(4):
            page.click(f"[data-star='{i}']")
        page.click("[data-decor=lantern]")
        page.click("[data-decor=pine]")
        page.wait_for_timeout(1900)
    page.click("text=ไปจุดดาว")
    shot("04-garden", before=garden)
    bal = page.evaluate("NL.state().balance")
    print("garden balance after 4 stars + gift lantern + pine:", bal)
    assert bal == 120 - 40 - 20, bal

    # insufficient-light check (not captured): drain then try to buy the tent
    page.evaluate("NL.state().balance = 30")
    page.click("[data-decor=tent]")
    toast = page.inner_text("#toast")
    print("toast when short:", toast, "| balance:", page.evaluate("NL.state().balance"))
    assert "แสงไม่พอ" in toast and page.evaluate("NL.state().balance") == 30
    page.evaluate("NL.state().balance = 60; localStorage.setItem('nightlight-demo-v1', JSON.stringify(NL.state()))")
    page.wait_for_timeout(1900)

    page.click(".tabbar >> text=อ่านก่อนนอน")
    shot("05-read")
    page.click(".story >> nth=0")
    shot("06-reader", wait=2300)
    page.evaluate("location.hash='#stats'")
    page.wait_for_selector(".chart")
    page.click(".chart .bar >> nth=6")
    shot("07-stats")

    print("JS errors:", errors)
    print("external requests:", external)
    browser.close()
httpd.shutdown()

# ---------- contact sheet (4 + 3 grid) ----------
LABELS = {"01-splash": "01 · splash", "02-connect": "02 · เชื่อมข้อมูล", "03-morning": "03 · อรุณสวัสดิ์", "04-garden": "04 · สวนดาว",
          "05-read": "05 · อ่านก่อนนอน", "06-reader": "06 · หน้าอ่าน", "07-stats": "07 · สถิติ"}
font_path = os.path.join(APP, "assets", "fonts", "Anuphan-Variable.woff2")
try:
    font = ImageFont.truetype(font_path, 30)
    font_title = ImageFont.truetype(font_path, 40)
except Exception:
    font = font_title = ImageFont.load_default()
tw, th = 390, 844  # thumbnails at 1x
gap, pad, lab = 40, 60, 56
cols, rows = 4, 2
W = pad * 2 + cols * tw + (cols - 1) * gap
H = pad * 2 + 70 + rows * (th + lab) + (rows - 1) * gap
sheet = Image.new("RGB", (W, H), (9, 14, 34))
d = ImageDraw.Draw(sheet)
d.text((pad, pad - 10), "Moonpuff — คลิกเดโม (ข้อมูลตัวอย่าง)", font=font_title, fill=(255, 243, 196))
for i, (name, path) in enumerate(SHOTS):
    r, c = divmod(i, cols)
    if r == 1:
        c += 0.5  # center the 3 on the second row
    x = int(pad + c * (tw + gap)); y = pad + 70 + r * (th + lab + gap)
    im = Image.open(path).convert("RGB").resize((tw, th), Image.LANCZOS)
    mask = Image.new("L", (tw, th), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, tw - 1, th - 1), 28, fill=255)
    sheet.paste(im, (x, y + lab), mask)
    d.text((x + 4, y + 8), LABELS.get(name, name), font=font, fill=(189, 194, 228))
sheet.save(os.path.join(OUT, "contact-sheet.png"))
print("saved", len(SHOTS), "shots + contact-sheet.png to", OUT)
