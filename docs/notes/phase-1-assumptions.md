# Giả định Phase 1
PRD-0 và Contract không cho số cụ thể, nên tôi chọn các giá trị sau (đều nằm trong `game.contract.json`):
- Tốc độ 6 m/s; mang tối đa 5; đèn cần 4; nhặt 1,5 m; nạp trong 3 m; toả sáng tốn 1 đom đóm, bán kính 8 m, choáng 3 s, đẩy 4 m, hồi 1,5 s.
- 3 ngọn lửa; bất tử 1,5 s; rơi 50% đom đóm; đêm 300 s; vùng an toàn 5 m quanh đèn ĐÃ SÁNG; Bóng Mực 3,5 m/s, chạm trong 1,2 m.
- `fall_enabled=false`: mép đảo (bán kính 50) có rào vô hình.
- Điểm: 10 / 100 / 25 / 1 / 50.
Giả định thêm (không có trong contract):
- 5 đèn trên vòng bán kính 25 m, L1 ở (0,0,25), cách đều 72°; 28 đom đóm ngẫu nhiên; 2 Bóng Mực ban đầu; sinh thêm mỗi 20 s tới tối đa 4 (sự kiện `shade_spawned`).
- Nhảy chỉ đổi Y; mọi khoảng cách tính trên XZ.
- Thứ tự kết thúc: thắng > hết lửa > bình minh.
- Thưởng thời gian dùng phần nguyên giây còn lại.
- Pulse phát sự kiện kể cả khi không choáng ai; `player_hit.dropped` = floor(carried × 0.5).
- Snapshot chỉ ở bội số của `--snapshot-every` từ tick 0, không có snapshot cuối thêm.
- id lạ trong scenario.lanterns → exit 2.
Rủi ro: hidden test có thể kỳ vọng số khác (nhất là hướng/vị trí đèn, thời điểm sinh bóng). Đã ghi để sửa ở Phase sau.
