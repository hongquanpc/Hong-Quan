"""Synthesize a soft background bed + transition SFX matched to the video timeline.
Usage: python3 music.py out.wav"""
import json, os, re, sys, wave
import numpy as np

SR = 44100
STORY = 66.5          # story timeline length in index.html
COVER = 1.0           # thumbnail cover held at the start (matches index.html)
HERE = os.path.dirname(os.path.abspath(__file__))

# Story time -> output time, using the same voice warp as index.html.
caps = [tuple(map(float, m)) for m in re.findall(r"\[\s*([\d.]+),\s*([\d.]+),\s*\"", open(os.path.join(HERE, "index.html")).read())]
knots = [(0.0, 0.0)]
tl = os.path.join(HERE, "timeline.js")
if os.path.exists(tl):
    v = json.loads(open(tl).read().split("=", 1)[1].rstrip().rstrip(";"))
    for (s0, e0), (s1, e1) in zip(caps, v["lines"]):
        knots += [(s0, s1), (e0, e1)]
    knots.append((STORY, v["total"]))
else:
    knots.append((STORY, STORY))
ks, kv = zip(*knots)

def at(story_t):
    return COVER + float(np.interp(story_t, ks, kv))

DUR = at(STORY)
BPM = 96
SCENES = [at(x) for x in [0, 6, 12, 22, 34, 41, 47, 61]]   # whoosh at each scene start
POPS_STORY = [0.35, 2.6, 7.4, 13.5, 16.2, 19.4, 24.8, 26.6, 28.6, 29.3, 31.7, 35.6, 38.3, 44.1, 46, 50, 53.5, 57, 62.6]
POPS = [at(x) for x in POPS_STORY]

n = int(SR * DUR)
t = np.arange(n) / SR
mix = np.zeros(n)

def note(f):  # midi -> Hz
    return 440 * 2 ** ((f - 69) / 12)

def add(sig, start):
    i = int(start * SR)
    j = min(n, i + len(sig))
    if i < n:
        mix[i:j] += sig[: j - i]

def env(length, a=0.01, r=0.3):
    k = np.arange(int(length * SR)) / SR
    e = np.minimum(1, k / a) * np.exp(-k / r)
    return k, e

beat = 60 / BPM
bar = 4 * beat
# Am - F - C - G, two bars each
chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
for b in range(int(DUR / bar) + 1):
    ch = chords[(b // 2) % 4]
    L = bar * 1.05
    k = np.arange(int(L * SR)) / SR
    e = np.minimum(1, k / 0.6) * np.minimum(1, (L - k) / 0.5)
    pad = sum(np.sin(2 * np.pi * note(m) * k) + 0.3 * np.sin(2 * np.pi * note(m) * 2.003 * k) for m in ch)
    add(0.045 * pad * e, b * bar)
    # bass
    kb, eb = env(beat * 1.8, 0.01, 0.5)
    add(0.12 * np.sin(2 * np.pi * note(ch[0] - 12) * kb) * eb, b * bar)
    add(0.10 * np.sin(2 * np.pi * note(ch[0] - 12) * kb) * eb, b * bar + 2 * beat)
    # pluck arpeggio on 8ths
    for s in range(8):
        m = ch[[0, 1, 2, 1, 0, 2, 1, 2][s]] + 12
        kp, ep = env(0.35, 0.003, 0.12)
        add(0.035 * np.sin(2 * np.pi * note(m) * kp) * ep, b * bar + s * beat / 2)

# soft kick + hat
rng = np.random.default_rng(1)
for i in range(int(DUR / beat)):
    kk, ek = env(0.25, 0.002, 0.07)
    f = 110 * np.exp(-kk * 25) + 45
    add(0.22 * np.sin(2 * np.pi * np.cumsum(f) / SR) * ek, i * beat)
    kh, eh = env(0.05, 0.001, 0.015)
    hat = np.diff(rng.standard_normal(len(kh) + 1))
    add(0.025 * hat * eh, i * beat + beat / 2)

# SFX
for s in SCENES:
    k = np.arange(int(0.6 * SR)) / SR
    noise = rng.standard_normal(len(k))
    noise = np.convolve(noise, np.ones(12) / 12, 'same')
    e = np.sin(np.pi * k / 0.6) ** 2
    add(0.25 * noise * e, max(0, s - 0.3))
for p in POPS:
    k, e = env(0.12, 0.001, 0.03)
    f = 900 * np.exp(-k * 18) + 500
    add(0.18 * np.sin(2 * np.pi * np.cumsum(f) / SR) * e, p)

# impact hit when the cover cuts to the story
k, e = env(0.9, 0.002, 0.25)
add(0.5 * np.sin(2 * np.pi * np.cumsum(60 * np.exp(-k * 6) + 38) / SR) * e, COVER)

# fade in/out, normalize
mix *= np.minimum(1, t / 0.05) * np.minimum(1, (DUR - t) / 2.0)
mix = np.tanh(mix * 1.2)
mix = mix / np.max(np.abs(mix)) * 0.8
pcm = (mix * 32767).astype(np.int16)
stereo = np.stack([pcm, pcm], axis=1)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(stereo.tobytes())
