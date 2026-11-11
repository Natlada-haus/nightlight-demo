#!/usr/bin/env python3
"""Moonpuff animation pass: capture frames + short videos WITH motion, and a CPU-throttled perf check.

Playwright + /usr/bin/google-chrome, 390x844, NO reduced motion (the audit in screenshot-v2.py runs with it).
Writes to ../art-v2/screens/anim/ (or argv[1]):
  - <scene>-f1..f6.png  6 frames ~250 ms apart: splash, garden-sea, garden-camp, morning-collect (mid-sparkle), pet
  - splash.webm / garden.webm (~6 s each, record_video 390x844) -> splash.mp4 / garden.mp4 / *.gif via ffmpeg (each ≤ 4 MB)
  - perf.json: CDP Emulation.setCPUThrottlingRate(4); over 5 s on splash and garden: page frame interval / fps,
    ambient loop draws per second, average + max ambient draw time, long tasks (> 50 ms) seen by PerformanceObserver
Usage: python3 tools/anim-frames.py [outdir]
"""
import functools, glob, http.server, json, os, shutil, socket, subprocess, sys, threading
from playwright.sync_api import sync_playwright

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(APP), "art-v2", "screens", "anim")
os.makedirs(OUT, exist_ok=True)
s = socket.socket(); s.bind(("127.0.0.1", 0)); PORT = s.getsockname()[1]; s.close()
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Q, directory=APP))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORT}/index.html"
VIEW = {"width": 390, "height": 844}
errors, foreign = [], []

def watch(pg, tag):
    pg.on("pageerror", lambda e: errors.append(f"{tag}: {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"{tag} console: {m.text}"))
    pg.on("request", lambda r: not r.url.startswith(f"http://127.0.0.1:{PORT}") and not r.url.startswith("data:") and foreign.append(r.url))

def fresh(pg, place="sea"):
    pg.goto(BASE + "#splash"); pg.evaluate("localStorage.clear(); NL.reset()"); pg.reload()
    pg.evaluate(f"(() => {{ const s = NL.state(); s.stars = [0, 1, 2, 3]; s.balance = 50; s.place = '{place}'; }})()")

def go(pg, h, wait=1500):
    pg.evaluate(f"location.hash = '#{h}'"); pg.wait_for_timeout(wait)

def frames(pg, name, n=6, gap=250):
    for i in range(1, n + 1):
        pg.screenshot(path=os.path.join(OUT, f"{name}-f{i}.png"))
        if i < n: pg.wait_for_timeout(gap)
    print("frames:", name)

def ffmpeg(src, stem):
    mp4, gif = os.path.join(OUT, stem + ".mp4"), os.path.join(OUT, stem + ".gif")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "26",
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-vf", "scale=390:-2", mp4], check=True)
    for fps, w in ((12, 390), (10, 320), (8, 260)):   # step down until the GIF is ≤ 4 MB
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-vf",
                        f"fps={fps},scale={w}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
                        gif], check=True)
        if os.path.getsize(gif) <= 4 * 1024 * 1024: break
    return {f: round(os.path.getsize(os.path.join(OUT, stem + "." + f)) / 1048576, 2) for f in ("webm", "mp4", "gif")}

PERF_JS = r"""
(ms) => new Promise(done => {
  const iv = []; let prev = 0, run = true, longs = [];
  const po = 'PerformanceObserver' in window ? new PerformanceObserver(l => l.getEntries().forEach(e => longs.push(Math.round(e.duration)))) : null;
  try { po && po.observe({ type: 'longtask', buffered: false }); } catch (e) {}
  Ambient.resetStats();
  const f = t => { if (prev) iv.push(t - prev); prev = t; if (run) requestAnimationFrame(f); };
  requestAnimationFrame(f);
  setTimeout(() => {
    run = false; po && po.disconnect();
    const avg = iv.reduce((a, b) => a + b, 0) / Math.max(1, iv.length), st = Ambient.stats();
    done({ pageFrames: iv.length, avgFrameMs: +avg.toFixed(2), pageFps: +(1000 / avg).toFixed(1),
           worstFrameMs: +Math.max(...iv).toFixed(1), ambientDrawsPerSec: +(st.frames / (ms / 1000)).toFixed(1),
           ambientAvgDrawMs: +st.avgMs.toFixed(2), ambientMaxDrawMs: +st.maxMs.toFixed(2), particles: Ambient.particles(),
           longTasksOver50ms: longs.length, longestTaskMs: longs.length ? Math.max(...longs) : 0 });
  }, ms);
})
"""

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome")

    # 1) frames (2x for crisp stills)
    ctx = br.new_context(viewport=VIEW, device_scale_factor=2, reduced_motion="no-preference")
    pg = ctx.new_page(); watch(pg, "frames")
    fresh(pg); go(pg, "splash", 2500); frames(pg, "splash")
    go(pg, "garden", 2500); frames(pg, "garden-sea")
    pg.evaluate("NL.state().place = 'camp'"); go(pg, "settings", 300); go(pg, "garden", 2500); frames(pg, "garden-camp")
    pg.evaluate("NL.state().collected = false"); go(pg, "morning", 800)
    pg.click("#collect"); pg.wait_for_timeout(120); frames(pg, "morning-collect")
    go(pg, "pet", 1200); frames(pg, "pet", gap=600)   # slower gap so the 8 s breathing cycle shows
    ctx.close()

    # 2) short videos (record_video 390x844, ~6 s each)
    vids = {}
    for stem, route in (("splash", "splash"), ("garden", "garden")):
        tmp = os.path.join(OUT, "_rec"); shutil.rmtree(tmp, ignore_errors=True)
        ctx = br.new_context(viewport=VIEW, reduced_motion="no-preference", record_video_dir=tmp, record_video_size=VIEW)
        pg = ctx.new_page(); watch(pg, "video-" + stem)
        fresh(pg); go(pg, route, 6500)
        ctx.close()
        src = glob.glob(os.path.join(tmp, "*.webm"))[0]
        dst = os.path.join(OUT, stem + ".webm"); shutil.move(src, dst); shutil.rmtree(tmp, ignore_errors=True)
        vids[stem] = ffmpeg(dst, stem); print("video:", stem, vids[stem], "MB")

    # 3) perf with 4x CPU throttling
    perf = {}
    ctx = br.new_context(viewport=VIEW, reduced_motion="no-preference")
    pg = ctx.new_page(); watch(pg, "perf")
    fresh(pg)
    cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    for name, route in (("splash", "splash"), ("garden-sea", "garden"), ("garden-camp", "garden")):
        if name == "garden-camp": pg.evaluate("NL.state().place = 'camp'"); go(pg, "settings", 300)
        go(pg, route, 1500)
        perf[name] = pg.evaluate(PERF_JS, 5000); print("perf:", name, perf[name])
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1})
    ctx.close()
    br.close()
httpd.shutdown()

res = {"cpuThrottle": 4, "perf": perf, "videosMB": vids, "jsErrors": errors, "nonLocalRequests": foreign}
json.dump(res, open(os.path.join(OUT, "perf.json"), "w"), indent=2, ensure_ascii=False)
print("JS errors:", errors or "none"); print("Non-local requests:", foreign or "none")
