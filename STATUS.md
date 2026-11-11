# STATUS — Moonpuff demo v2 (features + senior-friendly)

_11 Nov 2026 11:12: app renamed to **Moonpuff** (was Nightlight / นอนได้พลัง). Repo name, URL and localStorage keys (`nightlight-*`) unchanged on purpose so links and saved progress keep working. v2 is live at https://natlada-haus.github.io/nightlight-demo/ (commit d07c035 + rename)._

_Updated 2026-11-11 (fix pass 2: Anuphan only, 4 text sizes). Preview copy only. The live demo in `../nightlight-demo/` was not touched. Nothing was pushed, deployed or published._

## What was built
A plain HTML/CSS/JS app (no build step, no network calls) for people aged 60+, written in Thai. Every screen has a hash route (see README). Navigation is 4 big tabs: **สวน / ก่อนนอน / สะสม / ตั้งค่า**. The splash → connect → morning → garden flow is unchanged.

1. **Morning, one tap.** "เก็บแสง" adds last night's light (+120 = 100 for 7 h 12 m, +20 for on-time bedtime) and reveals today's dream card ("แม่น้ำดาว"). It only works once. There is no countdown, nothing expires, and nothing is lost.
2. **Garden.**
   - The painted background changes with the chosen place. The constellation stars (48 px tap circles, centres ≥ 56 px apart) sit in open sky; each place has its own coordinates.
   - The pet "นุ่มนิ่ม" shows as an 80 px round painted portrait with a name pill next to the painted person. Tapping it opens the pet page.
   - Decor sits on each place's ground line and is shown larger than in v1 (scale 0.92).
   - **Place:** tap an item in the tray, and the free ground spots light up as 48 px yellow circles; tap one.
   - **Move / remove:** tap a placed item to open a sheet with "ย้ายไปที่อื่น" / "เก็บคืน (ได้แสงคืน X)" / "ปิด". Moving onto a taken spot swaps the two items. "เก็บคืน" returns the full price; the gift lantern goes back to being a gift.
   - The tray shows both hint lines ("แตะวงดาวสีเหลืองเพื่อจุด…" and "แตะของ แล้วแตะที่ว่างในสวนเพื่อวาง"), and "ดูทั้งหมด" opens a 2-column grid (`#decor`). No item is reachable only by sideways scrolling.
3. **Pet "นุ่มนิ่ม"** (cream cat with a peach ear patch, art `cat-1/2/3.jpg`). It grows with the **total** number of on-time nights, so nobody loses progress: ลูกแมว 0–6 · แมววัยรุ่น + scarf 7–20 · แมวโต + nightcap + lantern 21+. The pet page shows the stage, a progress bar, "อีก X คืนจะโตขึ้น" and all 3 stages (future stages greyed, with a lock and the night count).
4. **Places** (`#places`):

   | Place | Unlocks at |
   |---|---|
   | สวนดาวริมทะเล | default |
   | ทุ่งหญ้าดูดาว | 3 on-time nights |
   | แคมป์กลางป่า | 5 |
   | ห้องนอนอบอุ่น | special reward: 7 in a row |

   Locked cards say "นอนตรงเวลาอีก X คืน" / "นอนตรงเวลาต่อกันอีก X คืน". No prices.
5. **Collection book** (`#collect/*`):
   - **การ์ดความฝัน:** 12 slots; 5 collected before today, plus today's card. Tapping a card shows it large. Empty slots are soft silhouettes marked "ยังไม่ได้".
   - **กลุ่มดาว:** ถ้วยชา with lit count, the special แมวหลับ (locked until 7 in a row), and one "ยังไม่ได้" slot.
   - **ของแต่ง:** every item, showing "in the garden" or its price. Tapping an item jumps to the garden in place mode.
