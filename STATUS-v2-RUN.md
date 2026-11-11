# STATUS-v2-RUN — run summary, 11 Nov 2026

Scope: work only in `nightlight-demo-v2-preview/`. `../nightlight-demo/` was not touched. No push, deploy or publish. No network calls at runtime.

## Files changed
- `index.html`: modal root; the saved text size is applied before first paint.
- `css/style.css`: rewritten in rem units on a `--fs` scale; 48 px+ targets; focus rings; reduced motion. The v2 painted-art rules are kept.
- `js/app.js`: rewritten. Router plus 19 routes, 4-tab navigation, one-tap morning, garden place/move/swap/remove with refunds, places, pet, collection book, bedtime hub (quiet timer, breathing, sound mixer with sleep timer and fade-out, reading, gratitude, wind-down), stats, settings (text size, demo nights, reset), one-time celebration.
- `js/scene.js`: per-place garden layout (image frame, 7 open-sky stars, small stars, label, 6 ground spots, pet portrait), special constellation, mini constellation renderer.
- `js/content.js`: 10-night demo data; rules `NL_isOnTime`, `NL_lightFor`, `NL_weekOf`, pure `computeStreak`; dream cards, places, pet stages. The stories are unchanged.
- `README.md`, `STATUS.md` (rules, checklist, contrast table, gaps, score).
- New:
  - `assets/sounds/{rain,waves,fire,crickets,fan,noise}.{ogg,m4a}` + `assets/sounds/README.md` (CC0 note, synthesis)
  - `tools/make_sounds.py`
  - `tools/screenshot-v2.py`
  - `tools/test-v2.py`
- Output: `../art-v2/screens/01…34-*.png`, `contact-sheet-all.png`, `xlarge/01…33-*.png`, `audit.json`.
- Not touched: `tools/shots-v2.py`, `tools/screenshot.py`, `docs/`.

## Checks run (all in this run, after the last code change)
| Check | Result |
|---|---|
| `python3 tools/make_sounds.py` | 6/6 OK. Peak −3.0 dBFS (WAV). Encoded .ogg / .m4a measure −2.9 to −3.1 dBFS by ffmpeg volumedetect. Seam RMS last vs first 50 ms differs 0.02–2.31 dB, always below the in-loop p95 of neighbouring windows; seam sample jump below the p99.9 step. |
| `python3 tools/test-v2.py` | **37/37 PASS**: computeStreak (rest nights, 3rd late night, Monday reset, 7-in-a-row, purity), light formula (120 / 86 / no extra above 7 h), one-tap collect only once, gift lantern, place/move/swap/remove with full refund, not-enough-light, locked star, reading +5 once, gratitude +5 once a day, delete confirm both ways, bedroom locked → unlocked, demo late night auto-covered (2/2), celebration once, pet stage 2, new week resets the rest count, text size persists, no JS errors |
| `python3 tools/screenshot-v2.py` | 34 screens at normal size + 33 at ใหญ่มาก, 390×844 @2x, reduced motion. Audit over all 67: page overflow 0, elements past the edge 0, clipped text 0, targets < 48 px 0, target pairs < 8 px apart 0, text < 16 px (except the "เดโม" tag) 0, contrast failures 0 (lowest 8.28:1), JS errors 0, non-localhost requests 0 |
| Visual review | Every screenshot opened and reviewed, at both sizes. |
| Wording grep over js/css/html/py/md (excluding untouched docs/) | No Thai "free" word, no medical/health claim words, no ducks |

### Fixed during the visual review
- The garden hint pill covered the top stars → hints moved into the tray.
- A bottom decor spot was cut off → bottom-anchored 390×560 stage, garden scrolls at large text sizes.
- Stars collided with the "ฉาก" button in meadow, camp and bedroom → stars repositioned per place.
- Decor was too small → scale raised from 0.62 to 0.92.
- Tray name truncated with "…" → names wrap.
- Chart bars were 41 px tap targets → chart made non-interactive, with a per-night list added.
- Settings rows touched each other → 8 px gaps.
- Place thumbnails showed only sky → cropped to the scene.
- The idle breathing text overflowed its circle.
- A stray "·" on the morning screen.
- Stale toasts carried over to the next screen → cleared on route change.
- One JS syntax error introduced by a fix, caught by the tests and fixed.

