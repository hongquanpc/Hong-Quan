"""Voice-over for an episode with ElevenLabs: one request per line -> build/voice.wav + build/timeline.json

  export ELEVENLABS_API_KEY=...                  # never commit the key
  python3 engine/tts.py episodes/<id>            # voice from episode.json "voice"
  python3 engine/tts.py episodes/<id> --fake     # silent placeholder lines (layout work, no API cost)
  python3 engine/tts.py --list-voices
"""
import argparse, hashlib, json, os, subprocess, sys, urllib.error, urllib.request, wave

SR = 44100
API = "https://api.elevenlabs.io/v1"
STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_VOICE = {"id": "DjY392W4TymVhSsT96jM", "model": "eleven_v4", "speed": 1.05, "style": 0.4, "stability": 0.38}
GAP, SCENE_GAP, LEAD, TAIL = 0.22, 0.6, 0.12, 1.6


def api(path, body=None):
    # Key from ELEVENLABS_API_KEY, or none: in the cloud environment a network secret injects xi-api-key.
    headers = {"Content-Type": "application/json"}
    if os.environ.get("ELEVENLABS_API_KEY"):
        headers["xi-api-key"] = os.environ["ELEVENLABS_API_KEY"]
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body else None, headers=headers)
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def synth(text, prev, nxt, v, cache, energy):
    tag = hashlib.sha1(json.dumps([text, v, energy], sort_keys=True).encode()).hexdigest()[:16]
    mp3 = os.path.join(cache, f"{tag}.mp3")
    if not os.path.exists(mp3):
        body = {"text": text, "model_id": v["model"], "language_code": "vi",
                "previous_text": prev, "next_text": nxt,
                "voice_settings": {"stability": v["stability"], "similarity_boost": 0.8, "style": energy,
                                   "use_speaker_boost": True, "speed": v["speed"]}}
        try:
            audio = api(f"/text-to-speech/{v['id']}?output_format=mp3_44100_128", body)
        except urllib.error.HTTPError as e:
            if e.code not in (400, 422):
                raise
            body.pop("previous_text"); body.pop("next_text")
            audio = api(f"/text-to-speech/{v['id']}?output_format=mp3_44100_128", body)
        open(mp3, "wb").write(audio)
    trim = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
    return subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-af", trim, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                          capture_output=True, check=True).stdout


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode", nargs="?")
    ap.add_argument("--fake", action="store_true")
    ap.add_argument("--list-voices", action="store_true")
    a = ap.parse_args()
    if a.list_voices:
        for v in json.loads(api("/voices"))["voices"]:
            lb = v.get("labels") or {}
            print(f'{v["voice_id"]}  {v["name"]:<34} {lb.get("language", ""):<3} {lb.get("gender", ""):<7} {lb.get("accent", "")}')
        return

    ep_dir = os.path.abspath(a.episode)
    ep = json.load(open(os.path.join(ep_dir, "episode.json")))
    v = {**DEFAULT_VOICE, **ep.get("voice", {})}
    build = os.path.join(ep_dir, "build")
    cache = os.path.join(STUDIO, ".tts_cache")
    os.makedirs(build, exist_ok=True); os.makedirs(cache, exist_ok=True)

    flat = [(si, sc["type"], ln["say"]) for si, sc in enumerate(ep["scenes"]) for ln in sc["lines"]]
    silence = lambda sec: bytes(int(sec * SR) * 2)
    out, lines, t = bytearray(silence(LEAD)), [], LEAD
    for i, (si, typ, text) in enumerate(flat):
        if i:
            gap = SCENE_GAP if si != flat[i - 1][0] else GAP
            out += silence(gap); t += gap
        if a.fake:
            pcm = silence(len(text.split()) * 0.3)
        else:
            prev = flat[i - 1][2] if i else None
            nxt = flat[i + 1][2] if i + 1 < len(flat) else None
            pcm = synth(text, prev, nxt, v, cache, 0.6 if typ == "cover" else v["style"])
        d = len(pcm) / 2 / SR
        lines.append([round(t, 3), round(t + d, 3)])
        out += pcm; t += d
        print(f"{i:2d} s{si} {d:5.2f}s  {text}")
    out += silence(TAIL); t += TAIL

    raw = os.path.join(build, "voice_raw.wav")
    with wave.open(raw, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(out))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", "loudnorm=I=-15:TP=-1.5:LRA=9", "-ar", str(SR),
                    os.path.join(build, "voice.wav")], check=True)
    os.remove(raw)
    json.dump({"lines": lines, "total": round(t, 3), "voice": v["id"], "model": v["model"], "fake": a.fake},
              open(os.path.join(build, "timeline.json"), "w"))
    print(f"build/voice.wav + timeline.json: {len(lines)} lines, {t:.1f}s")


if __name__ == "__main__":
    main()