6. **Bedtime hub "ก่อนนอน"**, 6 big cards:
   - **นั่งนิ่ง ๆ:** 3/5/10 นาที, slowly breathing circle, พักไว้/ทำต่อ/หยุด, soft Web Audio chime at the end.
   - **หายใจช้า ๆ:** 4-4-4-4 by default or the easier "เข้า 4 · ออก 6"; 1/2/3 นาที; big circle, big Thai word and a number count; stop anytime.
   - **เสียงก่อนนอน:** 6 sounds. Each has a big on/off button and − / + volume in 5 steps (shown as bars and "3/5"). Sleep timer ไม่ปิด/15/30/60 with a fade-out over the last 30 s. Sounds keep playing while you use other screens; the hub shows "กำลังเปิดเสียง…" with a stop button.
   - **อ่านก่อนนอน 5 นาที:** reader body is 21 px Anuphan (line-height 1.8) at กลาง and scales with the text-size setting.
   - **ขอบคุณวันนี้:** "วันนี้ขอบคุณอะไร" + optional "เรื่องในหัวที่ขอวางไว้ก่อน". Saved locally with the date; past notes listed; delete asks to confirm (the safe choice "ไม่ลบ" is the primary button).
   - **เวลาเตรียมนอน:** − / + in 15-minute steps, on/off switch with visible "เปิด/ปิด" text, labelled "เดโม: ยังไม่แจ้งเตือนจริง".
7. **Settings:**
   - Text size **เล็ก / กลาง / ใหญ่ / ใหญ่มาก** (scale .83 / 1 / 1.15 / 1.3; default กลาง), shown as a 2×2 grid of 72 px buttons with a live "ตัวอย่างข้อความ" preview line. Saved in localStorage and applied before first paint.
   - Links: สถิติการนอน, เวลาเตรียมนอน, เชื่อมข้อมูล, หน้าเช้านี้.
   - A **"ทดลองกติกา (เดโม)"** box: "เพิ่มคืนตัวอย่าง: ตรงเวลา / นอนดึก" with a live result line and "คืนพักสัปดาห์นี้ ใช้แล้ว X/2".
   - Reset, with a confirm.
8. **Stats** (`#stats`, from Settings): bar chart with glyphs (star / moon / ring) plus a legend; a per-night list (day, date, hours, bedtime, status as icon + word, light); 4 tiles. All labelled "ข้อมูลตัวอย่าง (เดโม)".

## Rules (logic in `js/content.js`, one source for every screen)
- **On-time night** = bedtime 22:30–23:30 (target 23:00 ±30 min) **and** at least 6 h of sleep (`NL_isOnTime`).
- **Light** (`NL_lightFor`):
  - base = round(min(sleep, 7 h) / 7 h × 100). So 6 h → 86, 7 h or more → 100, and 9 h+ gives no extra.
  - +20 for an on-time night.
  - +5 per story, once per story.
  - +5 for a gratitude note, once per calendar day.
  - Star = 10. Decor costs 20–60; the lantern is a gift.
- **`computeStreak(nights, todayIso)`** is pure (does not change its input). It walks the nights in order:
  - On-time: kind `ontime`, run +1, total +1.
  - Otherwise, if that Mon–Sun week has used fewer than 2 rest nights: kind `rest` (used automatically, no user action), run +1.
  - Otherwise: kind `late` and the run restarts at 0. Light, pet growth, lit stars and decor are never taken away.
  - It returns `run`, `best`, `totalOnTime`, `restUsedThisWeek`, `rewardReached` (the run reached 7 at least once) and per-night details. The week counter resets every Monday.
- **Unlocks:**
  - Constellation stars: one per on-time night in total (max 7).
  - Pet stages: total on-time nights, 7 and 21.
  - Places: total ≥3 / ≥5, plus the bedroom when `rewardReached`.
  - Special reward (7 in a row, rest nights count): bedroom place + กลุ่มดาวแมวหลับ, with a gentle one-time celebration sheet.
- **Demo data** (10 nights, 1–10 Nov 2026): run 4, best run 5, 6 on-time nights in total, 1/2 rest nights used this week (9–15 Nov). In this data the pet needs 1 more night, 6 of 7 stars are unlocked, meadow and camp are open, and the bedroom needs 3 more nights in a row. 6 Nov is a late night after both rest nights of that week were used, so the run restarted there (shown neutrally as "นอนดึก").
- No penalties, no streak-loss messages, no leaderboards, nothing that expires.

