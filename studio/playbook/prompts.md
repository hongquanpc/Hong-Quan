# Prompt library — dùng với Claude (hoặc AI khác) ở từng bước

Thay `<…>` trước khi dùng. Mọi prompt đều yêu cầu **nguồn có link + ngày** để qua cổng QA.

## 1. Quét tin & chọn chủ đề
```
Bạn là biên tập viên tin AI cho kênh video ngắn tiếng Việt aitoday.vn (người xem: dân văn phòng, dev, chủ doanh nghiệp nhỏ).
Tìm 8 tin/công cụ AI nổi bật nhất trong 7 ngày qua (hôm nay là <ngày>), thuộc các nhóm:
tính năng AI/agent mới, AI làm thay việc của người, repo GitHub AI tăng sao nhanh, sự cố/cảnh báo AI, so sánh công cụ.
Với mỗi mục trả về: tiêu đề 1 câu · vì sao người Việt quan tâm · người xem làm được gì ngay · 2 nguồn (link, ngày, độ tin cậy).
Cuối cùng xếp hạng top 3 theo: mới, thử được ngay, độ "wow", độ chắc chắn của nguồn. Loại bỏ tin chỉ có 1 nguồn blog.
```

## 2. Kiểm chứng sự thật
```
Đây là các khẳng định sẽ xuất hiện trong video: <danh sách>.
Với từng khẳng định: tìm nguồn gốc (trang chính thức/repo/báo lớn), ghi giá trị chính xác hiện tại, ngày kiểm tra,
và đánh giá: ĐÚNG / CẦN SỬA (ghi bản sửa) / KHÔNG KIỂM CHỨNG ĐƯỢC (đề xuất bỏ hoặc nói "theo báo cáo…").
Số sao GitHub làm tròn xuống dạng "380K+". Không suy đoán.
```

## 3. Viết kịch bản (ra thẳng episode.json)
```
Viết kịch bản video dọc 45–60 giây, tiếng Việt, giọng nói chuyện năng lượng cao, theo format <format> trong
studio/playbook/hooks-and-scripts.md. Chủ đề: <chủ đề>. Sự thật đã kiểm chứng: <facts + nguồn>.
Quy tắc: câu đọc ≤ 15 từ; phụ đề ≤ 60 ký tự, đúng 1 cụm *từ khoá*; số trong lời đọc viết bằng chữ; hook dùng 1 trong 12 công thức;
CTA có câu hỏi để comment. Dùng các loại cảnh: cover, headline, list, compare, stat, repo, code, chat, flow, cta
(xem studio/README.md). Thêm logo thương hiệu (slug simple-icons) ở mọi cảnh nhắc tới hãng/công cụ.
Trả về JSON hợp lệ theo schema của studio/episodes/2026-10-26-3-repo-ai-agent/episode.json, có "sources" và "facts" (checked: false).
```

## 4. Tự phản biện kịch bản trước khi dựng
```
Đọc episode.json này như một người xem khó tính và một biên tập viên pháp lý.
1) 3 giây đầu có đủ lý do để dừng lướt không? Viết lại hook tốt hơn nếu chưa.
2) Câu nào thừa, câu nào khó hiểu với người không biết code?
3) Khẳng định nào có thể sai, gây hiểu lầm, phóng đại, hoặc xúc phạm thương hiệu?
4) Phụ đề nào có lỗi chính tả, thiếu dấu, sai tên riêng (OpenAI, GitHub, ChatGPT…)?
Trả về danh sách sửa cụ thể theo dạng: scene i, line j: cũ → mới.
```

## 5. Caption bài đăng
```
Viết caption TikTok/Reels/Shorts cho video này (≤ 150 ký tự, có 1 câu hỏi kéo comment), 5–7 hashtag (#AI #aitoday + chủ đề),
và 1 dòng "Nguồn: …" với tên nguồn. Không dùng từ ngữ câu view sai sự thật.
```
