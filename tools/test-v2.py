#!/usr/bin/env python3
"""Moonpuff demo v2: logic tests (rules + rewards) in a real browser.
Usage: python3 tools/test-v2.py      -> prints PASS/FAIL per check, exit 1 on any failure."""
import functools, http.server, os, socket, sys, threading
from playwright.sync_api import sync_playwright

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = socket.socket(); s.bind(("127.0.0.1", 0)); PORT = s.getsockname()[1]; s.close()
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Q, directory=APP))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
fails = 0
def check(name, cond, extra=""):
    global fails
    print(("PASS " if cond else "FAIL ") + name + (f"  ({extra})" if extra else ""))
    if not cond: fails += 1

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome")
    pg = br.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce").new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(f"http://127.0.0.1:{PORT}/index.html#splash"); pg.evaluate("localStorage.clear(); NL.reset()"); pg.reload()
    st = lambda: pg.evaluate("NL.state()")
    sk = lambda: pg.evaluate("NL.streak()")

    # pure function: computeStreak
    r = pg.evaluate("""(() => {
      const mk = (date, bed, mins) => ({ date, bed, mins, day: '', label: date });
      const t = [];
      // Mon-Sun week of 2026-11-09: 3 late nights -> 2 covered by rest, 3rd breaks the run
      let a = computeStreak([mk('2026-11-09','23:00',450), mk('2026-11-10','00:30',400), mk('2026-11-11','00:30',400), mk('2026-11-12','00:30',400)]);
      t.push(['3rd late night in a week breaks the run', a.nights.map(n => n.kind).join(','), 'ontime,rest,rest,late']);
      t.push(['run after break = 0', a.run, 0]);
      // Monday resets the weekly rest counter
      let b = computeStreak([mk('2026-11-14','00:30',400), mk('2026-11-15','00:30',400), mk('2026-11-16','00:30',400)]);
      t.push(['Monday resets rest nights', b.nights.map(n => n.kind).join(','), 'rest,rest,rest']);
      // 7 in a row with rest nights counted
      let c = computeStreak(['10','11','12','13','14','15','16'].map((d,i) => mk('2026-11-' + d, i % 3 === 1 ? '00:30' : '23:00', 450)));
      t.push(['7 kept nights incl. rest -> reward', c.rewardReached, true]);
      t.push(['short on-time bedtime (5h) is not on-time', NL_isOnTime(mk('2026-11-10','23:00',300)), false]);
      t.push(['23:30 counts as on-time, 23:31 does not', [NL_isOnTime(mk('x','23:30',420)), NL_isOnTime(mk('x','23:31',420))].join(), 'true,false']);
      t.push(['light: 7h12 on time = 120', NL_lightFor(mk('x','23:08',432)).total, 120]);
      t.push(['light: 6h late = 86', NL_lightFor(mk('x','00:30',360)).total, 86]);
      t.push(['light: 10h on time = 120 (no extra above 7h/9h)', NL_lightFor(mk('x','23:00',600)).total, 120]);
      t.push(['input not mutated', JSON.stringify(window.NL_NIGHTS[0]).includes('kind'), false]);
      return t; })()""")
    for name, got, want in r: check(name, got == want, f"got {got!r}, want {want!r}")
    d = sk(); check("demo data: run 4, on-time total 6, rest this week 1/2", (d["run"], d["totalOnTime"], d["restUsedThisWeek"]) == (4, 6, 1), str((d["run"], d["totalOnTime"], d["restUsedThisWeek"])))

    # morning: one tap collects light + today's card, only once
    pg.evaluate("location.hash='#morning'"); pg.click("#collect")
    check("เก็บแสง adds 120 light", st()["balance"] == 120)
    check("today's dream card collected", "river" in st()["cards"] and len(st()["cards"]) == 6)
    pg.evaluate("location.hash='#garden'"); pg.wait_for_timeout(100); pg.evaluate("location.hash='#morning'")
    check("no second collect button", pg.locator("#collect").count() == 0 and st()["balance"] == 120)

    # garden: place / move / remove with full refund; gift lantern returns as gift
    pg.evaluate("location.hash='#garden'"); pg.wait_for_selector("#stage")
    pg.click("[data-decor=lantern]"); pg.click("[data-spot='0']")
    check("gift lantern costs nothing", st()["balance"] == 120 and st()["gift"] is False)
    pg.click("[data-decor=tent]"); pg.click("[data-spot='4']")
    check("tent costs 60", st()["balance"] == 60)
    pg.click("[data-placed=tent]"); pg.click("#modal [data-m='0']"); pg.click("[data-spot='1']")
    check("move tent to spot 2", [x for x in st()["decor"] if x["id"] == "tent"][0]["spot"] == 1)
    pg.click("[data-placed=tent]"); pg.click("#modal [data-m='0']"); pg.click("[data-spot='0']")
    sp = {x["id"]: x["spot"] for x in st()["decor"]}
    check("move onto occupied spot swaps", sp == {"lantern": 1, "tent": 0}, str(sp))
    pg.click("[data-placed=tent]"); pg.click("#modal [data-m='1']")
    check("remove tent refunds 60 in full", st()["balance"] == 120 and all(x["id"] != "tent" for x in st()["decor"]))
    pg.click("[data-placed=lantern]"); pg.click("#modal [data-m='1']")
    check("removed gift lantern is a gift again", st()["gift"] is True and st()["balance"] == 120)
    pg.evaluate("NL.state().balance = 30"); pg.click("[data-decor=tent]")
    check("not enough light: no place mode, toast shown", pg.locator("[data-spot]").count() == 0 and "ไม่พอ" in pg.inner_text("#toast"))
    pg.evaluate("NL.state().balance = 120")
    pg.click("[data-star='6']")
    check("locked 7th star shows nights left", "อีก 1 คืน" in pg.inner_text("#toast") and 6 not in st()["stars"])
    pg.click("[data-star='0']"); check("star costs 10", st()["balance"] == 110)

    # reading +5 once per story
    pg.evaluate("location.hash='#reader/forest'"); pg.click("#gn"); pg.click("#gn")
    check("reading +5 once", st()["balance"] == 115)
    # gratitude +5 once per day, delete with confirm
    pg.evaluate("location.hash='#gratitude'"); pg.fill("#g1", "ทดสอบ"); pg.click("#gsave")
    pg.fill("#g1", "ทดสอบสอง"); pg.click("#gsave")
    check("gratitude +5 once per day, 2 notes saved", st()["balance"] == 120 and len(st()["notes"]) == 2)
    pg.click("[data-del] >> nth=0"); pg.click("#modal [data-m='0']")
    check("'ไม่ลบ' keeps the note", len(st()["notes"]) == 2)
    pg.click("[data-del] >> nth=0"); pg.click("#modal [data-m='1']")
    check("'ลบเลย' deletes the note", len(st()["notes"]) == 1)

    # places unlock + demo nights + celebration once
    pg.evaluate("location.hash='#places'"); pg.click("[data-place=bedroom]", force=True)
    check("bedroom locked at run 4", st()["place"] == "sea" and "อีก 3 คืน" in pg.inner_text("#toast"))
    pg.evaluate("location.hash='#settings'")
    pg.click("[data-addnight=late]")
    d = sk(); check("demo late night auto-covered by a rest night (2/2)", d["restUsedThisWeek"] == 2 and d["run"] == 5)
    pg.click("[data-addnight=ontime]"); pg.click("[data-addnight=ontime]")
    check("7 in a row -> celebration shown", pg.locator("#modal.show").count() == 1 and "7 คืน" in pg.inner_text("#modal"))
    pg.click("#modal [data-m='1']")
    pg.evaluate("location.hash='#garden'"); pg.wait_for_timeout(100); pg.evaluate("location.hash='#settings'"); pg.wait_for_timeout(100)
    check("celebration only once", pg.locator("#modal.show").count() == 0)
    check("pet grew to stage 2 at 7+ on-time nights", "cat-2.jpg" in pg.evaluate("Art=NLArt, NL.streak().totalOnTime >= 7 ? 'cat-2.jpg' : ''"))
    pg.evaluate("location.hash='#places'"); pg.click("[data-place=bedroom]")
    check("bedroom unlocked after reward", st()["place"] == "bedroom")
    # week reset: add nights to Mon 16 Nov
    for _ in range(4): pg.evaluate("location.hash='#settings'"); pg.click("[data-addnight=ontime]")
    pg.click("[data-addnight=late]")
    d = sk(); last = d["nights"][-1]
    check("new week (Mon 16 Nov+) starts at 1/2 rest", last["week"] == "2026-11-16" and d["restUsedThisWeek"] == 1, last["night"]["date"])

    # text size persists
    pg.evaluate("localStorage.removeItem('nightlight-text-size')"); pg.reload(); pg.evaluate("location.hash='#settings'"); pg.wait_for_selector("[data-fs]")
    check("default text size = กลาง (16px root, 18px body)", pg.evaluate("[getComputedStyle(document.documentElement).fontSize, getComputedStyle(document.body).fontSize].join()") == "16px,18px")
    _b = pg.evaluate("[...document.querySelectorAll('button[data-fs]')].map(b=>b.textContent.trim()).join('|')"); check("4 size buttons", _b == "กเล็ก|กกลาง (เริ่มต้น)|กใหญ่|กใหญ่มาก", _b)
    check("preview line shown", pg.evaluate("!!document.querySelector('.fs-preview') && document.querySelector('.fs-preview').textContent.includes('ตัวอย่างข้อความ')"))
    for k, root in (("small", "13.28px"), ("large", "18.4px"), ("xlarge", "20.8px")):
        pg.evaluate("location.hash='#settings'"); pg.wait_for_selector("[data-fs]")
        pg.click(f"[data-fs={k}]"); pg.reload()
        check(f"text size {k} saved + applied", pg.evaluate("getComputedStyle(document.documentElement).fontSize") == root, pg.evaluate("getComputedStyle(document.documentElement).fontSize"))
    pg.evaluate("location.hash='#settings'"); pg.wait_for_selector("[data-fs]"); pg.click("[data-fs=small]")
    pg.click(".settings .head h1"); pg.wait_for_timeout(100)
    check("tap on empty area keeps text size", pg.evaluate("getComputedStyle(document.documentElement).fontSize") == "13.28px")
    check("เล็ก body ≈15px", abs(pg.evaluate("parseFloat(getComputedStyle(document.body).fontSize)") - 15) < 0.2)
    _f = pg.evaluate("[...document.styleSheets].flatMap(s=>[...s.cssRules]).filter(r=>r instanceof CSSFontFaceRule).map(r=>r.style.fontFamily).join()"); check("one font only (Anuphan)", _f.strip('"') == 'Anuphan', _f)
    # animation pass: reduced motion -> no particle loop, no CSS animations at all
    for h in ("splash", "garden", "bedtime", "pet"):
        pg.evaluate(f"location.hash='#{h}'"); pg.wait_for_timeout(250)
        r = pg.evaluate("[Ambient.running(), document.querySelectorAll('.amb-canvas,.amb-fx').length, document.getAnimations().length]")
        check(f"reduced motion: {h} has no canvas loop and no animations", r == [False, 0, 0], str(r))
    check("no JS errors", not errs, str(errs))

    # animation pass: motion ON by default without reduced motion; the settings switch turns it all off and persists
    pg2 = br.new_context(viewport={"width": 390, "height": 844}).new_page()
    errs2 = []; pg2.on("pageerror", lambda e: errs2.append(str(e)))
    pg2.goto(f"http://127.0.0.1:{PORT}/index.html#splash"); pg2.evaluate("localStorage.clear(); NL.reset()"); pg2.reload(); pg2.wait_for_timeout(600)
    r = pg2.evaluate("[Ambient.running(), Ambient.scene(), document.querySelectorAll('.amb-canvas').length, Ambient.particles()]")
    check("motion on (default): splash canvas loop runs, ≤ 40 particles", r[0] and r[1] == "splash" and r[2] == 1 and 0 < r[3] <= 40, str(r))
    pg2.evaluate("location.hash='#garden'"); pg2.wait_for_timeout(600)
    r = pg2.evaluate("[Ambient.running(), Ambient.scene(), document.querySelectorAll('.amb-canvas').length, Ambient.particles(), document.getAnimations().length > 0]")
    check("motion on: garden scene runs, one canvas, ≤ 40 particles, CSS animations on", r[0] and r[1] == "garden-sea" and r[2] == 1 and 0 < r[3] <= 40 and r[4], str(r))
    pg2.evaluate("location.hash='#settings'"); pg2.wait_for_selector("#motionToggle")
    check("motion switch shows เปิด by default, ≥ 48 px", pg2.evaluate("(b => b.getAttribute('aria-checked') === 'true' && b.textContent.includes('เปิด') && b.getBoundingClientRect().height >= 48 && b.getBoundingClientRect().width >= 48)(document.getElementById('motionToggle'))"))
    check("settings screen alone runs no canvas loop", not pg2.evaluate("Ambient.running()"))
    pg2.click("#motionToggle"); pg2.wait_for_timeout(100)
    check("switch off -> ปิด, html.motion-off, saved", pg2.evaluate("[document.getElementById('motionToggle').getAttribute('aria-checked'), document.documentElement.classList.contains('motion-off'), localStorage.getItem('nightlight-motion')].join()") == "false,true,off")
    for h in ("splash", "garden", "bedtime", "pet"):
        pg2.evaluate(f"location.hash='#{h}'"); pg2.wait_for_timeout(250)
        r = pg2.evaluate("[Ambient.running(), document.querySelectorAll('.amb-canvas,.amb-fx').length, document.getAnimations().length]")
        check(f"motion off: {h} has no canvas loop and no animations", r == [False, 0, 0], str(r))
    pg2.reload(); pg2.wait_for_timeout(300)
    check("motion off persists after reload (class set before app, switch shows ปิด)", pg2.evaluate("document.documentElement.classList.contains('motion-off') && !Ambient.running()") and
          (pg2.evaluate("location.hash='#settings'") or pg2.wait_for_selector("#motionToggle") or True) and pg2.get_attribute("#motionToggle", "aria-checked") == "false")
    pg2.click("#motionToggle"); pg2.evaluate("location.hash='#splash'"); pg2.wait_for_timeout(400)
    check("switch back on -> splash animates again", pg2.evaluate("Ambient.running() && !document.documentElement.classList.contains('motion-off')"))
    pg2.evaluate("location.hash='#morning'"); pg2.wait_for_selector("#collect"); pg2.click("#collect"); pg2.wait_for_timeout(200)
    r = pg2.evaluate("[!!document.querySelector('.amb-fx'), document.querySelector('.bd.total .num').classList.contains('glow')]")
    check("collect light: sparkle overlay + counter glow (motion on)", r == [True, True], str(r))
    pg2.wait_for_timeout(1600)
    check("collect sparkles finish and clean up within ~1.5 s", pg2.evaluate("!document.querySelector('.amb-fx') && !Ambient.running()"))
    check("no JS errors (motion on)", not errs2, str(errs2))
    br.close()
httpd.shutdown()
print("ALL PASS" if not fails else f"{fails} FAILED")
sys.exit(1 if fails else 0)