## Senior-friendly checklist (WCAG 2.2 AA)
- [x] **Type** (rem based, one font: **Anuphan** for the whole app, reader included; Trirong removed):
  - At กลาง (default): body 18 px, line-height 1.7; secondary 16 px; tab labels 16 px; reader 21 px with line-height 1.8.
  - Secondary text is `max(14px, 1rem)`, so at เล็ก it never drops under 14 px. Only the "เดโม" tag is smaller (13 px at กลาง, 12 px minimum at เล็ก).
  - Audit: every visible text node is checked (except that tag) against a floor of 16 px at กลาง / ใหญ่ / ใหญ่มาก and 14 px at เล็ก. Across 42 screens at กลาง plus 33 at each other size: **0 found**. SVG text (chart axis, constellation label, pet name) is 16 viewBox units.
- [x] **Text size** in 4 steps, **เล็ก / กลาง / ใหญ่ / ใหญ่มาก** (`--fs` .83 / 1 / 1.15 / 1.3 on `<html>`; body ≈15 / 18 / 20.7 / 23.4 px). Default is กลาง, the choice is stored in localStorage, and it applies to the whole app. The settings card has 4 big buttons (≥ 72 px tall) and a live "ตัวอย่างข้อความ" preview line.
  - The full screen set was re-shot at เล็ก, ใหญ่ and ใหญ่มาก (`../art-v2/screens/small|large|xlarge/`). No horizontal overflow and no clipped text by audit; I checked by eye that Thai vowels and tone marks are not clipped.
  - Lists scroll. At ใหญ่มาก the garden scrolls: the stage keeps ≥ 500 px and the decor tray sits below it, reachable with a short scroll (shot `40-garden-text-xlarge-tray.png`).
- [x] **Tap targets (2.5.8 and stricter):** every interactive element is ≥ 48×48 with ≥ 8 px spacing.
  - The audit measures every visible, non-hidden target, using the real round hit areas for SVG stars and spots: **0 under 48 px, 0 pairs closer than 8 px**, at all 4 text sizes. Target sizes are set in px, so they stay ≥ 48 px even at เล็ก. While you are placing or moving decor, the sky stars rest (dimmed, not tappable), so only the ground spots are targets.
  - Buttons are 52–64 px tall; tabs 64 px; − / + are 52–64 px circles.
- [x] **Tap only:** no drag, swipe, long-press or pinch. The tray can scroll sideways but never has to ("ดูทั้งหมด" grid). Decor moves by tap → tap.
- [x] **Contrast** (measured, WCAG formula). The audit composites each text's real background on every screen; lowest = **8.28:1**.

  | Pair | Ratio |
  |---|---|
  | Text #F6F3FF on card #18234F | 13.8:1 |
  | Secondary #D3D6F0 on card | 10.5:1 |
  | Demo label #B9BEE2 on card | 8.3:1 |
  | Demo label on page | 9.6:1 |
  | Button ink #1A1633 on yellow #FFD27A | 12.2:1 |
  | Yellow numbers on card | 10.6:1 |
  | Green "done" on card | 10.6:1 |
  | Garden label #FFF3C4 on pill #0B1433 | 16.2:1 |
  | Reader text #EFE6D4 on #171424 | 14.6:1 |
  | Chart axis #C2C7EA on card | 9.1:1 |
  | Warn toast | 9.9:1 |

  Text over painted art always sits on a solid pill / panel (HUD, labels, pet name, mode bar) or a strong gradient scrim (splash 0.78–0.92 alpha, bedtime header 0.82→solid, morning header).