## Open issues
1. No human has listened to the sounds yet; the AAC (Safari) loop seam is untested on a device.
2. On the sea islet, the front-row decor slightly overlaps the painted characters' feet. The camp constellation is a reshaped cup.
3. `garden.jpg` has its own painted cream cat next to our pet badge, which could confuse "which one is my cat".
4. No usability test with people aged 60+; the Thai copy needs a native proofread.
5. At ใหญ่มาก the garden tray sits below the fold (short scroll).
6. The old `tools/screenshot.py` targets the v1 routes and is out of date. The `../art-v2/screens/samples/` folder was not made by this run.

Honest score: **86/100** (details in STATUS.md).

---

## Fix pass 2 — 11 Nov 2026 (founder requests)
Same rules as before: only this folder was changed, `../nightlight-demo/` was not touched, and nothing was pushed or deployed.

### Changes
1. **Font: Anuphan for the whole app.**
   - The 3 Trirong `@font-face` rules and the `--serif` variable are deleted. The reader title and story text now use Anuphan.
   - The unused `assets/fonts/Trirong-*.woff2` files are **removed** from the preview (identical copies remain in `../nightlight-demo/`); `assets/fonts/README.md` notes this.
   - Readability at กลาง: body 18 px with line-height 1.7 (was 1.6), including lead, sub, sheet text, notes and textarea. Story text is 21 px with line-height 1.8 and a slightly brighter ink (#F4EDDD on #171424). The story title is 26 px, weight 600.
2. **Text size, 4 steps: เล็ก / กลาง / ใหญ่ / ใหญ่มาก.**
   - `--fs` is .83 / 1 / 1.15 / 1.3 on `<html>`, giving body text ≈15 / 18 / 20.7 / 23.4 px. Default is กลาง, saved in localStorage (`nightlight-text-size`: small/normal/large/xlarge). Saved values from the old 3-size version still work.
   - Settings shows a 2×2 grid of 72 px buttons (each with a "ก" sample; กลาง is marked "(เริ่มต้น)") and a live "ตัวอย่างข้อความ" preview line.
   - Secondary text is `max(14px, 1rem)`, so at เล็ก nothing drops under 14 px (the "เดโม" tag never goes under 12 px). Tap targets are sized in px, so they stay ≥ 48 px at เล็ก.
3. **Bug found and fixed:** `<html>` carried a `data-fs` attribute, so a tap on any empty area matched the size-button handler. That re-rendered the screen and showed the toast "เปลี่ยนขนาดตัวอักษรแล้ว". The attribute is renamed to `data-textsize`, and a regression test was added.
4. **Tap spacing at ใหญ่:** in decor place/move mode, star 6 sat 7.2 px from the "ยกเลิก" bar. While placing or moving, stars are now dimmed and not tappable (aria-hidden), so only the ground spots are targets.
5. `tools/screenshot-v2.py` now runs 4 passes:
   - กลาง → `../art-v2/screens/01…42-*.png` plus `contact-sheet-all.png` (regenerated).
   - เล็ก / ใหญ่ / ใหญ่มาก → `small/`, `large/`, `xlarge/` (33 each).
   - New shots in the main set: `32-settings-text-sizes`, `33-settings-text-small`, `34-bedtime-text-small`, `35-garden-text-small`, `36-settings-text-xlarge`, `37-bedtime-text-xlarge`, `38-reader-text-xlarge`, `39-garden-text-xlarge`, `40-garden-text-xlarge-tray`.
   - The font-size floor in the audit is 16 px, or 14 px at เล็ก.
6. `tools/test-v2.py`: added checks for default กลาง (16 px root / 18 px body), the 4 buttons, the preview line, each size saved and applied after reload, เล็ก body ≈15 px, a tap on an empty area keeping the size, and Anuphan as the only `@font-face`.
7. `tools/shots-v2.py` was never removed; it is still present and untouched.

Files changed: `css/style.css`, `js/app.js`, `js/scene.js`, `index.html`, `tools/screenshot-v2.py`, `tools/test-v2.py`, `README.md`, `STATUS.md`, `assets/fonts/README.md`. Deleted: `assets/fonts/Trirong-{Light,Regular,Medium}.woff2`.

### Checks (after the last code change)
| Check | Result |
|---|---|
| `python3 tools/test-v2.py` | **45/45 PASS** |
| `python3 tools/screenshot-v2.py` | 141 screens (42 กลาง + 33 × เล็ก/ใหญ่/ใหญ่มาก). Page overflow 0, elements past the edge 0, clipped text 0, targets < 48 px 0, pairs < 8 px 0, text under the floor 0, contrast failures 0 (lowest 8.28:1), JS errors 0, non-localhost requests 0 |
| Visual review | Opened the new size shots (settings ×3 sizes, bedtime เล็ก/ใหญ่มาก, garden เล็ก/ใหญ่มาก + tray, reader กลาง/ใหญ่มาก). Thai vowels and tone marks are not clipped; layouts are tidy at เล็ก. |
| Grep ฟรี + medical words (js/css/html/py/md, excluding docs/) | none |
| Grep Trirong / serif fonts in js/css/html | none (only the `sans-serif` fallback) |

### Notes / open
- At ใหญ่มาก the decor tray is below the garden stage and needs a short scroll; it stays fully reachable (`40-garden-text-xlarge-tray.png`). The tray's sideways list is still optional, because "ดูทั้งหมด" opens the grid.
- The "ก" samples on the size buttons are fixed px sizes (for comparison), so they do not grow with the setting.
- Earlier open issues remain: sounds not heard by a human, no 60+ user test, painted cat next to the pet badge.

## Fix pass 3 — 11 Nov 2026 10:20–11:00 ICT (founder approved publishing after 3 fixes; done by งานเสริม)
1. **garden.jpg without the painted cat:** codex image_generation edit of the original (input image attached), same composition; only the cream cat on the right of the islet removed. Our pet badge is now the only cat in the sea scene. Raw files: ../art-v2/raw-02-garden-v2-nocat.png (old one kept as raw-02-garden-v1-with-cat.png).
2. **Painted decor:** the 6 flat SVG decor items (lantern, pine, flowers, bench, telescope, tent) are replaced by painted sprites made one at a time by codex image_generation with transparent backgrounds, trimmed to 240 px tall in assets/art/decor/*.png. Used in the garden (SVG <image>, slight night tint), tray, grid, decor sheet and collection. Raw files: ../art-v2/decor/.
3. **Sound loops:** OGG decodes to exactly 24.000 s and wraps cleanly. AAC (.m4a, Safari) decodes 208 samples longer with a padded, faded last frame (fan: wrap jump 0.19 vs normal step p99.9 0.05 → would click). Fix in js/app.js `Snd.exactLoop()`: after decoding, skip any leading priming silence and keep exactly 24 s, so the loop wraps on the crossfade made by make_sounds.py. `tools/check_sound_seams.py` emulates this: all 12 files OK (wrap jump ≤ the in-loop p99.9 step). Not tested by ear or on a real iPhone. The `<audio loop>` fallback (only used when opened from file://) can't be trimmed.
4. **Decor vs feet:** sea islet has its own 6 spots on the free grass at the sides (characters at x≈75–250), 2 rows ≥56 apart; decor tap target is a fixed 48×48 at the item's base; while placing/moving, placed decor and stars rest (not tappable) so only the spots are targets; pet badge moved to (330, 360).
Checks after the last change: test-v2.py ALL PASS (44 checks); screenshot-v2.py 141 screens (42 + 33×3 sizes): 0 issues (overflow, clipping, targets <48, pairs <8 px, font floor), min contrast 8.28:1, JS errors none.


## Animation pass — 11 Nov 2026 (founder: "alive but calm")
No commits or pushes; the lead reviews and pushes. No copy, logic or rules changed. The only new copy is the settings card for the motion switch. No ฟรี, no medical words, Anuphan only, demo labels kept.

### Files
- **New:**
  - `js/ambient.js`: canvas particles, scene mapping, collect/star bursts, the motion setting.
  - `tools/anim-frames.py`: frames, videos, perf.
- **Changed:**
  - `index.html`: loads ambient.js before app.js; the pre-paint script sets `motion-off`.
  - `css/style.css`: new block at the end. The reduced-motion rule at ~line 490 is untouched.
  - `js/app.js`:
    - `render()` adds `.enter` on route change and calls `Ambient.scan`.
    - Collect: burst + glow.
    - Star lit: ring.
    - `countUp` respects the switch.
    - The settings card and the `motionToggle` handler.
  - `js/scene.js`: the pet `<image>` is wrapped in a clipped `<g class>` so it can breathe inside a still frame.
  - `tools/test-v2.py`: 17 new checks.
  - `STATUS.md`.

### Checks (after the last code change)
| Check | Result |
|---|---|
| `python3 tools/test-v2.py` | **ALL PASS, 62 checks**. New checks, all PASS: <br>• Reduced motion: splash, garden, bedtime and pet have no `.amb-canvas`, `Ambient.running()` is false and `document.getAnimations()` is 0. <br>• Motion on by default: splash and garden loops run with one canvas and ≤ 40 particles; the settings screen runs no loop. <br>• The switch is ≥ 48 px and shows เปิด. Turning it off gives ปิด, `html.motion-off` and the saved value `off`; the same 4 screens then have no canvas, no loop and 0 animations. <br>• The setting persists after reload; turning it back on animates again. <br>• Collect shows the overlay and the counter glow, then cleans up within 1.5 s. <br>• No JS errors in either context. |
| `python3 tools/screenshot-v2.py` | 141 screens (42 กลาง + 33 × เล็ก/ใหญ่/ใหญ่มาก), reduced motion: **0 issues**. Min contrast 8.28:1, JS errors none, non-local requests none. |
| `python3 tools/anim-frames.py` | `../art-v2/screens/anim/`: `splash`, `garden-sea`, `garden-camp`, `morning-collect` (mid-sparkle) and `pet`, each `-f1..f6.png` at 250 ms apart (pet at 600 ms). <br>Videos: `splash`/`garden` `.webm` 0.55/0.61 MB, `.mp4` 0.20/0.30 MB, `.gif` 2.67/2.96 MB (all ≤ 4 MB). <br>JS errors none, non-local requests none. |
| Perf, CDP `Emulation.setCPUThrottlingRate` 4, 5 s each | Splash: page 60 fps (16.7 ms average frame), ambient 30 draws/s, 0.56 ms average / 2.7 ms max per draw, 30 particles, 0 long tasks. <br>Garden sea: 60 fps, 30 draws/s, 0.50 / 1.3 ms, 38 particles, 0 long tasks. <br>Garden camp: 60 fps, 30 draws/s, 0.48 / 1.2 ms, 34 particles, 0 long tasks. |
| Visual review | Splash, all 4 garden places, bedtime, pet, morning collect, star ring, card detail and the settings card were checked by eye. The flames and glow sit on the painted fires in splash and camp. The collect sparkles first landed on the digits and the "เดโม" line; they were moved to the empty space left of the number. |

### Notes / open
- Perf was measured in headless desktop Chrome with throttling, not on a real low-end phone. On a phone the CSS transforms are composited, but the garden's existing SVG pulse animations still repaint the SVG.
- There is no garden background drift (on purpose, see STATUS.md), and no reading-list hero exists, so that effect went on the bedtime hub header.
- Tooling: Playwright's `record_video` needs its own ffmpeg, so `~/.cache/ms-playwright/ffmpeg-1011/ffmpeg-linux` is a symlink to the system `/usr/bin/ffmpeg` (which has libvpx); nothing was downloaded.
- Not yet checked with 60+ users whether the motion feels calm enough. The switch is the escape hatch.
