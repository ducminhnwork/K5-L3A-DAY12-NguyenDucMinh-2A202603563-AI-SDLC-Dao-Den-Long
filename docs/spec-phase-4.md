# Spec Phase 4 — Ticket-04 "Bình minh: phát hành v1.0.0" (contract v1.3)
| Yêu cầu | Cách làm | Kiểm chứng |
|---|---|---|
| Bench `--seed 42 --duration 30 --out` | `scripts/bench.js` mở Chrome/Edge 1280×720, trang `?bench=1`, `Sim({bench:true})` + 200 Bóng wander, 100 đom đóm, camera quay | `tests/phase4.test.js` (công thức, cờ bench); `bench.json` chạy trên máy thật |
| Công thức avg/p1/p95 | `src/bench-stats.js` | test `benchStats` |
| Soak 10 Đêm | `scripts/soak.js` | test soak 3 Đêm; `soak.json` 10 Đêm |
| Bảng xếp hạng | `src/leaderboard.js`, `leaderboard-store.js`, `/api/leaderboard`, màn web | test logic + export CLI |
| `--export-leaderboard` | `scripts/run.js` | test export |
| Đổi phím, trùng phím, mặc định | `src/web/settings.js` + màn Cài đặt | test `findConflict`; thử bằng trình duyệt |
| Phụ đề/chỉ báo, giảm chuyển động, chữ ≥ 18 px / ×1.25 | `src/web/main.js`, `index.html` | test CSS; ảnh chụp |
| Đóng gói | README, CHANGELOG, CREDITS, LICENSE, `npm run release`, Dockerfile | `docs/proof/phase-4/` |
| Contract v1.3 | `game.contract.json` (`bench_cmd`, `soak_cmd`) | test hợp đồng |
