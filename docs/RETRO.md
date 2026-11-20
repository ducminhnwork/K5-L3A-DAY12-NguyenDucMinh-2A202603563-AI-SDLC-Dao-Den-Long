# Retro cuối — Đảo Đèn Lồng (4 phase)

## 1. Đánh giá 4 phase
| Phase | Kết quả | Bằng chứng |
|---|---|---|
| 1 Lõi | Sim tất định 60 tick/s, CLI headless, web Đêm 1 | `docs/proof/phase-1/` |
| 2 Ba Đêm | 3 bản đồ, Lướt, Gió Lạc, Bùa Gió, rơi, tạm dừng; 12 scenario | `docs/proof/phase-2/` |
| 3 Đèn cạn dầu | Nhiên liệu số nguyên, `drain`, luật thắng ở bình minh, điểm mới; 20 scenario | `docs/proof/phase-3/`, ADR 0001 |
| 4 Bình minh | Bench, soak, bảng xếp hạng, đổi phím, tiếp cận, Release | `docs/proof/phase-4/`, `bench.json`, `soak.json` |

## 2. AI giúp được gì, không giúp được gì
- Giúp: dựng nhanh lõi + test + scenario; viết tài liệu; tìm hồi quy khi đổi luật (Phase 3 chỉ đỏ đúng 8 test, mỗi cái có lý do).
- Không giúp/phải kèm người: số đo trên máy thật (bench), cảm giác chơi, quay video, tạo Release — những việc cần phần cứng hoặc tài khoản của người làm.

## 3. Lỗi AI mắc và cách bắt
1. Tầng Đêm 3 cho đi xuyên dưới vách → test phát hiện (Phase 2).
2. `headless.js` quên truyền `--night` → test CLI (Phase 2).
3. `drain` bị bỏ qua khi Bóng đang bị đẩy → test "drain → wander" (Phase 3).
4. Soak: đo `mem_start` trước khi V8 làm nóng khiến phép so 1.2× sai → chạy thật và đo từng Đêm (Phase 4).
5. Nhiều kỳ vọng test sai dấu/lệch 1 tick → đọc ghi chú tick, sửa test chứ không sửa luật.

## 4. Harness hiệu quả nhất
Quy tắc "đổi luật ⇒ viết ADR + changelog trước, rồi mới sửa test" trong `AGENTS.md`, cùng `npm run proof` (scenario có kỳ vọng thật, tất định, hiệu năng) chạy trước mỗi tag. Hook Stop chạy test tránh quên kiểm lại. Lõi sim tách khỏi đồ hoạ nên bench/soak/headless dùng chung mà không chạm web.

## 5. Token / chi phí
_(Người làm điền số thật từ bảng usage của phiên.)_ Cách tiết kiệm đã dùng: giữ lõi nhỏ và tất định (ít phải giải thích lại), dùng `docs/notes/*` + `AGENTS.md` làm trí nhớ giữa các phiên thay vì dán lại ngữ cảnh, đo thay vì đoán (`memtrace`, `proof`), tóm tắt phiên khi cạn ngữ cảnh.

## 6. Nếu làm lại
- Đặt `Sim` có cờ chế độ (bench) và `run_cmd` là một launcher ngay từ Phase 1 để Phase 4 không phải đổi `npm start`.
- Viết bench từ Phase 2 để thấy sớm vấn đề hiệu năng thay vì dồn lại cuối.
- Chơi thử web sau mỗi phase (nhiều thứ ở web chỉ kiểm bằng mắt).

## 7. Việc người làm phải tự điền / tự làm
- Chạy `npm run bench` và `npm run soak` trên máy thật, commit `bench.json`, `soak.json`.
- Quay video `.mp4` < 5 phút, dán link lên đầu README.
- Tag `phase-4`, tạo GitHub Release `v1.0.0` đính kèm `release/dao-den-long-v1.0.0.zip` (`npm run release`).
- Điền ước lượng token ở mục 5 và `docs/notes/ai-log.md`.
