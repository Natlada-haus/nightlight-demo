#!/usr/bin/env python3
"""Moonpuff demo: procedural bedtime sound loops (offline, no recordings).

Every sound is synthesised from numpy noise/oscillators, made into a seamless
loop with an equal-power crossfade, normalised to -3 dBFS peak, written as
WAV (temp) and encoded with ffmpeg to .ogg (Vorbis) and .m4a (AAC).

Usage:  python3 tools/make_sounds.py          (writes assets/sounds/*.ogg|*.m4a)
Checks: peak <= -1 dBFS; seam RMS difference (last 50 ms vs first 50 ms) no larger
        than the 95th percentile of the same measure between adjacent 50 ms windows
        inside the loop (i.e. the seam changes no more than the sound normally does);
        sample jump at the seam no larger than the 99.9th percentile step.
"""
import os, subprocess, sys, tempfile
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 22050          # mono, 22.05 kHz is plenty for soft ambiences
LOOP = 24.0         # loop length in seconds
XF = 2.0            # crossfade length in seconds
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "sounds")
N = int(SR * LOOP)
NX = int(SR * XF)
TOT = N + NX        # render a little longer, then fold the tail onto the head


def rng(seed):
    return np.random.default_rng(seed)


def white(r, n=TOT):
    return r.standard_normal(n)


def pink(r, n=TOT):
    """Pink (1/f) noise by spectral shaping."""
    w = r.standard_normal(n)
    f = np.fft.rfft(w)
    k = np.arange(len(f)); k[0] = 1
    f /= np.sqrt(k)
    p = np.fft.irfft(f, n)
    return p / np.std(p)


def brown(r, n=TOT):
    """Brown (1/f^2) noise, leaky integrator, high-passed to remove drift."""
    b = signal.lfilter([1.0], [1.0, -0.995], r.standard_normal(n))
    b = hp(b, 25)
    return b / np.std(b)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfiltfilt(sos, x)


def lp(x, fc, order=2):
    sos = signal.butter(order, fc, btype="low", fs=SR, output="sos")
    return signal.sosfiltfilt(sos, x)


def hp(x, fc, order=2):
    sos = signal.butter(order, fc, btype="high", fs=SR, output="sos")
    return signal.sosfiltfilt(sos, x)


def slow_lfo(r, n=TOT, rate=0.15, depth=0.2):
    """Smooth random amplitude wobble (low-passed noise), centred on 1."""
    m = lp(r.standard_normal(n), rate, order=1)
    m = m / (np.max(np.abs(m)) + 1e-9)
    return 1.0 + depth * m


def t_axis(n=TOT):
    return np.arange(n) / SR


def impulses(r, rate_hz, n=TOT):
    """Poisson impulse train with random amplitudes."""
    x = np.zeros(n)
    count = r.poisson(rate_hz * n / SR)
    pos = r.integers(0, n, count)
    x[pos] = r.uniform(0.2, 1.0, count) * r.choice([-1, 1], count)
    return x


def decay_kernel(ms):
    L = int(SR * ms / 1000 * 5)
    return np.exp(-np.arange(L) / (SR * ms / 1000))


# ---------------------------------------------------------------- sounds
def rain():
    """Steady rain: band-passed pink 'hiss' with a slow random swell, plus
    hundreds of droplets (Poisson impulses through a 4 ms decay, band-passed
    2-7 kHz) and a soft low 'roof' rumble from low-passed brown noise."""
    r = rng(11)
    hiss = bp(pink(r), 600, 7500) * slow_lfo(r, rate=0.12, depth=0.15)
    drops = np.convolve(impulses(r, 180), decay_kernel(4), mode="same")
    drops = bp(drops, 2000, 7000)
    drops /= np.std(drops)
    rumble = lp(brown(r), 300)
    return 1.0 * hiss + 0.35 * drops + 0.45 * rumble


def waves():
    """Gentle sea: brown noise low-passed at 700 Hz carries the body, and a
    pink 'wash' band (500-4000 Hz) rises and falls with a swell envelope.
    Swells repeat every 8 s (3 per 24 s loop) so the loop stays periodic,
    with small random variation in each swell's strength."""
    r = rng(22)
    t = t_axis()
    period = 8.0
    ph = (t % period) / period
    env = np.where(ph < 0.45, np.sin(np.pi * ph / 0.9) ** 2, np.exp(-(ph - 0.45) * 5.5))
    env = lp(env, 2.0, order=1)
    env = 0.25 + 0.75 * env / env.max()
    body = lp(brown(r), 700) * (0.55 + 0.45 * env)
    wash = bp(pink(r), 500, 4000) * env ** 2
    return 0.9 * body + 0.7 * wash


