# Giả định Phase 4 (ticket chưa nói rõ)
1. **Seed soak:** Đêm thứ i (i = 0..9) dùng seed `7 + i`.
2. **Hướng camera bench:** "ngược chiều kim đồng hồ khi nhìn từ trên xuống" với trục Y hướng lên: từ (30,15,0) đi về phía (0,15,−30), tức `(30cosθ, 15, −30sinθ)`.
3. **Vsync:** trình duyệt chỉ tắt được vsync bằng cờ dòng lệnh (`--disable-gpu-vsync --disable-frame-rate-limit`); `vsync_off: true` nghĩa là đã truyền cờ, không phải do Chrome xác nhận. Nếu GPU/driver ép vsync thì `avg_fps` sẽ bị chặn ở tần số màn hình.
4. **`load_ms`:** từ lúc tiến trình `node scripts/bench.js` bắt đầu đến khung hình bench đầu tiên (gồm khởi động server, Chrome, tải trang). Nếu `dist/` chưa có thì script build trước và thời gian build cũng được tính; nên chạy `npm run build` trước.
5. **`peak_mem_mb` (web):** tổng RSS/working set của mọi tiến trình Chrome dùng hồ sơ tạm của lần bench, lấy mẫu 0,5 s/lần (Windows: PowerShell `Win32_Process`; Linux/macOS: `ps`). `null` nếu không đo được.
6. **p95:** thứ hạng gần nhất (nearest-rank): phần tử thứ `ceil(0.95N)` trong dãy tăng dần.
7. **200 Bóng Mực "rải đều":** xoắn ốc hướng dương (góc vàng) bán kính ≤ 38 m cộng nhiễu nhỏ theo seed 42; 100 đom đóm bán kính ≤ 36 m. Bóng Mực không bị chặn tránh vật cản, vẫn di chuyển theo luật wander bình thường.
8. **`Sim.bench`:** tắt spawn, nhặt đồ, va chạm/sát thương, hao dầu, điều kiện kết thúc và chuyển sang đuổi (`decideChase`) để Bóng Mực luôn ở `wander`. Chỉ web bench dùng; headless không bao giờ bật.
9. **Soak `mem_start`:** đo sau khi V8 được làm nóng (3 Đêm × 4000 tick) và `gc()`. Đo thực tế: RSS tăng ~20 MB (JIT, bộ nhớ đệm) trong Đêm đầu rồi đi ngang; nếu đo ngay khi nạp Đêm 1 thì mức tăng "một lần" này sẽ làm phép so 1.2× sai chứ không phải rò rỉ. Số thật nằm ở `soak.json` (và xem được dạng sandbox ở `docs/proof/phase-4/`).
10. **Thua = hết lượt:** thua ở bất kỳ Đêm nào thì hiện màn nhập tên; `score` = tổng điểm các Đêm đã thắng (Đêm thua không tính). Chơi lại bắt đầu từ Đêm 1. Phím tạm dừng "Chơi lại Đêm" vẫn còn trong menu tạm dừng.
11. **`seed` trong bảng xếp hạng:** seed của Đêm 1 của lượt chơi (web dùng seed theo thời gian nên mỗi lượt khác nhau).
12. **Lưu trữ:** web có máy chủ cục bộ (`scripts/run.js`) lưu `data/leaderboard.json`; nếu mở bản web tĩnh không có máy chủ thì dùng `localStorage` (và `--export-leaderboard` không thấy các mục đó).
13. **Cổng:** mặc định 5173, đổi bằng `--port` hoặc biến `PORT`.
