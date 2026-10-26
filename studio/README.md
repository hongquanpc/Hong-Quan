# aitoday.vn studio — quy trình video AI hằng ngày

Mỗi tập là **một file `episode.json`**. Engine tự dựng hình (HTML/CSS → MP4 1080×1920), lồng tiếng ElevenLabs,
nhạc nền, thumbnail, rồi chạy **cổng kiểm tra cuối** — không đạt thì không xuất bản.

```
studio/
  build.sh                 chạy toàn bộ quy trình cho 1 tập
  engine/                  player.html + scenes.js (thư viện cảnh), tts.py, music.py, render.js, prepare.js, qa.py
  assets/host/*.png        nhân vật dẫn chuyện (tư thế: welcome thumbs point wave present think celebrate)
  assets/logos/<slug>.svg  logo riêng (ưu tiên hơn thư viện simple-icons)
  playbook/                research.md · hooks-and-scripts.md · prompts.md
  episodes/<ngày-slug>/    episode.json → out/<id>.mp4, out/thumbnail.png, out/QA_REPORT.md, out/qa_contact.jpg
```

## Quy trình 6 bước (≈ 30–45 phút/tập)

| # | Bước | Ai làm | Kết quả |
|---|---|---|---|
| 1 | **Research** — quét tin, chọn 1 chủ đề theo 5 trụ cột | Claude (`playbook/research.md`, prompt #1) | 3 ứng viên + nguồn |
| 2 | **Kiểm chứng** — mọi con số/tên/ngày | Claude (prompt #2) + **người** | `sources`, `facts` |
| 3 | **Kịch bản** → `episode.json` | Claude (prompt #3, #4) | kịch bản 45–60s |
| 4 | **Dựng nháp** `FAKE=1 ./build.sh episodes/<id>` | máy | xem `qa_contact.jpg`, sửa bố cục |
| 5 | **Dựng thật** `./build.sh episodes/<id>` | máy | video + thumbnail + QA |
| 6 | **Duyệt cuối & xuất bản** — QA ✅ + checklist người duyệt + đặt `"checked": true` cho từng fact | **người** | đăng TikTok/Reels/Shorts |

## Cổng kiểm tra cuối (`engine/qa.py`) — không đạt = không đăng

1. **Nguồn & sự thật** — có nguồn kèm ngày; mọi `facts` phải được người duyệt (`"checked": true`).
2. **Chữ trên hình** — phát hiện tiếng Việt thiếu dấu, sai tên thương hiệu (Github → GitHub…), lặp từ, phụ đề quá dài.
3. **Giọng đọc** — ElevenLabs speech-to-text nghe lại toàn bộ: phải nhận là **tiếng Việt ≥ 90%**, mỗi câu khớp kịch bản ≥ 75%
   (dưới 90% thì cảnh báo). Cách đọc đúng nhưng viết khác → thêm `"hear"` cho câu đó.
4. **Bố cục** — chữ ra ngoài khung, tràn chữ, nhân vật che nội dung, phụ đề đè hình, tiêu đề thumbnail xuống dòng.
5. **File** — 1080×1920, 30fps, ≤ 90s (khuyên ≤ 60s), độ to −14 LUFS ±2, đỉnh ≤ −1 dBFS.

## Cài đặt

```bash
cd studio && npm install                    # simple-icons (logo thương hiệu)
export ELEVENLABS_API_KEY=...               # đặt trong biến môi trường, KHÔNG commit
./build.sh episodes/2026-10-26-3-repo-ai-agent
```
Cần mạng tới `api.elevenlabs.io`. Playwright + Chromium + ffmpeg đã có sẵn trong môi trường cloud.

## Các loại cảnh (`scenes[].type`)

Mọi cảnh có `lines: [{ "say": "lời đọc", "cap": "phụ đề *từ khoá*" }]` (thiếu `cap` thì dùng `say`),
tuỳ chọn `title`, `num`, `host: { pose, slot: bl|br|top|right, act: talk|hop|wave, flip, hitLine }`.
Phần tử bên trong xuất hiện theo câu đọc: `line: n` = lúc câu thứ n của cảnh bắt đầu (mặc định theo thứ tự).

| type | Dùng cho | Trường chính |
|---|---|---|
| `cover` | Hook + thumbnail (luôn là cảnh đầu) | `tag`, `headline[3]`, `logos[]`, `note`, `sticker`, `host` |
| `headline` | Tin lớn kèm logo hãng | `kicker`, `logos[]`, `text`, `sub`, `subLine` |
| `list` | 2–4 thẻ ý chính / bài học | `items[{icon\|logo, title, sub, line}]` |
| `compare` | A vs B | `left{logo,name}`, `right{…}`, `rows[{label,left,right,win}]` |
| `stat` | Con số lớn đếm lên (trước/sau) | `items[{value,label,icon\|logo,color}]`, `note` |
| `repo` | Repo GitHub | `repo`, `rank`, `stars`, `license`, `lang`, `desc`, `points[{icon\|logo,text}]` |
| `code` | Cửa sổ code | `file`, `code[]`, `bad[]`, `good[]`, `result` |
| `chat` | Hội thoại người ↔ AI | `messages[{from:user\|ai,name,text}]`, `stamp{text}` |
| `flow` | Quy trình 2–4 bước | `nodes[{icon\|logo,label,sub}]` |
| `cta` | Kết: thả tim/lưu/chia sẻ/theo dõi + câu hỏi | `question`, `host` |

**Logo thương hiệu:** dùng slug của [simple-icons](https://simpleicons.org) (`github`, `claude`, `anthropic`, `googlegemini`,
`telegram`, `cursor`, `huggingface`, `nvidia`…). Hãng không có trong simple-icons (OpenAI, Microsoft, Canva…) sẽ hiện dạng chữ —
thêm file logo chính thức vào `assets/logos/<slug>.svg` để dùng logo thật. Chỉ dùng logo khi nói về chính thương hiệu đó (mục đích đưa tin).

**Icon:** `eye bell wrench shield key file list check x chat star code terminal bolt clock rocket brain users bot lock search git
download phone money chart sparkles warning plug layers heart bookmark share plus target test bug megaphone palette home`.
