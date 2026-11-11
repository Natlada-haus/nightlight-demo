#!/usr/bin/env python3
"""Decode every loop (.ogg + .m4a) with ffmpeg, apply the same trim as Snd.exactLoop() in js/app.js
(skip leading priming silence, keep exactly 24 s), then check the wrap point: the jump from the last
sample to the first must be no larger than the 99.9th percentile sample step inside the loop.
Usage: python3 tools/check_sound_seams.py"""
import subprocess, numpy as np, glob, os
SND = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'sounds')
for f in sorted(glob.glob(os.path.join(SND, '*.ogg')) + glob.glob(os.path.join(SND, '*.m4a'))):
    x=np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',f,'-f','f32le','-ac','1','-ar','22050','-'],capture_output=True).stdout,np.float32)
    off=0
    while off<4096 and abs(x[off])<1e-4: off+=1
    if off>=4096: off=0
    y=x[off:off+529200]
    st=np.abs(np.diff(y)); jump=abs(float(y[0])-float(y[-1]))
    w=lambda a: np.sqrt(np.mean(a**2))
    print(f"{f.split('/')[-1]:14s} off={off} wrapjump={jump:.4f} p99={np.percentile(st,99):.4f} p99.9={np.percentile(st,99.9):.4f} rms_tail10ms={w(y[-220:]):.4f} rms_head10ms={w(y[:220]):.4f} {'OK' if jump<=np.percentile(st,99.9) else 'CHECK'}")
