# Nhật ký dùng AI
Công cụ: Claude (trợ lý lập trình). Tôi điều phối, chạy lệnh, đọc kết quả.

## Phase 1
- Dùng AI để: phân tích PRD-0/Contract, viết lõi mô phỏng, CLI headless, 33 test, bản web Three.js, tài liệu.
- Tự kiểm: `npm test`, chạy headless, `vite build`, chơi thử web.

## Phase 2
- Dùng AI để: đọc Ticket-02, đưa ra giả định (docs/notes/phase-2-assumptions.md), viết lại lõi theo số chuẩn, 3 bản đồ, Lướt/Gió Lạc/Bùa Gió/rơi/tạm dừng, 64 test, 12 scenario headless, web 3 Đêm.
- Lỗi AI mắc và đã sửa trong lúc làm: (1) tầng Đêm 3 ban đầu cho đi xuyên dưới vách (lỗi mô hình địa hình, test phát hiện); (2) `headless.js` quên truyền `--night` vào mô phỏng (test CLI phát hiện); (3) vài test viết sai kỳ vọng (dấu, tick) được sửa theo ghi chú tick.
- Tự kiểm: `npm test` (64), `npm run proof` (scenario thật + tất định + hiệu năng), mở web bằng trình duyệt headless (không lỗi JS; ảnh chụp Đêm 1).
- Chưa kiểm: toàn bộ chuỗi web Đêm 2–3 bằng mắt, âm thanh thật, FPS ≥ 30 ở 1280×720 trên máy bạn.
- Ước lượng token: _(điền số thật từ phiên của bạn)_

## Phase 3
- Dùng AI để: đọc Ticket-03, sửa lõi (nhiên liệu số nguyên 1/60, trạng thái `drain`, luật thắng ở bình minh, sức chứa, điểm), cập nhật test cũ kèm lý do, viết 18 test mới, ADR, changelog, web (thanh dầu, mù màu).
- Lỗi AI mắc và đã sửa: trạng thái `drain` bị bỏ qua khi Bóng đang bị đẩy khỏi vùng sáng (nhánh `pushTicks` chạy trước) — test "drain → wander khi fuel ≥ 30" bắt được; vài kỳ vọng test sai do đèn đã hao 1 tick trước khi tương tác.
- Tự kiểm: `npm test` (84), `npm run proof` (20 scenario gồm hồi quy Phase 2, tất định, hiệu năng), `vite build`.
- Chưa kiểm: web Phase 3 bằng mắt (thanh dầu, nhấp nháy, chế độ mù màu), FPS.
- Ước lượng token: _(điền số thật từ phiên của bạn)_
