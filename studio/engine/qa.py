"""Final check before publishing. Writes episodes/<id>/out/QA_REPORT.md and exits 1 on any FAIL.

Checks:
  1. Nguồn & sự thật   sources present and dated; every fact in "facts" ticked by a human
  2. Chữ trên hình     Vietnamese without diacritics, brand spelling, caption length, *highlight* balance
  3. Giọng đọc         ElevenLabs speech-to-text: language is Vietnamese and every line is heard as written
  4. Bố cục            off-screen, overflowing, host covering content, captions colliding (from render.js --qa)
  5. File xuất bản     1080x1920, 30 fps, length, loudness and true peak
Usage: python3 engine/qa.py episodes/<id> [--skip-stt]
"""
import datetime, difflib, json, os, re, subprocess, sys, unicodedata, urllib.request, uuid

ep_dir = os.path.abspath(sys.argv[1])
SKIP_STT = "--skip-stt" in sys.argv
ENGINE = os.path.dirname(os.path.abspath(__file__))
ep = json.load(open(os.path.join(ep_dir, "episode.json")))
build, out = os.path.join(ep_dir, "build"), os.path.join(ep_dir, "out")
os.makedirs(out, exist_ok=True)
video = os.path.join(out, f"{ep['id']}.mp4")
tl = json.load(open(os.path.join(build, "timeline.json")))
lines = [ln for sc in ep["scenes"] for ln in sc["lines"]]

sections = []   # (title, status, [messages])
def section(title, fails, warns, notes=()):
    status = "FAIL" if fails else ("WARN" if warns else "PASS")
    sections.append((title, status, [f"❌ {m}" for m in fails] + [f"⚠️ {m}" for m in warns] + [f"• {m}" for m in notes]))

# ---------------------------------------------------------------- 1. sources & facts
fails, warns, notes = [], [], []
today = datetime.date.fromisoformat(ep.get("date", str(datetime.date.today())))
for i, s in enumerate(ep.get("sources", [])):
    if not s.get("url") or not s.get("date"):
        fails.append(f"nguồn #{i} thiếu url hoặc ngày: {s}")
        continue
    age = (today - datetime.date.fromisoformat(s["date"][:10])).days
    if age > 30:
        warns.append(f"nguồn #{i} đã {age} ngày tuổi: {s.get('title')}")
    notes.append(f"[{s.get('name') or s.get('title')}]({s['url']}) — {s['date']}")
for f in ep.get("facts", []):
    if not f.get("checked"):
        fails.append(f"CHƯA DUYỆT sự thật: “{f['claim']}” → kiểm tra tại {f.get('check', 'nguồn')} rồi đặt \"checked\": true")
if not ep.get("facts"):
    warns.append("episode không liệt kê \"facts\" (con số, tên, ngày tháng cần người kiểm tra)")
section("1. Nguồn & sự thật", fails, warns, notes)

# ---------------------------------------------------------------- 2. on-screen text
fails, warns = [], []
UNACCENTED = set("khong duoc nguoi cua nhung viec trong mot nay voi cac nhieu ban minh thi biet lam chung toi dung nhu ve sau truoc moi ngay "
                 "hay tot xem them cho phep giup tao dang dieu nhanh hon thay de dang".split())
BRANDS = {"openai": "OpenAI", "chatgpt": "ChatGPT", "github": "GitHub", "youtube": "YouTube", "tiktok": "TikTok", "anthropic": "Anthropic",
          "claude": "Claude", "gemini": "Gemini", "deepseek": "DeepSeek", "huggingface": "Hugging Face", "nvidia": "NVIDIA",
          "javascript": "JavaScript", "typescript": "TypeScript", "macos": "macOS", "iphone": "iPhone", "linkedin": "LinkedIn"}

def texts(o, where):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ("say", "logo", "logos", "icon", "type", "slot", "pose", "act", "from", "repo", "color", "langColor", "url"):
                continue
            yield from texts(v, f"{where}.{k}")
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from texts(v, f"{where}[{i}]")
    elif isinstance(o, str):
        yield where, o

