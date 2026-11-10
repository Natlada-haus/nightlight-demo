# STATUS — Nightlight clickable demo

_Updated 2026-11-11_

## What was built
A mobile-first web prototype (390×844) in plain HTML/CSS/JS with no build step. It runs offline (`python3 -m http.server 8000`). Hash routing gives every screen its own URL: `#splash` `#connect` `#morning` `#garden` `#read` `#reader/<id>` `#stats`. State (light balance, lit stars, placed decor, connected sources, reading rewards) is kept in localStorage. The "รีเซ็ตเดโม" button is in the garden HUD and at the bottom of the stats screen.

- **Art:** all of it is inline SVG drawn for this demo, with no raster images. Navy→violet gradient sky, a pale-yellow moon, small round stars, three layers of mountains, a campfire glow, and a plain person (short hair, lavender sweater) sitting on a log with a mug. CSS animates the twinkling stars, flickering fire and glow; all animation turns off under `prefers-reduced-motion`.
- **Garden (actually works):** the cup constellation has 7 stars. The first 4 unlock because the streak is 4, and each costs 10 light. Once all 4 are lit they join into a cup shape labelled "กลุ่มดาวถ้วยชา (4/7 คืน)". Stars 5–7 are locked and tapping one shows how many more nights are needed. There are 5 small extra stars (10 each) and 6 decor items: โคมกระดาษ 30 (free today as the morning gift), ต้นสนเล็ก 20, กระถางดอกไม้ 20, ม้านั่งไม้ 40, กล้องดูดาว 50, เต็นท์ 60. Each decor item has its own spot on the ground. The balance never goes below 0; if there isn't enough, a "แสงไม่พอ…" toast appears.
- **Bedtime reading:** 5 original Thai pieces in `js/content.js`, about 290–316 words each (Intl.Segmenter count), 2-minute read each. Themes: forest, waves, rain, lighthouse, field of stars. The reader uses Trirong at 19px with line-height 2 and has a 5:00 ring countdown with pause/play. The "ฝันดีนะ" button gives +5 light once per story (mock).
- **Consistent numbers:** last night 7h 12m (23:08–06:20), base 100 + on-time 20 = 120 light, streak 4, 2 rest nights used (2/2). Stats come from the same `NL_NIGHTS` data: average 7h 2m, 4/7 on-time nights, 753 light this week, constellation 4/7. The "ข้อมูลตัวอย่าง (เดโม)" label appears on every screen with sleep data.

## Files
```
index.html  css/style.css  js/app.js  js/scene.js  js/content.js
assets/fonts/ Anuphan-Variable.woff2, Trirong-{Light,Regular,Medium}.woff2, OFL.txt, README.md
tools/screenshot.py   (Playwright + /usr/bin/google-chrome → ../demo-screens/*.png + contact-sheet.png)
README.md  .gitignore  STATUS.md
../demo-screens/01-splash … 07-stats.png, contact-sheet.png  (390×844 @2x)
```
(`docs/` was not written by me; I left it untouched.)

## Self-check
- [x] All 7 screens at 390×844: the script measured no horizontal overflow and page height = 844 on every screen. Fixed screens show no scrollbar. Inside lists, any scrollbar is hidden, and the reader text scrolls. No Thai vowel or tone marks are clipped (I checked each PNG by eye).
- [x] Read every screenshot and critiqued it, then fixed: moon overlapping the splash text; connect list overflowing (Oura and กรอกเอง were hidden → now all 8 fit); chip squeezing the sleep time on #morning; heading wrapping; lantern icon clipped; "7 ชม." label colliding with the "7:12" label in the chart; black focus box left on the tapped bar; stars landing on the hint text.
- [x] Contrast (WCAG AA): faint text #9399C6 on cards 5.7:1, on background 6.5:1; muted text 9:1; button text 12:1. Tap targets ≥44px (switches 52×44, icon buttons 44, star slots have 44px hit circles, tabs 52 tall).
- [x] Garden logic tested with Playwright: 4 stars + gift lantern + pine → 60 light; tent with 30 light → "แสงไม่พอ" toast and balance unchanged; locked star shows a toast; balance survives a reload; reader pause stops the timer; +5 is given once.
- [x] `grep ฟรี` → nothing. No medical claims (grep for รักษา / นอนไม่หลับ / ดีต่อสุขภาพ → nothing; the splash uses "ช่วยสร้างนิสัยนอน"). No brand logos: the source icons are generic glyphs (heart, band, watch, link, compass, ring, pencil). No ducks or animals.
- [x] No external network calls: the Playwright request log shows only localhost. The only "http" in the code is the SVG namespace inside the data-URI favicon, which makes no request.

## Score: 87/100
- **+** Every screen required by the brief is there and clickable; the numbers are the same on every screen; the art matches the MELODIST mood without copying it; the Thai copy is short and friendly; the stories are written natively in Thai, not translated.
- **−3** The character is small in the garden and there's empty ground at the front (there's room to show slightly more art).
- **−3** The chart palette fails the validator's lightness band and chroma checks. CVD separation and contrast pass. I kept the colours on purpose to match the star/moon icons, and added glyphs inside the bars plus a legend so colour isn't the only cue.
- **−3** The decor tray scrolls sideways, so the last 2 items are hidden at first (a cut-off card hints there is more). You can't remove or move decor.
- **−2** The splash has empty space between the art and the button. The Apple Health note wraps onto a second line.
- **−2** The 4 constellation slots the user lights don't follow the actual nights (it's a mock). The rest-night rule (2/2) is display-only, not logic.

## Known gaps / next
- No real data connection (all simulated), no manual time entry form, no bedtime reminders.
- No real Thai proofreading yet; a native speaker should read the 5 stories once more.
- Decor can't be dragged to a chosen spot (fixed spots only); no inventory or shop beyond the 6 items.
