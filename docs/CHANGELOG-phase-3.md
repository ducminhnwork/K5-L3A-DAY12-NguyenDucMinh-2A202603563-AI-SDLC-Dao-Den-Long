# Changelog Phase 3 (Ticket-03 "Đèn cạn dầu", contract v1.2)

## Thay đổi phá vỡ tương thích (breaking)
| Thay đổi | Trước (Phase 2) | Sau (Phase 3) |
|---|---|---|
| Luật thắng | Thắng ngay khi tất cả đèn sáng (`all_lit`) | Thắng chỉ ở bình minh nếu còn sống và đèn sáng ≥ ceil(0.6×tổng) (`dawn_survived`); `all_lit` không dùng nữa |
| Thời lượng Đêm 1/2/3 | 300 / 330 / 360 s | 240 / 270 / 300 s |
| Đèn đã sáng | Không nhận đom đóm | Có dầu (tối đa 100), hao 1/s, tương tác = châm dầu (`refuel`), hết dầu thì tắt (`lantern_out`) |
| Vùng an toàn | Đèn đã sáng luôn có | Chỉ khi fuel ≥ 30 |
| Bóng Mực | 5 trạng thái | Thêm `drain` (hút 5 fuel/s) |
| Chi phí thắp | 10 | 10 lần đầu, 5 khi thắp lại (đèn từng sáng) |
| Sức chứa | 10 cố định | 10 + 2×lần thắp thành công, tối đa 20 |
| Điểm | +10/đom đóm nạp, +100/đèn, +5/bóng, +2/giây, +50/lửa | +5/đom đóm nạp (cả châm dầu), +100 lần đầu, +40 thắp lại, +5 (+15 nếu drain)/bóng, bình minh +50+floor(fuel)/đèn sáng và +50/lửa; bỏ thưởng thời gian |
| Contract | v1.1 | v1.2: thêm khoá tuning (fuel_*, relight_cost, win_ratio, drain_per_s, low_fuel_threshold, capacity_max); snapshot thêm `fuel`, `ever_lit`, `relit_count`, `player.capacity`, `shades[].target_lantern_id`; sự kiện `refuel`, `lantern_out`, `fuel_drain`; `lantern_lit.relight`; scenario thêm `fuel`, `ever_lit`, `successful_lights`, `target_lantern_id` |
| `tuning.score` | `per_second_left: 2` | `per_second_left: 0`; thêm `per_relight`, `per_stun_draining`, `per_lit_lantern_dawn` |

## Test cũ bị đổi (không có test nào bị skip)
| Test | Hành động | Lý do |
|---|---|---|
| cli: contract khớp TUNING | sửa `contract_version` 1.1 → 1.2 | contract đổi version |
| sim: tick model | sửa `time_left_s` 300 → 240 | Đêm 1 ngắn lại |
| maps: Đêm 2 / Đêm 3 thời lượng | sửa 330→270, 360→300 | thời lượng đổi |
| sim: đèn chi phí 10... | sửa điểm 10×10+100 → 10×5+100 | +5/đom đóm nạp |
| sim: đèn bán kính 2.0... | sửa kỳ vọng: đèn sáng chưa đầy dầu **được chọn** (refuel) thay vì bị bỏ qua | luật "đèn đã sáng không nhận" bị thay |
| sim: "thắng: tất cả đèn sáng..." | **thay** bằng 4 test Ticket-03 (không thắng sớm; thắng ở bình minh + điểm; ngưỡng 3/5, 4/6, 5/7; no_flames ở tick bình minh) | luật thắng bị thay |
| sim: "thắng đúng tick hết giờ vẫn là thắng..." | **thay** (gộp vào test ngưỡng bình minh) | luật thắng bị thay |
| scenarios/phase2 `win-night1` | đổi kỳ vọng thành `lantern_lit` + không `game_over` | không còn thắng sớm; bản mới ở `scenarios/phase3` |

Mọi test Phase 1–2 còn lại giữ nguyên và vẫn đạt (84 test, gồm 18 test mới ở `tests/fuel.test.js`).