for si, sc in enumerate(ep["scenes"]):
    for where, s in texts(sc, f"scene{si}"):
        if where.endswith(".code") or ".code[" in where:
            continue
        words = re.findall(r"[a-zA-ZÀ-ỹ]+", s)
        bad = [w for w in words if w.lower() in UNACCENTED]
        if len(bad) >= 1 and not any(ord(c) > 127 for c in s):
            fails.append(f"{where}: có vẻ thiếu dấu tiếng Việt: “{s}”")
        for w in words:
            canon = BRANDS.get(w.lower())
            if canon and " " not in canon and w != canon and w.upper() != w:
                fails.append(f"{where}: viết sai tên thương hiệu “{w}” → “{canon}”")
        if re.search(r"\b(\w+) \1\b", s, re.I):
            warns.append(f"{where}: lặp từ: “{s}”")
        if s.count("*") % 2:
            fails.append(f"{where}: dấu *highlight* không cân: “{s}”")
    for j, ln in enumerate(sc["lines"]):
        cap = (ln.get("cap") or ln["say"]).replace("*", "")
        if sc["type"] != "cover" and len(cap) > 72:
            warns.append(f"scene{si} line{j}: phụ đề dài {len(cap)} ký tự (nên ≤ 72): “{cap}”")
section("2. Chữ trên hình", fails, warns)

# ---------------------------------------------------------------- 3. voice (speech-to-text)
# spoken forms that STT writes differently but are correct
SPOKEN = [(r"ai\s*today\s*(?:chấm|\.)\s*v\s*\.?\s*n\b", "aitodayvn"), (r"\bchấm\s+com\b", "com")]

def norm(s):
    s = unicodedata.normalize("NFC", s.lower())
    for pat, rep_ in SPOKEN:
        s = re.sub(pat, rep_, s)
    return re.findall(r"[0-9a-zà-ỹđ]+", s)

fails, warns, notes = [], [], []
if tl.get("fake"):
    fails.append("giọng đọc đang là bản giả (--fake) — chạy tts.py thật trước khi xuất bản")
elif SKIP_STT:
    warns.append("bỏ qua kiểm tra giọng đọc (--skip-stt)")
else:
    key = os.environ.get("ELEVENLABS_API_KEY")   # empty is fine when a network secret injects xi-api-key
    auth = {"xi-api-key": key} if key else {}
    if True:
        mp3 = os.path.join(build, "voice_qa.mp3")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(build, "voice.wav"), "-ac", "1", "-ar", "16000", "-b:a", "48k", mp3], check=True)
        bnd = uuid.uuid4().hex
        body = (f"--{bnd}\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nscribe_v1\r\n"
                f"--{bnd}\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\nvie\r\n"
                f"--{bnd}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"v.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n").encode() \
               + open(mp3, "rb").read() + f"\r\n--{bnd}--\r\n".encode()
        req = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=body,
                                     headers={**auth, "Content-Type": f"multipart/form-data; boundary={bnd}"})
        stt = json.loads(urllib.request.urlopen(req, timeout=300).read())
        json.dump(stt, open(os.path.join(build, "stt.json"), "w"), ensure_ascii=False)
        # language: transcribe once more without forcing, on the first 15 s, to see what it really hears
        words = [w for w in stt.get("words", []) if w.get("type") == "word"]
        for i, (s, e) in enumerate(tl["lines"]):
            heard = " ".join(w["text"] for w in words if w["start"] >= s - 0.2 and w["end"] <= e + 0.3)
            exp, got = norm(lines[i].get("hear") or lines[i]["say"]), norm(heard)
            # word match, or character match ignoring spaces ("zo status" vs "zostatus", "zocloud chấm i o" vs "zocloud.io")
            r = max(difflib.SequenceMatcher(None, exp, got).ratio(),
                    difflib.SequenceMatcher(None, "".join(exp), "".join(got)).ratio())
            msg = f"câu {i} ({r:.0%}): viết “{lines[i]['say']}” — nghe “{heard}”"
            if r < 0.75:
                fails.append(msg)
            elif r < 0.9:
                warns.append(msg)
        notes.append(f"STT: {len(words)} từ, ngôn ngữ ép = vie")
        # language sanity: unforced detection on a short clip
        clip = os.path.join(build, "voice_lang.mp3")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-t", "15", clip], check=True)
        body2 = (f"--{bnd}\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nscribe_v1\r\n"
                 f"--{bnd}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"c.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n").encode() \
                + open(clip, "rb").read() + f"\r\n--{bnd}--\r\n".encode()
        req2 = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=body2,
                                      headers={**auth, "Content-Type": f"multipart/form-data; boundary={bnd}"})
        lang = json.loads(urllib.request.urlopen(req2, timeout=120).read())
        if lang.get("language_code") != "vie" or lang.get("language_probability", 0) < 0.9:
            fails.append(f"giọng đọc không được nhận là tiếng Việt: {lang.get('language_code')} ({lang.get('language_probability', 0):.0%})")
        else:
            notes.append(f"ngôn ngữ nhận diện: tiếng Việt ({lang['language_probability']:.1%})")
