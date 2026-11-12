# Bedtime sounds (เสียงก่อนนอน)

**License:** generated procedurally for this demo, no third-party recordings; CC0 / public domain dedication by the project.
Nothing was downloaded. Every file is computed from random noise and sine waves by `tools/make_sounds.py` (numpy + scipy), then encoded with ffmpeg.

| File | Sound (Thai label) | How it is made |
|---|---|---|
| `rain` | ฝน | Pink noise band-passed 600–7500 Hz with a slow random swell (the hiss), plus ~180 droplets per second (random impulses → 4 ms decay → band-pass 2–7 kHz), plus a soft low "roof" rumble (brown noise low-passed at 300 Hz). |
| `waves` | คลื่น | Brown noise low-passed at 700 Hz for the body, plus a pink-noise "wash" band (500–4000 Hz) that rises and falls with a swell envelope repeating every 8 s (3 swells per 24 s loop, so it loops cleanly). |
| `fire` | กองไฟ | Warm low roar (brown noise low-passed at 250 Hz with a slow wobble), a faint flame hiss (pink 1–3 kHz), many small crackles (random clicks, 1.5 ms decay, high-passed 1.5 kHz) and a few louder pops (8 ms decay, 600–4000 Hz). |
| `crickets` | ป่ากลางคืน (จิ้งหรีด) | 3 crickets: sine carriers at 4.2 / 4.7 / 5.1 kHz, gated by 30–38 Hz pulse trains in chirp groups of 3–4 pulses. The group periods (0.75 / 1.0 / 1.5 s) divide 24 s and are phased so the seam falls between chirps. A quiet leafy breeze (pink 200–1500 Hz) sits underneath. |
| `fan` | พัดลม | Pink noise low-passed at 1.8 kHz, lightly modulated at an 18 Hz blade rate, plus a faint 100/200 Hz motor hum (whole cycles per loop). |
| `noise` | เสียงซ่า | Pink noise, gently low-passed at 6 kHz so it is soft rather than hissy. |

Format: mono, 22.05 kHz, 24 s loops. `.ogg` (Vorbis q3) is used where the browser supports it; `.m4a` (AAC 80 kbps) is there for Safari.

**Seamless loop:** each sound is rendered 2 s longer than the loop. The extra tail is then folded onto the start with an equal-power (sin/cos) crossfade, so the last sample flows into the first one.

**Checks** (run `python3 tools/make_sounds.py`; every sound prints OK):
- Peak is −3.0 dBFS in the WAV source. After encoding it measures −2.9 to −3.1 dBFS (ffmpeg volumedetect), within the −1 dBFS limit.
- Seam: the RMS of the last 50 ms vs the first 50 ms differs by 0.02–2.3 dB. That is always below the 95th percentile of the same measure between neighbouring 50 ms windows inside the loop (2.3–17.5 dB). So the seam changes no more than the sound normally does.
- The sample jump at the seam is below the 99.9th percentile of normal sample-to-sample steps.

Nobody has listened to these yet (the build machine has no speakers). A human should listen once on a phone speaker and on headphones.

## เพลงกล่อม (lullabies, added in v3, 12 Nov 2026)

**License:** original melodies composed and synthesised for this demo by `tools/make_lullabies.py` (numpy + scipy, then ffmpeg). No recordings, no samples, no existing tunes. CC0 / public domain dedication by the project, the same as the nature sounds.

| File | Thai name in the app | What it is | Loop |
|---|---|---|---|
| `lullaby-box` | กล่องเพลงพระจันทร์ | music-box timbre (sine partials, fast decay), 60 BPM, 3/4, 16 bars | 48 s |
| `lullaby-piano` | เปียโนก่อนนอน | soft piano-like partials, slow broken chords + a small melody, 56 BPM, 4/4, 12 bars | 51.428571 s |
| `lullaby-bells` | ดาวกระซิบ | soft bell partials, sparse notes | 48 s |

Format: mono, 22.05 kHz, peak −6 dBFS (quieter than the nature sounds). `.ogg` (Vorbis) and `.m4a` (AAC, for Safari).

**Loop length:** the app trims each decoded file to exactly one loop of **its own length** (`NL_LULLABIES[].loop` in `js/content.js`, used by `Snd.exactLoop()`); before v3 every file was cut to 24 s, which would have chopped the lullabies in half.

**Checks:** `python3 tools/check_sound_seams.py` decodes all 18 files, applies the same trim and compares the jump at the wrap point with the 99.9th-percentile sample step inside the loop: **ALL OK** (12 Nov 2026). The lullabies begin on a note, so the first 10 ms are louder than the last 10 ms (a soft note attack, not a click). Nobody has listened on a phone yet; a human should.
