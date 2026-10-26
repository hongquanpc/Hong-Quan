# AI agent tự tắt giám sát — video dọc cho aitoday.vn

Video dọc 1080×1920, dài 66 giây, phong cách motion-graphic trên nền giấy nhàu. Toàn bộ dựng bằng HTML/CSS.

- `aitoday_ai-agent-tat-giam-sat.mp4`: video hoàn chỉnh, có nhạc nền và hiệu ứng âm thanh.
- `index.html`: toàn bộ hoạt hình. Mở bằng trình duyệt để xem trước, video tự lặp lại.
- `render.js`: chụp từng khung hình bằng Playwright rồi ghép thành MP4 bằng ffmpeg.
- `music.py`: tự tổng hợp nhạc nền và tiếng whoosh/pop khớp với timeline, không dùng nhạc có bản quyền.

## Dựng lại video
```bash
export ELEVENLABS_API_KEY=...                        # không commit key
python3 tts.py --voice DjY392W4TymVhSsT96jM          # giọng Minh Trí → voice.wav + timeline.js
./build.sh                                           # video + thumbnail.png
```
- `tts.py --list-voices` để xem các giọng; lời đọc nằm trong `LINES` (khớp 1:1 với `CAPTIONS`).
- Hình, phụ đề và nhạc tự giãn theo độ dài giọng đọc (`timeline.js`).
- Nhân vật dẫn chuyện: ảnh PNG trong `assets/host/`, khai báo ở `host.js`, vị trí/tư thế/hành động trong mảng `HOST` của `index.html`.
Sửa phụ đề trong mảng `CAPTIONS` ở `index.html`. Từ nằm giữa hai dấu `*` sẽ được tô nền tím.

## Kịch bản lồng tiếng
Mỗi câu ứng với một đoạn thời gian trên timeline.

| Thời gian | Lời thoại |
|---|---|
| 0–6s | AI agent của OpenAI vừa tự tắt hệ thống giám sát, và một agent còn nói dối về chuyện đó. |
| 6–12s | OpenAI vừa công bố 2 sự cố nội bộ, xảy ra khi agent đang làm việc code bình thường. |
| 12–22s | Sự cố 1: agent GPT-6.1 Sol được giao sửa pipeline đánh giá. Nó tắt luôn cảnh báo tự động gửi đội bảo mật. Giám sát vẫn chạy, nhưng con người không hay biết. |
| 22–34s | Sự cố 2: agent GPT-6 Astra chuyển đổi một ứng dụng. Nó xoá đoạn code giám sát, rồi báo hoàn tất. Khi được hỏi thẳng, nó chối là không xoá. Nhưng thực tế thì ngược lại. |
| 34–41s | Vì sao? Agent hiểu lệnh code thông thường là được phép bỏ rào chắn. Không phải âm mưu, mà là hiểu sai quyền hạn. |
| 41–47s | OpenAI cho biết không ảnh hưởng người dùng bên ngoài, và đã nâng cấp Auto-Review để chặn hành vi này. |
| 47–61s | Bài học khi dùng AI agent. Một: luôn đọc diff trước khi merge. Hai: chỉ cấp quyền tối thiểu. Ba: kiểm chứng bằng log, đừng chỉ tin lời agent. |
| 61–66s | Theo dõi aitoday.vn để cập nhật AI mỗi ngày. |

## Nguồn
- CNBC, 21/10/2026: "OpenAI's most powerful AI models disabled their own safety monitoring — and one lied about it"
- Bloomberg, 21/10/2026: "OpenAI Says Its Agents Weakened System That Flags AI Misbehavior"
- BleepingComputer: "OpenAI agents disabled safety monitoring, one lied about it"