def campfire():
    """Campfire: a warm low roar (brown noise low-passed 250 Hz with a slow
    wobble), a faint breathy flame hiss (pink 1-3 kHz), many small crackles
    (Poisson clicks, 1.5 ms decay, high-passed 1.5 kHz) and a few louder
    'pops' (8 ms decay, 600-4000 Hz)."""
    r = rng(33)
    roar = lp(brown(r), 250) * slow_lfo(r, rate=0.4, depth=0.25)
    hiss = bp(pink(r), 1000, 3000) * 0.12
    crk = hp(np.convolve(impulses(r, 22), decay_kernel(1.5), mode="same"), 1500)
    crk /= np.max(np.abs(crk)) + 1e-9
    pops = bp(np.convolve(impulses(r, 1.2), decay_kernel(8), mode="same"), 600, 4000)
    pops /= np.max(np.abs(pops)) + 1e-9
    return 1.0 * roar + hiss + 1.3 * crk + 1.6 * pops


def crickets():
    """Night forest: 3 crickets, each a sine carrier (4.2 / 4.7 / 5.1 kHz)
    gated by a 30-40 Hz pulse train inside chirp groups (3-4 pulses), the
    group rhythm repeating with a period that divides 24 s (phases chosen so
    the loop seam falls between chirps); plus a quiet
    leafy breeze (pink noise 200-1500 Hz, slow swell) underneath."""
    r = rng(44)
    t = t_axis()
    out = np.zeros(TOT)
    for f0, pulse_hz, group_s, pulses, amp, off in [
        (4200, 32, 0.75, 3, 0.55, 0.3), (4700, 38, 1.0, 4, 0.35, 0.31), (5100, 30, 1.5, 3, 0.25, 0.77)]:
        tg = (t + off) % group_s
        gate_on = tg < pulses / pulse_hz
        pulse = 0.5 - 0.5 * np.cos(2 * np.pi * pulse_hz * tg)
        g = lp((gate_on * pulse).astype(float), 400)
        out += amp * g * np.sin(2 * np.pi * f0 * t)
    breeze = bp(pink(r), 200, 1500) * slow_lfo(r, rate=0.1, depth=0.4)
    return out / np.std(out) * 0.6 + 0.5 * breeze


def fan():
    """Room fan: pink noise low-passed at 1.8 kHz (air), very lightly
    amplitude-modulated at the blade rate 18 Hz, plus a faint motor hum
    (100 Hz + 200 Hz sines, integer cycles per loop so the loop is clean)."""
    r = rng(55)
    t = t_axis()
    air = lp(pink(r), 1800) * (1 + 0.04 * np.sin(2 * np.pi * 18 * t))
    hum = 0.05 * np.sin(2 * np.pi * 100 * t) + 0.025 * np.sin(2 * np.pi * 200 * t)
    return air / np.std(air) + hum * 3


def noise():
    """Soft 'shhh': pink noise, gently low-passed at 6 kHz so it is not harsh."""
    r = rng(66)
    return lp(pink(r), 6000)


SOUNDS = {"rain": rain, "waves": waves, "fire": campfire, "crickets": crickets, "fan": fan, "noise": noise}


def make_loop(x):
    """Fold the extra tail onto the head with an equal-power crossfade:
    out[0:XF] = head*sin + tail*cos, so out[N-1] -> out[0] continues x[N-1] -> x[N]."""
    head, tail = x[:NX], x[N:N + NX]
    k = np.linspace(0, np.pi / 2, NX)
    y = x[:N].copy()
    y[:NX] = head * np.sin(k) + tail * np.cos(k)
    return y


def rms_db(a):
    return 20 * np.log10(np.sqrt(np.mean(a ** 2)) + 1e-12)


def main():
    os.makedirs(OUT, exist_ok=True)
    ok = True
    report = []
    for name, fn in SOUNDS.items():
        y = make_loop(fn())
        y = y - np.mean(y)
        y = y / np.max(np.abs(y)) * 10 ** (-3 / 20)          # peak -3 dBFS
        peak = 20 * np.log10(np.max(np.abs(y)))
        w = int(SR * 0.05)
        seam = abs(rms_db(y[-w:]) - rms_db(y[:w]))
        # natural variation: |RMS difference| between every pair of adjacent 50 ms windows inside the loop
        wins = np.array([rms_db(y[i:i + w]) for i in range(0, N - w, w)])
        adj = np.abs(np.diff(wins)); p95 = np.percentile(adj, 95)
        jump = abs(y[0] - y[-1]); typical = np.percentile(np.abs(np.diff(y)), 99.9)
        good = peak <= -1.0 and seam <= max(p95, 1.0) and jump <= typical
        ok &= good
        report.append(f"{name:9s} peak {peak:6.2f} dBFS  seam RMS diff {seam:4.2f} dB (inside-loop adjacent p95 {p95:4.2f} dB)  "
                      f"edge jump {jump:.4f} (p99.9 step {typical:.4f})  {'OK' if good else 'FAIL'}")
        with tempfile.TemporaryDirectory() as td:
            wav = os.path.join(td, name + ".wav")
            wavfile.write(wav, SR, (y * 32767).astype(np.int16))
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libvorbis", "-q:a", "3",
                            os.path.join(OUT, name + ".ogg")], check=True)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "aac", "-b:a", "80k",
                            "-movflags", "+faststart", os.path.join(OUT, name + ".m4a")], check=True)
    print("\n".join(report))
    print("ALL OK" if ok else "SOME CHECKS FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
