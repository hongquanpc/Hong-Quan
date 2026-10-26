"""Energetic music bed + SFX for an episode, aligned to build/timeline.json.
Hook (cover): riser + heartbeat -> impact + drop into a pumping 112 BPM groove.
Usage: python3 engine/music.py episodes/<id>   -> build/music.wav"""
import json, os, sys, wave
import numpy as np

SR = 44100
rng = np.random.default_rng(7)
ep_dir = os.path.abspath(sys.argv[1])
ep = json.load(open(os.path.join(ep_dir, "episode.json")))
tl = json.load(open(os.path.join(ep_dir, "build", "timeline.json")))

# scene start times, same rule as the player (first line start - 0.25s)
starts, k = [], 0
for sc in ep["scenes"]:
    starts.append(max(0.0, tl["lines"][k][0] - 0.25) if k else 0.0)
    k += len(sc["lines"])
DUR = tl["total"]
COVER = starts[1] if len(starts) > 1 else 1.0
BPM = 112
SCENES = starts[2:]                                  # whoosh at each later scene change
POPS = [s for s, _ in tl["lines"][len(ep["scenes"][0]["lines"]):]]   # tick at every story line

n = int(SR * DUR)
t = np.arange(n) / SR
music, sfx = np.zeros(n), np.zeros(n)

def note(m):
    return 440 * 2 ** ((m - 69) / 12)

def add(buf, sig, start):
    i = int(start * SR)
    j = min(n, i + len(sig))
    if 0 <= i < n:
        buf[i:j] += sig[: j - i]

def env(length, a=0.005, r=0.2):
    k = np.arange(int(length * SR)) / SR
    return k, np.minimum(1, k / a) * np.exp(-k / r)

def saw(f, k, harmonics=8):
    return sum(np.sin(2 * np.pi * f * h * k) / h for h in range(1, harmonics + 1)) * 0.6

def kick(k, f0=130, f1=48, drop=30):
    return np.sin(2 * np.pi * np.cumsum(f0 * np.exp(-k * drop) + f1) / SR)

beat = 60 / BPM
bar = 4 * beat
start = COVER                                  # the drop
chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]   # Am F C G

# ---- hook: riser + heartbeat during the cover ----
k = np.arange(int(COVER * SR)) / SR
sweep = np.cumsum(200 + 1800 * (k / COVER) ** 2) / SR
add(music, 0.35 * (rng.standard_normal(len(k)) * 0.5 + np.sin(2 * np.pi * sweep)) * (k / COVER) ** 2, 0)
for hb in np.arange(0.05, COVER - 0.3, 0.55):
    for off, amp in ((0, 0.9), (0.16, 0.6)):
        kk, e = env(0.3, 0.002, 0.09)
        add(music, amp * kick(kk, 70, 42, 20) * e, hb + off)

# ---- impact at the drop ----
kk, e = env(1.6, 0.001, 0.45)
add(sfx, kick(kk, 90, 32, 7) * e, start)
crash = rng.standard_normal(int(1.8 * SR)) * np.exp(-np.arange(int(1.8 * SR)) / SR / 0.5)
add(sfx, 0.25 * np.diff(crash, prepend=0), start)

# ---- main groove ----
for b in range(int((DUR - start) / bar) + 1):
    t0 = start + b * bar
    ch = chords[(b // 2) % 4]
    for q in range(4):
        tb = t0 + q * beat
        kk, e = env(0.32, 0.001, 0.09)
        add(music, 0.95 * kick(kk) * e, tb)                      # four-on-the-floor kick
        if q in (1, 3):                                          # clap on 2 and 4
            kc, ec = env(0.22, 0.001, 0.06)
            clap = np.diff(rng.standard_normal(len(kc) + 1)) * ec
            add(music, 0.32 * clap, tb); add(music, 0.18 * clap, tb + 0.012)
        kh, eh = env(0.12, 0.001, 0.035)                         # open hat offbeat
        add(music, 0.10 * np.diff(rng.standard_normal(len(kh) + 1)) * eh, tb + beat / 2)
        for sxt in (1, 3):                                       # closed hats
            kh, eh = env(0.04, 0.001, 0.01)
            add(music, 0.05 * np.diff(rng.standard_normal(len(kh) + 1)) * eh, tb + sxt * beat / 4)
        kb = np.arange(int(beat * SR)) / SR                      # sidechain-pumped bass + pad
        pump = np.minimum(1, (kb / (beat * 0.55)) ** 1.5)
        add(music, 0.28 * saw(note(ch[0] - 24), kb, 5) * pump * np.exp(-kb * 1.2), tb)
        add(music, 0.05 * sum(saw(note(m), kb, 4) for m in ch) * pump, tb)
    for s8, idx in enumerate([0, 2, 1, 2, 0, 1, 2, 1]):           # pluck riff on 8ths
        kp, ep = env(0.25, 0.002, 0.08)
        add(music, 0.07 * saw(note(ch[idx] + 12), kp, 6) * ep, t0 + s8 * beat / 2)

# ---- SFX ----
for s in SCENES:
    L = 0.55
    k = np.arange(int(L * SR)) / SR
    noise = np.convolve(rng.standard_normal(len(k)), np.ones(10) / 10, "same")
    add(sfx, 0.45 * noise * np.sin(np.pi * k / L) ** 2, max(0, s - 0.35))
for p in POPS:
    k, e = env(0.12, 0.001, 0.03)
    add(sfx, 0.22 * np.sin(2 * np.pi * np.cumsum(1000 * np.exp(-k * 18) + 520) / SR) * e, p)

# ---- master ----
mix = (np.tanh(music * 0.9) * 0.75 + sfx) * np.minimum(1, (DUR - t) / 2.5)
mix = np.tanh(mix * 1.1)
mix = mix / np.max(np.abs(mix)) * 0.9
pcm = (mix * 32767).astype(np.int16)
with wave.open(os.path.join(ep_dir, "build", "music.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(np.stack([pcm, pcm], axis=1).tobytes())
