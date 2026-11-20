# Spec Phase 2 — acceptance criteria (Ticket-02 "Ba hòn đảo", contract v1.1)

Mỗi mục Phần 3 có tiêu chí nghiệm thu kiểm chứng được. Cột "Bằng chứng" trỏ tới test (`tests/`) và scenario headless (`scenarios/phase2/manifest.json`, kết quả ở `docs/proof/phase-2/`).

| # | Mục | Tiêu chí nghiệm thu | Bằng chứng |
|---|---|---|---|
| 1 | Số liệu chuẩn | Mọi giá trị trong `game.contract.json › tuning` bằng `src/sim/config.js` và bằng bảng Phần 1 | cli.test "contract khớp TUNING" |
| 2 | Lướt | 14 m/s trong 12 tick; hồi chiêu 90 tick tính từ lúc bắt đầu; bấm lúc đang lướt hoặc đang hồi chiêu bị bỏ; hướng = hướng đang đi, đứng yên thì hướng mặt (+Z lúc đầu); trên không giữ độ cao; sự kiện `dash` | features/sim.test "lướt" ×2; scenario `dash` |
| 3 | Đom đóm | 20 lúc đầu tại 20 điểm khác nhau thuộc tập điểm chuẩn; nhặt khi XZ ≤ 1.0 và chênh cao ≤ 1.5; sức chứa 10; sinh thêm mỗi 240 tick nếu < 30, hết điểm trống thì bỏ lượt | sim.test "đom đóm" ×3 |
| 4 | Đèn lồng | Cần 10, nạp nhiều lần; bán kính 2.0; chọn đèn gần nhất, bằng nhau thì id nhỏ; nạp min(đang mang, còn thiếu); +10/đom đóm nạp, +100/đèn | sim.test "đèn" ×3 |
| 5 | Vùng an toàn | Bóng ngoài bị chặn ở mép 6 m; bóng trong vùng lúc đèn thắp bị đẩy ra ≤ 30 tick và không gây sát thương | features "Vùng an toàn" ×2; scenario `safe-zone-push` |
| 6 | Tỏa Sáng | Tốn 3, bán kính 5 tính 3D từ chân+0.8, hồi chiêu 180 tick; mục tiêu chốt ngay tick kích hoạt; choáng 120 tick; đẩy 4 m trong 15 tick; pulse lại làm mới; +5/bóng/lần | features "Tỏa Sáng" ×5; scenario `pulse` |
| 7 | Bóng Mực | 4.0 m/s (Đêm 3: 4.5); phát hiện 12, bỏ đuổi 18; lịch sinh theo đêm; sinh cách người ≥ 15 m; tối đa 6/8/10; trạng thái `spawning/wander/chase/recoil/stunned` | features "Bóng Mực" ×3 |
| 8 | Bị đánh | −1 lửa; rơi floor(mang/2) vào vành 1.5–2.5 m, TTL 480; bất tử 90 tick; bóng recoil 2 m/60 tick; tối đa 1 hit/tick; bóng chạm lúc bất tử không làm gì | features "Bị đánh" ×3 |
| 9 | Rơi khỏi đảo | Y < −10: đúng 1 lần, bỏ qua bất tử, −1 lửa, mất hết đom đóm; chờ 60 tick rồi hồi sinh ở điểm xuất phát, bất tử 90; hết lửa thì thua ngay | features "Rơi khỏi đảo" ×3; scenario `fall` |
| 10 | Thắng/thua | Hết lửa → thua `no_flames`; tất cả đèn sáng → thắng (kể cả đúng tick hết giờ); còn lại hết giờ → `dawn`; điểm thắng cộng 2×giây + 50×lửa | sim.test "thắng" ×2; scenario `win-night1` |
| 11 | Đêm 2 | Hai đảo r=28 + cầu tre không lan can; 6 đèn; 2 bục nhảy bắn sang đảo kia (Y 14, 24 m/s), vận tốc giữ tới khi chạm đất; 330 s | maps.test "Đêm 2" ×5; scenario `pad-night2` |
| 12 | Đêm 3 | 3 tầng, vách đứng, 2 dốc, bục (0,3,13) lên tầng 2, tháp chuông không xuyên được, 7 đèn, 360 s | maps.test "Đêm 3" ×5; scenario `pad-night3` |
| 13 | Gió mạnh | Mỗi 30 s một cơn kéo dài 5 s, đẩy 2 m/s, báo trước 2 s | maps.test "gió mạnh"; scenario `wind-night3` |
| 14 | Gió Lạc | Đêm 2–3; tối đa 2; sinh tại tick 1200, 2400…; idle→chase khi mang ≥5 và ≤15 m; chạm cướp min(3,mang) rồi flee 240 tick; Tỏa Sáng làm nó bỏ chạy hoặc thả đồ; không mất lửa | maps.test "Gió Lạc" ×7; scenario `drifter-steal`, `drifter-drop` |
| 15 | Bùa Gió | Nhặt như đom đóm; 600 tick; 7.2 m/s; Lướt không hồi chiêu; hiện lại sau 2700 tick | features "Bùa Gió" ×2; scenario `charm` |
| 16 | Tạm dừng | Tick tăng nhưng sim_tick/thời gian/hồi chiêu/spawn đứng yên; snapshot `paused`; sự kiện `paused`/`resumed` | features "Tạm dừng"; scenario `pause` |
| 17 | Contract v1.1 | `--night 1..3`; snapshot có night, wind, player.*, motes/drifters/charms; scenario/inputs mới; exit 2 khi sai định dạng; một Đêm ≤ 30 s | cli.test; proof `perf` (≈0.3 s) |
| 18 | Chuỗi 3 Đêm, menu, cài đặt, âm thanh, HUD, bảng màu | Chỉ có ở bản web: xem mục "Web" trong `docs/notes/phase-2-assumptions.md` | palette.test (màu); kiểm tay + ảnh chụp (xem mục chưa kiểm) |
