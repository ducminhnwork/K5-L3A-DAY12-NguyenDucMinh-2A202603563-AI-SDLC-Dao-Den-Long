# Truy vết Phase 2
Xem bảng đầy đủ ở `docs/spec-phase-2.md` (mục → tiêu chí → test/scenario). Mã nguồn: `src/sim/sim.js` (thứ tự tick theo Ticket-02: pause → bộ đếm → di chuyển → nhặt → đèn → vùng an toàn → Tỏa Sáng → di chuyển bóng/gió → chạm → sinh → thắng/thua), `src/sim/maps.js` (3 bản đồ), `src/sim/config.js` (số chuẩn).
Phase 1 regression: các test cũ được điều chỉnh theo số chuẩn mới (ví dụ nạp 10 thay vì 4; Tỏa Sáng tốn 3) — không có test nào bị tắt.
