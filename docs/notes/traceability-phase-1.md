# Truy vết yêu cầu → code → test
| Yêu cầu | Code | Test |
|---|---|---|
| 60 tick/s, bước k→k+1 | `src/sim/sim.js` step | sim.test: mô hình tick |
| move chuẩn hoá, yaw | sim.js | chuẩn hoá; cam_yaw_deg=90 |
| frame chỉ đổi trường có mặt | `run.js` | trường vắng mặt giữ giá trị |
| nhặt / nạp / thắp | sim.js | nhặt; nạp đủ; nạp một phần; interact edge |
| toả sáng | sim.js | pulse (3 test) |
| bị chạm / thua | sim.js | bị chạm; hết giờ |
| thắng + điểm | `finish` | thắp hết đèn |
| vùng an toàn | `keepOutOfLight` | safe_radius |
| tất định | `rng.js` | tất định |
| CLI, exit 2, dòng end | `headless.js`, `parse.js` | cli.test |
| contract = tuning | `game.contract.json` | contract khớp TUNING |
| Không có trong Phase 1 | — | — |
