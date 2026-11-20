# ADR-0001 — Nhiên liệu đèn và luật thắng "giữ sáng tới bình minh" (Ticket-03)

- Trạng thái: chấp nhận · Phase 3 · Contract v1.2
- Thay thế: luật Phase 1–2 "đèn đã sáng không nhận thêm đom đóm", "Bóng Mực không bao giờ vào vùng an toàn", "thắng ngay khi tất cả đèn sáng", công thức điểm cũ.

## Bối cảnh
Người chơi giỏi thắp hết đèn trong 2 phút rồi game kết thúc. Nhà thiết kế muốn căng thẳng tới cuối Đêm: đèn tắt được, mục tiêu là giữ đảo sáng tới bình minh.

## Quyết định
1. **Mô hình trạng thái đèn** đổi từ `{lit, deposited}` sang `{lit, deposited, fuel, ever_lit, relit_count}`. Trạng thái là máy hai pha: *tắt* (đang gom `deposited` tới ngưỡng thắp) và *sáng* (có `fuel`, hao dần). `ever_lit` quyết định chi phí thắp (10 lần đầu, 5 khi thắp lại).
2. **Dầu là số nguyên theo 1/60 fuel** (100 fuel = 6000 đơn vị). Hao 1 đơn vị/tick, hút 5 đơn vị/tick mỗi Bóng. Chỉ làm tròn 1 chữ số khi xuất snapshot. Lý do: tránh sai số số thực tích luỹ 14 400 tick và so sánh đúng ngưỡng `fuel < 30` / `== 30`.
3. **Vùng an toàn là hàm của dầu** (`zoneOn(l) = lit && fuel >= 30`) chứ không còn của `lit`. Mọi chỗ trước kia kiểm `lit` cho vùng an toàn (chặn mép, đẩy ra, kiểm điểm sinh Bóng) đều gọi hàm này.
4. **Bóng Mực thêm trạng thái `drain`.** Chỉ `wander` chọn mục tiêu (đèn sáng fuel < 30 gần nhất; không có thì đèn tắt gần nhất; không có nữa thì lang thang như cũ). Chuyển trạng thái theo đúng ticket; việc thôi hút (đèn hết yếu, tắt, quá xa) được xét **trước** nhánh "đang bị đẩy khỏi vùng sáng" để Bóng vừa bị đẩy vừa thôi hút trong cùng tick.
5. **Luật thắng chuyển hẳn sang bước "xét thắng/thua" cuối tick:** không còn thắng sớm. `no_flames` được xét trước, kể cả tick bình minh. Ngưỡng thắng `ceil(0.6 × tổng đèn)` tính trên đèn *đang sáng* ở tick cuối.
6. **Sức chứa** là hàm `10 + 2 × lights` (tối đa 20) của bộ đếm `successful_lights` trong người chơi, đặt lại mỗi Đêm vì mỗi Đêm tạo `Sim` mới. Đèn đặt bằng scenario không tăng bộ đếm.
7. **Điểm** tính tại chỗ phát sinh (nạp, thắp, thắp lại, Tỏa Sáng) và một lần ở bình minh; thưởng thời gian bỏ (khoá `per_second_left` giữ lại với giá trị 0 để contract không mất khoá).

## Hệ quả / đánh đổi
- Test cũ gắn với luật thắng sớm bị thay (xem `docs/CHANGELOG-phase-3.md`).
- Đèn đầy dầu (fuel = 100) hầu như không bao giờ xảy ra lúc tương tác vì hao 1 tick xảy ra ở bước 2 trước bước tương tác; quy tắc "đèn đầy không được chọn" vẫn được cài đặt và chạy được với `fuel` đặt từ scenario > hao.
- Tốc độ Bóng đi tới đèn yếu là 4.0 m/s (săn mồi), tới đèn tắt là 2 m/s (như lang thang): ticket không nêu, xem giả định.