section("3. Giọng đọc", fails, warns, notes)

# ---------------------------------------------------------------- 4. layout
issues = json.load(open(os.path.join(build, "layout.json"))) if os.path.exists(os.path.join(build, "layout.json")) else ["chưa chạy render.js --qa"]
section("4. Bố cục khung hình", issues, [], ["xem ảnh tổng hợp: out/qa_contact.jpg"])

# ---------------------------------------------------------------- 5. media file
fails, warns, notes = [], [], []
if not os.path.exists(video):
    fails.append(f"chưa có file video {video}")
else:
    pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration",
                                    "-of", "json", video], capture_output=True, text=True).stdout)
    v = next(s for s in pr["streams"] if s["codec_type"] == "video")
    dur = float(pr["format"]["duration"])
    if (v["width"], v["height"]) != (1080, 1920): fails.append(f"kích thước {v['width']}x{v['height']} (cần 1080x1920)")
    if v["r_frame_rate"] != "30/1": fails.append(f"fps {v['r_frame_rate']}")
    if not any(s["codec_type"] == "audio" for s in pr["streams"]): fails.append("không có âm thanh")
    if dur > 90: fails.append(f"dài {dur:.0f}s (tối đa 90s)")
    elif dur > 65: warns.append(f"dài {dur:.0f}s — video ≤ 60s giữ chân người xem tốt hơn")
    loud = subprocess.run(["ffmpeg", "-i", video, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", loud)[-1]); TP = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", loud)[-1])
    if not -16 <= I <= -11: warns.append(f"độ to {I} LUFS (nên -14 ±2)")
    if TP > -0.5: fails.append(f"đỉnh âm {TP} dBFS (có thể rè, cần ≤ -1)")
    notes.append(f"{dur:.1f}s · {I} LUFS · đỉnh {TP} dBFS")
section("5. File xuất bản", fails, warns, notes)

# ---------------------------------------------------------------- report
frames = sorted(f for f in os.listdir(os.path.join(build, "qa_frames"))) if os.path.isdir(os.path.join(build, "qa_frames")) else []
if frames:
    cols = 6
    inputs = sum((["-i", os.path.join(build, "qa_frames", f)] for f in frames), [])
    pad = (-len(frames)) % cols
    graph = "".join(f"[{i}:v]scale=270:-1[f{i}];" for i in range(len(frames)))
    graph += "".join(f"color=c=0xdddddd:s=270x480:d=1[p{i}];" for i in range(pad))
    labels = [f"[f{i}]" for i in range(len(frames))] + [f"[p{i}]" for i in range(pad)]
    rows = [labels[r:r + cols] for r in range(0, len(labels), cols)]
    graph += "".join("".join(r) + f"hstack={cols}[r{i}];" for i, r in enumerate(rows))
    graph += "".join(f"[r{i}]" for i in range(len(rows))) + (f"vstack={len(rows)}" if len(rows) > 1 else "null")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", graph, "-frames:v", "1", os.path.join(build, "qa_contact.jpg")], check=True)
    os.replace(os.path.join(build, "qa_contact.jpg"), os.path.join(out, "qa_contact.jpg"))

ok = all(s[1] != "FAIL" for s in sections)
md = [f"# QA — {ep['title']}", "", f"**Kết quả: {'✅ ĐẠT — sẵn sàng xuất bản' if ok else '❌ CHƯA ĐẠT — không xuất bản'}**", ""]
for title, status, msgs in sections:
    md += [f"## {title}: {status}", *msgs, ""]
md += ["## Người duyệt cuối (bắt buộc, làm trên điện thoại)",
       "- [ ] Xem hết video với âm thanh: phát âm đúng, không vấp, nhạc không lấn giọng",
       "- [ ] Thumbnail (frame đầu) rõ chữ, đúng logo, không sai chính tả",
       "- [ ] Mọi con số/tên/ngày trên hình khớp nguồn",
       "- [ ] Logo đúng thương hiệu, không méo/sai màu",
       "- [ ] Caption bài đăng + hashtag + link nguồn đã soạn", ""]
open(os.path.join(out, "QA_REPORT.md"), "w").write("\n".join(md))
print("\n".join(md))
sys.exit(0 if ok else 1)
