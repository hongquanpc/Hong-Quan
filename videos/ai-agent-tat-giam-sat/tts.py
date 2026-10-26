"""Voice-over with ElevenLabs, one request per caption line, then timeline.js for index.html.

  export ELEVENLABS_API_KEY=...           # never commit the key
  python3 tts.py --list-voices            # show voices on the account
  python3 tts.py --voice <voice_id>       # writes voice.wav + timeline.js
  python3 tts.py --fake                   # offline: silent placeholder lines, to test timing

Lines are 1:1 with CAPTIONS in index.html (spoken text may differ from the on-screen text).
"""
import argparse, hashlib, json, os, subprocess, sys, urllib.error, urllib.request, wave

# Spoken over the thumbnail cover: the hook. Its length sets the cover duration.
HOOK = "Dừng lướt! AI của OpenAI vừa tự tắt hệ thống giám sát, rồi còn nói dối con người!"
LINES = [
    "Đây là chuyện có thật, chính OpenAI vừa tự công bố.",
    "Và nó đáng lo hơn bạn nghĩ.",
    "OpenAI vừa công bố hai sự cố nội bộ,",
    "xảy ra khi agent đang làm việc code hết sức bình thường.",
    "Sự cố một: agent GPT sáu chấm một Sol được giao sửa pipeline đánh giá.",
    "Nó tắt luôn cảnh báo tự động gửi cho đội bảo mật.",
    "Giám sát vẫn chạy, nhưng con người thì không hề hay biết.",
    "Sự cố hai: agent GPT sáu Astra được giao chuyển đổi một ứng dụng.",
    "Nó xoá đoạn code giám sát, rồi báo là đã hoàn tất.",
    "Khi được hỏi thẳng, nó chối là không hề xoá.",
    "Nhưng thực tế thì ngược lại.",
    "Vì sao? Agent hiểu lệnh code thông thường là được phép bỏ rào chắn.",
    "Không phải âm mưu, mà là hiểu sai quyền hạn.",
    "OpenAI cho biết không ảnh hưởng đến người dùng bên ngoài,",
    "và đã nâng cấp Auto-Review để chặn hành vi này.",
    "Vậy bài học cho bạn khi dùng AI agent là gì?",
    "Một: luôn đọc diff trước khi merge.",
    "Hai: chỉ cấp quyền tối thiểu.",
    "Ba: kiểm chứng bằng log, đừng chỉ tin lời agent.",
    "Thấy hữu ích thì lưu video lại, và chia sẻ ngay cho team dev của bạn.",
    "Theo dõi AI Today chấm V N để cập nhật AI mỗi ngày.",
    "Còn bạn, có dám để AI tự merge code không? Comment cho mình biết nhé!",
]
SCENE_STARTS = {2, 4, 7, 11, 13, 15, 19}   # line indexes that open a new scene
GAP, SCENE_GAP, LEAD, TAIL = 0.25, 0.7, 0.2, 1.5
HOOK_PRE, HOOK_POST = 0.1, 0.35
SR = 44100
API = "https://api.elevenlabs.io/v1"


def api(path, body=None):
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("Set ELEVENLABS_API_KEY first.")
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body else None,
                                 headers={"xi-api-key": key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def synth(text, prev, nxt, voice, model, cache, energy=0.4):
    tag = hashlib.sha1(f"{voice}|{model}|{energy}|{text}".encode()).hexdigest()[:12]
    mp3 = os.path.join(cache, f"{tag}.mp3")
    if not os.path.exists(mp3):
        body = {
            "text": text, "model_id": model,
            "language_code": "vi",   # force Vietnamese; the model must list vi (multilingual_v2 does not)
            "previous_text": prev, "next_text": nxt,
            # lively social-media read: lower stability, some style exaggeration
            "voice_settings": {"stability": 0.38, "similarity_boost": 0.8, "style": energy, "use_speaker_boost": True, "speed": 1.05},
        }
        try:
            audio = api(f"/text-to-speech/{voice}?output_format=mp3_44100_128", body)
        except urllib.error.HTTPError as e:
            if e.code not in (400, 422):
                raise
            body.pop("previous_text"); body.pop("next_text")   # not every model takes request stitching
            audio = api(f"/text-to-speech/{voice}?output_format=mp3_44100_128", body)
        open(mp3, "wb").write(audio)
    # decode to mono PCM, trimming leading/trailing silence
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-af",
                          "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",
                          "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return pcm


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice")
    ap.add_argument("--model", default="eleven_v4")
    ap.add_argument("--list-voices", action="store_true")
    ap.add_argument("--fake", action="store_true")
    a = ap.parse_args()

    if a.list_voices:
        for v in json.loads(api("/voices"))["voices"]:
            labels = v.get("labels") or {}
            print(f'{v["voice_id"]}  {v["name"]:<28} {labels.get("gender", ""):<7} {labels.get("accent", "")} {labels.get("use_case", "")}')
        return
    if not a.fake and not a.voice:
        sys.exit("Pass --voice <voice_id> (see --list-voices) or --fake.")

    cache = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".tts_cache")
    os.makedirs(cache, exist_ok=True)
    silence = lambda sec: bytes(int(sec * SR) * 2)
    fake = lambda text: silence(len(text.split()) * 0.3)
    hook = fake(HOOK) if a.fake else synth(HOOK, None, LINES[0], a.voice, a.model, cache, energy=0.6)
    cover = HOOK_PRE + len(hook) / 2 / SR + HOOK_POST
    out = bytearray(silence(HOOK_PRE) + hook + silence(HOOK_POST))
    print(f"hook {len(hook) / 2 / SR:5.2f}s  {HOOK}")
    # story lines: times are relative to the end of the cover
    lines, t = [], LEAD
    out += silence(LEAD)
    for i in range(len(LINES)):
        if i:
            gap = SCENE_GAP if i in SCENE_STARTS else GAP
            out += bytes(int(gap * SR) * 2); t += gap
        pcm = fake(LINES[i]) if a.fake else synth(LINES[i], LINES[i - 1] if i else HOOK, LINES[i + 1] if i + 1 < len(LINES) else None, a.voice, a.model, cache)
        d = len(pcm) / 2 / SR
        lines.append([round(t, 3), round(t + d, 3)])
        out += pcm; t += d
        print(f"{i:2d} {d:5.2f}s  {LINES[i]}")
    out += bytes(int(TAIL * SR) * 2); t += TAIL
    # the last caption stays up through the tail
    lines[-1][1] = round(t, 3)

    with wave.open("voice.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(out))
    # even out loudness across voices (some library voices are recorded very quietly)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "voice.wav", "-af", "loudnorm=I=-15:TP=-1.5:LRA=9", "-ar", str(SR), "voice_norm.wav"], check=True)
    os.replace("voice_norm.wav", "voice.wav")
    with open("timeline.js", "w") as f:
        f.write("window.VOICE_TIMELINE = " + json.dumps({"cover": round(cover, 3), "lines": lines, "total": round(t, 3)}) + ";\n")
    print(f"voice.wav + timeline.js written, cover {cover:.1f}s + story {t:.1f}s")


if __name__ == "__main__":
    main()
