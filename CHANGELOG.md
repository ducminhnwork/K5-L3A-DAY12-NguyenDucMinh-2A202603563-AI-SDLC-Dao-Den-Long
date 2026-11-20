# Changelog

## v1.0.0 — Phase 4 "Bình minh" (contract v1.3)
- Thêm: `scripts/bench.js` (benchmark web 1280×720, 200 Bóng Mực, 100 đom đóm, camera quay), `scripts/soak.js` (10 Đêm liên tiếp), bảng xếp hạng lưu đĩa + `--export-leaderboard`, đổi phím + phát hiện trùng + khôi phục mặc định, phụ đề/chỉ báo (Bóng Mực xuất hiện kèm mũi tên, gió, 10 giây cuối, đèn sắp cạn), giảm chuyển động, chữ lớn ×1.25, chữ ≥ 18 px, rung camera/loé khi trúng đòn (tắt được).
- Thay đổi: `run_cmd` = `node scripts/run.js` (server cục bộ phục vụ `dist/`, `npm start` gọi nó); thua một Đêm kết thúc lượt chơi và hỏi tên (trước đây thua thì chơi lại Đêm); `Sim` có cờ `bench` (mặc định tắt, không đổi đầu ra headless).
- Hợp đồng: `contract_version` 1.3, thêm `bench_cmd`, `soak_cmd`; mọi yêu cầu v1.0–v1.2 giữ nguyên.
- Đóng gói: `npm run release` tạo `release/dao-den-long-v1.0.0.zip`; Dockerfile; README, CREDITS, RETRO.

## Phase 3 — "Đèn cạn dầu" (contract v1.2)
Nhiên liệu đèn (hao dần, châm dầu bằng E), vùng an toàn chỉ khi dầu ≥ 30, Bóng Mực hút dầu (trạng thái `drain`), thắng chỉ ở bình minh với ≥ 60% đèn sáng, sức chứa tăng dần, bảng điểm mới. Chi tiết và các test cũ đã đổi: `docs/CHANGELOG-phase-3.md`, `docs/adr/0001-den-can-dau.md`.

## Phase 2 — Ba Đêm (contract v1.1)
Đảo Cau (cầu tre, bục nhảy, Gió Lạc, Bùa Gió) và Đảo Chuông (3 tầng, dốc, gió), Lướt, rơi khỏi đảo, tạm dừng, 12 scenario headless có kiểm kỳ vọng.

## Phase 1 — Lõi (contract v1.0)
Lõi mô phỏng tất định 60 tick/giây, CLI headless, web Three.js Đêm 1, test và harness (`AGENTS.md`, skill, hook).
