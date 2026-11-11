import functools, http.server, os, socket, threading, sys
from playwright.sync_api import sync_playwright
APP=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=sys.argv[1]; os.makedirs(OUT,exist_ok=True)
s=socket.socket(); s.bind(("127.0.0.1",0)); port=s.getsockname()[1]; s.close()
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
h=http.server.ThreadingHTTPServer(("127.0.0.1",port),functools.partial(Q,directory=APP)); threading.Thread(target=h.serve_forever,daemon=True).start()
B=f"http://127.0.0.1:{port}/index.html"
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/google-chrome")
    pg=br.new_context(viewport={"width":390,"height":844},device_scale_factor=2,reduced_motion="reduce").new_page()
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(B+"#splash"); pg.evaluate("localStorage.clear(); NL.reset()"); pg.reload()
    def snap(n,ms=900):
        pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(ms); pg.screenshot(path=os.path.join(OUT,n+".png"))
        print(n, pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.scrollHeight]"))
    snap("01-splash")
    pg.evaluate("location.hash='#garden'"); pg.wait_for_selector("#stage")
    print("stage h", pg.evaluate("document.getElementById('stage').getBoundingClientRect().height"))
    for i in range(4): pg.click(f"[data-star='{i}']")
    pg.click("[data-decor=lantern]"); pg.click("[data-decor=pine]"); pg.wait_for_timeout(2000)
    snap("04-garden")
    pg.evaluate("location.hash='#read'"); snap("05-read")
    print("errors",errs); br.close()
h.shutdown()
