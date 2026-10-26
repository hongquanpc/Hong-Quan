# Research — tìm chủ đề mỗi ngày

Mục tiêu: mỗi ngày chọn **1 chủ đề** mà người xem Việt Nam *muốn biết ngay*, có **nguồn kiểm chứng được**, và có **giá trị dùng được** (cài được, thử được, áp dụng được).

## 5 trụ cột nội dung (xoay vòng trong tuần)

| Trụ cột | Người xem nhận được gì | Ví dụ | Format gợi ý |
|---|---|---|---|
| **A. Tính năng AI mới** | "AI giờ làm được cả cái này?!" | Agent tự đặt lịch, đọc email, code cả app | `headline` → `flow` → `list` → `cta` |
| **B. AI thay người làm X** (FOMO) | "Việc 2 ngày, AI làm 10 phút" | AI làm báo cáo, dựng video, chăm sóc khách | `stat` (trước/sau) → `flow` → `list` |
| **C. Repo GitHub đáng giá** | Công cụ miễn phí, cài ngay | Top 3 repo agent tuần này | `repo` × 3 → `list` → `cta` |
| **D. Cảnh báo / sự cố AI** | Tránh bị hại, dùng an toàn | Agent tắt giám sát, rò rỉ dữ liệu | `headline` → `chat`/`code` → `list` bài học |
| **E. So sánh / chọn công cụ** | Biết chọn cái nào | Claude Code vs Codex, Gemini vs ChatGPT | `compare` → `list` → `cta` |

Ưu tiên khi chọn: **mới (≤ 7 ngày)** > **có thể thử ngay** > **có con số ấn tượng nhưng kiểm chứng được** > **liên quan người Việt**.

## Nguồn theo dõi

**Tin chính thống (ưu tiên trích dẫn):** blog chính thức của OpenAI, Anthropic, Google DeepMind/Gemini, Meta AI, Microsoft, NVIDIA, Mistral, DeepSeek, Qwen; The Verge, TechCrunch, CNBC, Bloomberg, Reuters, Ars Technica.

**Repo & công cụ:** github.com/trending (lọc ngôn ngữ/thời gian), trendshift.io, ossinsight.io, Hacker News (front page), Product Hunt (AI), Hugging Face trending.

**Tín hiệu cộng đồng (chỉ để phát hiện, không trích làm nguồn chính):** X/Twitter của researcher, Reddit r/LocalLLaMA r/ClaudeAI r/ChatGPT, dev.to, Medium, các group AI Việt Nam.

## Truy vấn tìm kiếm mẫu (đổi tháng/năm)

```
AI news this week <tháng> <năm>
<OpenAI|Anthropic|Google Gemini> launch <tháng> <năm>
new AI agent can now <task> <tháng> <năm>
GitHub trending AI agent repository <tháng> <năm> stars
open source alternative to <sản phẩm> GitHub <năm>
AI replaces <nghề/việc> in minutes case study <năm>
<tên repo> GitHub what it does install
```

## Quy tắc kiểm chứng (bắt buộc trước khi viết kịch bản)

1. **Mỗi con số, tên, ngày tháng xuất hiện trên hình hoặc trong lời đọc → 1 dòng trong `facts`** của `episode.json`, kèm nơi kiểm tra (`check`).
2. Tin tức: cần **≥ 2 nguồn độc lập**, trong đó ít nhất 1 nguồn chính thống. Chỉ có blog tổng hợp → nói rõ "theo báo cáo…" hoặc bỏ.
3. Số sao GitHub: lấy **trực tiếp trên trang repo** ngày làm video, làm tròn xuống ("380K+"), không dùng số của blog tổng hợp.
4. Tên model/sản phẩm: viết đúng như hãng viết (GPT-6.1, Claude Opus 5.5, Gemini…). Nghi ngờ → kiểm tra trang chính thức.
5. Không thổi phồng: "thay thế hoàn toàn con người", "100% chính xác" → cấm, trừ khi trích nguyên văn có nguồn.
6. Tin về sự cố/bảo mật: nêu cả **phản hồi của hãng** và **tác động thực tế** (có/không ảnh hưởng người dùng).
