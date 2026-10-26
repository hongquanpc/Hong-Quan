# Hook & kịch bản — công thức video 45–60 giây

## Cấu trúc chuẩn (mọi video)

| Phần | Thời lượng | Việc phải làm |
|---|---|---|
| **Hook** (`cover`) | 3–5s | 1 câu gây sốc/tò mò + lời hứa giá trị. Khung đầu = thumbnail. |
| **Bối cảnh** | 5–8s | Ai, cái gì, khi nào — 1 con số hoặc 1 logo thương hiệu. |
| **Thân** | 25–35s | 2–3 ý, mỗi ý = 1 cảnh, mỗi cảnh 2–4 câu ngắn. |
| **Giá trị/bài học** | 8–12s | Người xem làm được gì ngay (cài gì, chọn gì, tránh gì). |
| **CTA** (`cta`) | 6–8s | Lưu + chia sẻ + theo dõi + **1 câu hỏi để comment**. |

Câu đọc: **≤ 15 từ**, 1 ý/câu. Phụ đề: **≤ 60 ký tự**, 1 cụm `*từ khoá*` được tô.

## 12 công thức hook (viết lại theo chủ đề)

1. **Dừng lại!** + [sự thật gây sốc]. — "Dừng lại! AI vừa tự tắt hệ thống giám sát của chính nó."
2. **[Việc dài] → [AI làm trong X phút].** — "Báo cáo 2 ngày, AI làm xong trong 10 phút."
3. **Đừng [hành động quen thuộc] nữa nếu chưa biết [X].** — "Đừng code tay nữa nếu chưa biết 3 repo này."
4. **[Số] [thứ] miễn phí mà [nhóm] phải biết.** — "3 repo AI miễn phí dev phải biết."
5. **[Hãng] vừa ra mắt [X] — và nó làm được [điều bất ngờ].**
6. **Nghề [X] đang bị AI làm thay — đây là cách giữ việc.**
7. **Tôi để AI [làm việc gì] trong 24h. Kết quả…**
8. **[Công cụ A] hay [Công cụ B]? Câu trả lời không như bạn nghĩ.**
9. **Sai lầm [số] người dùng AI mắc phải.**
10. **Repo này có [số] sao chỉ sau [thời gian]. Vì sao?**
11. **Bí mật [hãng] không nói khi ra mắt [X].** (chỉ dùng khi có nguồn)
12. **Lưu lại kẻo trôi: [số] cách [lợi ích] bằng AI.**

Thumbnail (`cover.headline`): 3 dòng — dòng 1 chủ thể, dòng 2 *từ khoá tô tím*, dòng 3 cảm xúc (đỏ). Mỗi dòng ≤ 13 ký tự để không xuống dòng (QA sẽ báo).

## Mẫu kịch bản theo trụ cột

### C. Top repo GitHub (`format: repo-top3`)
```
cover : "Dừng lại! Ba repo AI miễn phí này … được hàng trăm nghìn lập trình viên gắn sao."
repo#1: tên + số sao → làm được gì (1 câu) → lợi ích (1 câu) → lưu ý (nếu có)
repo#2: …            repo#3: …
list  : "Vậy chọn cái nào?" → nhu cầu → repo (3 câu)
cta   : lưu + chia sẻ → theo dõi → "Bạn đã dùng repo nào rồi?"
```

### B. AI thay người (`format: ai-replaces`)
```
cover : "[Việc] mất [thời gian], AI làm trong [thời gian]."
stat  : 2 thẻ số (trước / sau) — con số phải có nguồn hoặc tự đo được
flow  : 3–4 bước AI làm (công cụ thật, có logo)
list  : 3 điều con người vẫn phải làm (giữ cân bằng, tránh gây hoang mang)
cta   : "Việc nào của bạn muốn AI làm thay?"
```

### A. Tính năng AI mới (`format: new-feature`)
```
cover   : "[Hãng] vừa cho AI [làm được X]."
headline: logo hãng + tên tính năng + ngày ra mắt
flow/chat: demo cách hoạt động (3–4 bước hoặc đoạn hội thoại)
list    : ai nên dùng / giá / cách bật
cta
```

### D. Cảnh báo AI (`format: incident`)
```
cover → headline (nguồn, ngày) → chat/code (chuyện gì xảy ra) → headline "Vì sao?" → list 3 bài học → cta
```

### E. So sánh (`format: compare`)
```
cover → compare (4 hàng: giá, tốc độ, điểm mạnh, hợp với ai; đánh dấu bên thắng) → list chọn theo nhu cầu → cta
```

## Giọng đọc (ElevenLabs, model `eleven_v4`, `language_code: vi`)

- Viết **số bằng chữ** trong `say` khi đọc dễ sai ("ba trăm tám mươi nghìn sao"), giữ số trong `cap` ("380K+").
- Tên tiếng Anh giữ nguyên (Claude Code, GitHub). Tên miền đọc rời: "AI Today chấm V N".
- Từ dễ nghe nhầm phát hiện qua QA: "Dừng lướt" → nghe thành "Dừng nước" ⇒ dùng "Dừng lại".
- Câu cảm thán ở hook để giọng có năng lượng (hook tự dùng `style` cao hơn).
