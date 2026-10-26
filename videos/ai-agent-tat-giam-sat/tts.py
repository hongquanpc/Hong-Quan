"""Voice-over with ElevenLabs, one request per caption line, then timeline.js for index.html.

  export ELEVENLABS_API_KEY=...           # never commit the key
  python3 tts.py --list-voices            # show voices on the account
  python3 tts.py --voice <voice_id>       # writes voice.wav + timeline.js
  python3 tts.py --fake                   # offline: silent placeholder lines, to test timing

Lines are 1:1 with CAPTIONS in index.html (spoken text may differ from the on-screen text).
"""
import argparse, hashlib, json, os, subprocess, sys, urllib.request, wave

LINES = [
    "AI agent của OpenAI vừa tự tắt hệ thống giám sát,",
    "và một agent còn nói dối về chuyện đó!",
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
    "Theo dõi AI Today chấm V N để cập nhật AI mỗi ngày nhé!",
]
SCENE_STARTS = {2, 4, 7, 11, 13, 15, 19}   # line indexes that open a new scene
GAP, SCENE_GAP, LEAD, TAIL = 0.12, 0.45, 0.25, 1.6
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


def synth(i, voice, model, cache):
    text = LINES[i]
    tag = hashlib.sha1(f"{voice}|{model}|{text}".encode()).hexdigest()[:12]
    mp3 = os.path.join(cache, f"{i:02d}_{tag}.mp3")
    if not os.path.exists(mp3):
        audio = api(f"/text-to-speech/{voice}?output_format=mp3_44100_128", {
            "text": text, "model_id": model,
            "previous_text": LINES[i - 1] if i else None,
            "next_text": LINES[i + 1] if i + 1 < len(LINES) else None,
            # lively social-media read: lower stability, some style exaggeration
            "voice_settings": {"stability": 0.38, "similarity_boost": 0.8, "style": 0.4, "use_speaker_boost": True, "speed": 1.08},
        })
        open(mp3, "wb").write(audio)
    # decode to mono PCM, trimming leading/trailing silence
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-af",
                          "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",
                          "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return pcm


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice")
    ap.add_argument("--model", default="eleven_multilingual_v2")
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
    out, lines, t = bytearray(), [], LEAD
    out += bytes(int(LEAD * SR) * 2)
    for i in range(len(LINES)):
        if i:
            gap = SCENE_GAP if i in SCENE_STARTS else GAP
            out += bytes(int(gap * SR) * 2); t += gap
        pcm = bytes(int(len(LINES[i].split()) * 0.3 * SR) * 2) if a.fake else synth(i, a.voice, a.model, cache)
        d = len(pcm) / 2 / SR
        lines.append([round(t, 3), round(t + d, 3)])
        out += pcm; t += d
        print(f"{i:2d} {d:5.2f}s  {LINES[i]}")
    out += bytes(int(TAIL * SR) * 2); t += TAIL
    # the last caption stays up through the tail
    lines[-1][1] = round(t, 3)

    with wave.open("voice.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(out))
    with open("timeline.js", "w") as f:
        f.write("window.VOICE_TIMELINE = " + json.dumps({"lines": lines, "total": round(t, 3)}) + ";\n")
    print(f"voice.wav + timeline.js written, total {t:.1f}s")


if __name__ == "__main__":
    main()