- [x] **Focus visible:** 3 px yellow outline with 3 px offset on all HTML controls; SVG stars and spots get a white 3 px ring. Every icon-only control has an aria-label (pause/play in the reader, − / +, stars, spots, the pet badge). Dialogs move focus to the first button and close on Esc.
- [x] **No info by colour only:** nights use star / moon / ring icons plus words; chart bars carry glyphs plus a legend and the per-night list; switches show "เปิด/ปิด"; locked items have a lock icon and words.
- [x] **prefers-reduced-motion:** all animation and transitions are off. The breathing circle then stays still and changes fill, while the words and numbers lead.
- [x] **One main action per screen** (the yellow button). Every sub-screen has a "‹ กลับ" button with icon and text (52 px).
- [x] **Wording:** grep over js/css/html/py/md (excluding untouched docs/) finds no "free" word in Thai and none of the listed medical/health claim words. Breathing and quiet are described only as calm activities ("นั่งสบาย ๆ หายใจตามวงกลมช้า ๆ"). The only "Health" strings are the brand names Apple Health / Samsung Health / Google Health Connect on the connect screen.
- [x] **No ducks; original characters.** The main character is in the painted art. The pet is our cream cat with a peach ear patch.

## Sounds
Six 24 s mono loops, made offline by `tools/make_sounds.py`. They are played through Web Audio `AudioBufferSourceNode.loop` (gapless); Vorbis is used where supported, AAC otherwise. Synthesis details, seam and peak checks, and the CC0 note are in `assets/sounds/README.md`. All checks print OK. Peaks after encoding are −2.9 to −3.1 dBFS.

## Files changed / added
`index.html`, `css/style.css` (rewritten, painted-art look kept), `js/app.js` (rewritten), `js/scene.js` (places/garden/constellations), `js/content.js` (data + rules; the stories are unchanged), `README.md`, `STATUS.md`, `STATUS-v2-RUN.md`. New: `assets/sounds/*.ogg|*.m4a|README.md`, `tools/make_sounds.py`, `tools/screenshot-v2.py`, `tools/test-v2.py`. `tools/shots-v2.py` was not touched.

## Art
All 12 art files are present: splash, garden, bedroom, meadow, cat-1/2/3, card-night-island / rain / whale / lanterns / moonbakery. Each image still has a fallback (navy gradient + moon icon) in case a file goes missing. Today's dream card "แม่น้ำดาว" reuses a crop of `meadow.jpg`, because the brief lists only 5 card images.

## Known gaps
- Nobody has listened to the sounds yet. The AAC (.m4a, Safari) files may have a tiny gap at the loop seam because of encoder priming; Vorbis is preferred where the browser supports it. Opened from `file://`, the sounds fall back to `<audio loop>`.
- On สวนดาวริมทะเล the front row of decor overlaps the bottom edge of the painted characters a little, because the islet is crowded. The camp constellation is a slightly reshaped cup so it fits between the trees and the moon.
- The painted garden art has its own cream cat (plus a rabbit and a penguin) next to our pet badge. A user may read the painted cat as the pet.
- The morning date is fixed at the demo day (Wed 11 Nov). Gratitude notes use the device's real date.
- No real notifications, no real data connection, no manual time-entry form.
- Not yet tested with real users aged 60+, and the Thai copy has not been proofread by a native speaker of that age.
- The old `tools/screenshot.py` (v1 routes) is out of date. `tools/shots-v2.py` (old 3-screen art sample) is still present and untouched.
- At เล็ก the 4 size buttons show the "ก" sample at fixed px sizes, so the sample does not grow with the setting; this is intentional, for comparison.

## Score: 86/100 (honest)
- **+** Every feature in the brief works and is tested: 45/45 logic checks pass and the audit is clean on 141 screenshots at all 4 text sizes. Rules are one pure function used by every screen. The senior rules are measured by script rather than assumed. Sounds are generated and validated. The painted look is kept.
- **−4** Garden composition: decor on the sea islet overlaps the characters slightly; the camp cup shape is reshaped; the painted cat sits next to the pet badge.
- **−3** Sounds have not been heard by a human, and the Safari AAC loop seam has not been tested on a device.
- **−3** No usability test with 60+ users; the copy has not been proofread.
- **−2** At ใหญ่มาก the garden needs a short scroll to reach the tray.
- **−2** Fixed demo date and simulated data (by design for a demo).
