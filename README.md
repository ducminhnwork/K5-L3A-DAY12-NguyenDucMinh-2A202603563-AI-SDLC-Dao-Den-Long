# Đảo Đèn Lồng — Phase 3

> Video demo: _(dán link .mp4 ở Phase 4)_

Game 3D góc nhìn thứ ba. Bạn là **Mây** (nón lá + đèn nhỏ): nhặt đom đóm, nạp vào 5 Đèn Lồng Lớn trên Đảo Bến, tránh **Bóng Mực**.

## Cài và chạy (3 lệnh)
```
git clone <repo> && cd <repo>
npm install
npm start        # mở http://localhost:5173
```
Chạy được trên Windows/macOS/Linux (web). Cần Node 20+.

## Điều khiển
| Phím | Việc |
|---|---|
| W A S D | đi (theo hướng camera) |
| Chuột (nhấp vào màn hình) / ← → | xoay camera |
| Space | nhảy |
| Shift | lướt (14 m/s, 0.2 s, hồi 1.5 s) |
| E | nạp đom đóm vào đèn gần nhất (trong 2 m) |
| F | toả sáng: tốn 3 đom đóm, choáng và đẩy Bóng Mực trong 5 m |
| Esc / P | tạm dừng (Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu) |

## Ba Đêm
1. **Đảo Bến**: 5 đèn, 240 s. 2. **Đảo Cau**: hai đảo nối cầu tre, bục nhảy, Gió Lạc, Bùa Gió, 6 đèn, 270 s. 3. **Đảo Chuông**: 3 tầng, dốc, gió mạnh, 7 đèn, 300 s.
**Mục tiêu:** giữ đảo sáng tới bình minh. Thắng nếu còn sống khi hết giờ và số đèn đang sáng ≥ 60% (3/5, 4/6, 5/7). Không còn thắng sớm. Thắng đủ ba Đêm để thấy Bình Minh; thua thì chơi lại Đêm đó.

## Luật và điểm
- Đom đóm tự nhặt khi lại gần. Sức chứa 10, +2 sau mỗi lần thắp thành công, tối đa 20 (đặt lại mỗi Đêm).
- Đèn cần 10 đom đóm để thắp lần đầu, 5 để thắp lại. Đèn sáng có **dầu** (100), hao 1/s. Bấm E ở đèn đang sáng để **châm dầu** (mỗi đom đóm +10). Hết dầu thì đèn tắt.
- Đèn còn ≥ 30 dầu tạo vùng an toàn 6 m. Dưới 30 thì mất vùng và nhấp nháy; **Bóng Mực** sẽ tới hút 5 dầu/giây.
- Bị Bóng Mực chạm: −1 ngọn lửa, rơi một nửa đom đóm, bất tử 1,5 s. Rơi khỏi đảo: −1 ngọn lửa, mất hết đom đóm, hồi sinh sau 1 s.
- Gió Lạc cướp 3 đom đóm nếu bạn mang ≥ 5; toả sáng trúng nó để buộc nó bỏ chạy hoặc thả lại đồ. Bùa Gió: chạy nhanh hơn và lướt không hồi chiêu trong 10 s.
- Điểm: nạp/châm +5/đom đóm; thắp lần đầu +100; thắp lại +40; toả sáng trúng +5/bóng (+15 nếu bóng đang hút dầu); bình minh (khi thắng) +50 + dầu còn lại cho mỗi đèn sáng và +50/ngọn lửa còn lại.
- Cài đặt có "Bảng màu dễ phân biệt" (mù màu): viền Bóng Mực xanh, cảnh báo trắng kèm ⚠.

## Test và headless
```
npm test                 # 84 test
npm run proof            # chạy scenario thật (gồm hồi quy Phase 2), tất định, hiệu năng; ghi docs/proof/phase-3/
node src/headless.js --seed 1 --night 1 --ticks 600 --out out.jsonl [--scenario f.json] [--inputs f.json] [--snapshot-every 10]
```
Theo Test Contract v1.2 (`game.contract.json`). Lỗi định dạng file → exit 2, thông báo ở stderr. Một Đêm đầy đủ (21 600 tick) chạy khoảng 0,3 s. Số liệu chuẩn ở `src/sim/config.js`; các giả định ở `docs/notes/phase-2-assumptions.md`; spec Phase 2/3 ở `docs/spec-phase-2.md`, `docs/spec-phase-3.md`; quyết định thiết kế ở `docs/adr/`; thay đổi phá vỡ ở `docs/CHANGELOG-phase-3.md`.

## Sáng tạo của tôi
Chỉ ở bản web, không ảnh hưởng headless: bầu trời sao, đom đóm lơ lửng nhấp nhô, đèn lồng đung đưa, nhân vật nhấp nháy khi bất tử, lá bay báo gió, nhạc nền và âm thanh tổng hợp bằng WebAudio (không dùng file ngoài).

## Cấu trúc
`src/sim/` lõi mô phỏng · `src/headless.js` CLI · `src/web/` Three.js · `tests/` · `docs/` · `AGENTS.md`, `.claude/` harness.
