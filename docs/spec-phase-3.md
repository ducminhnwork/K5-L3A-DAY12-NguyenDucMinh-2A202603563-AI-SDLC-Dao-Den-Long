# Spec Phase 3 — acceptance criteria (Ticket-03, contract v1.2)

| # | Mục | Tiêu chí nghiệm thu | Bằng chứng |
|---|---|---|---|
| 1 | Nhiên liệu | fuel=100 khi vừa thắp; hao 1/s (1/60/tick, số nguyên); 3600 tick hao đúng 60.0 | fuel.test "dầu" ×3, "tính dầu số nguyên" |
| 2 | Châm dầu | used = min(mang, ceil((100−fuel)/10)); +10/đom đóm; +5 điểm/đom đóm; sự kiện `refuel`; chọn đèn nhận được gần nhất, bằng nhau id nhỏ | fuel.test "châm dầu" ×2; sim.test "đèn: bán kính 2.0"; scenario `refuel` |
| 3 | Hết dầu & thắp lại | fuel ≤ 0 → tắt, deposited=0, `lantern_out`, giữ ever_lit; đèn từng sáng chỉ cần 5; +40 thắp lại, +100 lần đầu; `lantern_lit.relight` | fuel.test "hết dầu", "thắp lại"; scenario `lantern-out`, `relight` |
| 4 | Vùng an toàn theo dầu | fuel < 30 mất vùng; đúng 30 còn | fuel.test "vùng an toàn chỉ còn khi fuel ≥ 30" |
| 5 | Bóng hút dầu | wander chọn đèn yếu gần nhất (id nhỏ nếu bằng); tới ≤ 2 m → `drain`, đứng yên, hút 5/s cộng dồn; `fuel_drain` mỗi 60 tick | fuel.test "wander đi tới", "fuel_drain mỗi 60 tick"; scenario `drain` |
| 6 | Chuyển trạng thái drain | → chase khi Mây ≤ 6 m; → stunned khi trúng Tỏa Sáng (+15); → wander khi đèn tắt / fuel ≥ 30 / cách > 2 m; hết choáng → wander | fuel.test "drain -> chase", "drain -> wander" |
| 7 | Châm dầu đẩy Bóng | fuel lên ≥ 30 lúc Bóng trong 6 m → đẩy ra ≤ 30 tick, không sát thương | fuel.test "châm dầu lên ≥ 30" |
| 8 | Luật thắng | Không thắng sớm; thắng ở bình minh nếu sống và đèn sáng ≥ ceil(0.6×tổng) (3/5, 4/6, 5/7); thua `dawn` nếu thiếu; `no_flames` luôn trước | sim.test ×4; scenario `dawn-win`, `dawn-lose`, `no-early-win`, `no-flames-at-dawn` |
| 9 | Thời lượng | 240 / 270 / 300 s | fuel.test "Đêm 2/3"; maps.test |
| 10 | Sức chứa | 10 + 2×lần thắp thành công (tối đa 20); đèn đặt sẵn không tính; thắp lại tính | fuel.test "sức chứa" ×2; scenario `relight` |
| 11 | Điểm | +5 đom đóm nạp; +100/+40; +5 (+15 drain) mỗi bóng; bình minh +50+floor(fuel)/đèn sáng, +50/lửa; bỏ thưởng thời gian | sim.test; fuel.test "điểm" |
| 12 | Contract v1.2 | `game.contract.json` khớp `TUNING`; snapshot/scenario/sự kiện mới; exit 2 khi sai định dạng | cli.test |
| 13 | Mù màu (web) | Cài đặt "Bảng màu dễ phân biệt" được lưu; viền/mắt Bóng #00B3FF; cảnh báo UI #FFFFFF kèm ⚠; đèn tắt xẹp 20% + vết rách; đèn sắp cạn nhấp nháy 1 Hz; thanh dầu trên đèn | palette.test (màu mặc định); kiểm tay (xem ai-log) |
