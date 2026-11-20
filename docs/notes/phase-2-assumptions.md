# Giả định Phase 2 (Ticket-02)
Số liệu chuẩn thay mọi giá trị tự chọn ở Phase 1 (điều chỉnh: sức chứa 10, đèn 10, tỏa sáng 3 đom đóm/5 m/3 s, vùng an toàn 6 m, Bóng Mực 4.0 m/s…). Điểm đổi: +10 khi **nạp** đom đóm (trước là khi nhặt), +5/bóng trúng Tỏa Sáng, thắng +2/giây.

Những chỗ ticket không nói rõ, tôi tự chọn (đổi được ở Phase sau nếu giảng viên đính chính):
- **Tăng tốc/dừng ≤ 0.1 s:** chọn tức thì (0 s), nên vận tốc ngang = hướng phím × tốc độ ngay trong tick.
- **Hướng quay mặt:** ban đầu +Z; cập nhật khi có phím di chuyển; Lướt khi đứng yên theo hướng này. Lướt trên không đặt vận tốc đứng về 0 trong 12 tick (giữ độ cao).
- **Lướt khi đang phóng bởi bục:** vận tốc ngang của Lướt thay vận tốc phóng trong 12 tick, sau đó vận tốc phóng được khôi phục (nên Mây bay ngắn hơn).
- **Điểm xuất phát Đêm 2:** (0,0,0) trên đảo A. **Đêm 3:** (0,0,−30) vì (0,0,0) nằm trong tháp chuông. Hồi sinh sau khi rơi về điểm này.
- **Tầng, vách, dốc (Đêm 3):** các tầng là khối đặc; chỉ mặt trên cùng ở mỗi (x,z) đứng được. Đi từ tầng thấp vào vách cao hơn 0.3 m bị chặn (trượt dọc vách); bước ra khỏi mép tầng thì rơi xuống mặt thấp hơn. Dốc cao 3 m trên 6 m (tỉ lệ 0.5); hai bên dốc là vách.
- **Điểm sương của Gió Lạc:** dùng chính các điểm sinh Bóng Mực của đêm đó. Bay ở độ cao mặt đất + 1.5 m; không va chạm địa hình; idle đi lang thang 2 m/s.
- **`spawning` của Bóng Mực:** 30 tick đứng yên, không gây sát thương; sau đó `wander`; vào `chase` khi người chơi ≤ 12 m (XZ) và quay lại `wander` khi > 18 m. `wander` đi 2 m/s theo hướng ngẫu nhiên đổi mỗi 120 tick.
- **Bóng trong vùng an toàn:** bị đẩy 12 m/s tới mép 6 m; trong lúc đó `pushTicks > 0` và không gây sát thương.
- **Bóng ban đầu:** không có (đúng lịch sinh "2 con tại tick 300"). Scenario không ghi `state` thì bóng bắt đầu ở `wander`.
- **Sinh Bóng Mực:** điểm hợp lệ = cách Mây ≥ 15 m (XZ), không nằm trong vùng sáng, không trùng bóng khác; không có điểm hợp lệ thì bỏ lượt.
- **Gió mạnh:** cơn gió đầu bắt đầu ở tick 1801 (sau 30 s), báo trước từ tick 1681; hướng chọn ngẫu nhiên lúc bắt đầu báo; đo từ +X theo (cos, sin) trên (x,z). `wind_enabled` mặc định bật ở Đêm 3, tắt ở Đêm 1–2.
- **Góc:** mọi điểm = (r·cosθ, r·sinθ) trên (x,z), θ đo từ +X. Chọn như vậy vì tầng 1 của Đêm 3 ở nửa z > 0 và dốc 30°/150° phải nối vào nó.
- **Tương tác với đèn** tính theo khoảng cách XZ (ticket không nêu chênh cao).
- **`player.invuln`** trong snapshot là boolean; `player_hit.lost` = số đom đóm mất khi rơi (0 khi bị Bóng Mực).
- **Mốc tick của sự kiện/lịch sinh** dùng `sim_tick` (không tăng khi tạm dừng); `tick` là số bước đã chạy.
- **Đom đóm rơi** cũng tính vào trần 30 của lịch sinh đom đóm; đặt y theo mặt đất tại điểm rơi.
- **Dòng `end`:** `state` là `playing` nếu đang tạm dừng/chưa xong.

## Web (không ảnh hưởng headless)
Chuỗi Menu → giới thiệu Đêm (lời Ông Đăng) → chơi → kết quả → Đêm kế → Bình Minh; tạm dừng Esc/P; cài đặt lưu localStorage; âm thanh tổng hợp bằng WebAudio (không dùng file ngoài); HUD theo mô tả; mũi tên chỉ đèn chưa sáng. Điều khiển: WASD, Space nhảy, **Shift** lướt, E nạp đèn, F toả sáng.

> Cập nhật Phase 3: thời lượng, điểm, luật thắng và vùng an toàn đã đổi theo Ticket-03; xem `docs/notes/phase-3-assumptions.md` và `docs/CHANGELOG-phase-3.md`.
