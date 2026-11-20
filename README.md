# Đảo Đèn Lồng — Phase 2

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
1. **Đảo Bến**: 5 đèn, 300 s. 2. **Đảo Cau**: hai đảo nối cầu tre, bục nhảy, Gió Lạc, Bùa Gió, 6 đèn, 330 s. 3. **Đảo Chuông**: 3 tầng, dốc, gió mạnh, 7 đèn, 360 s.
Thắng đủ ba Đêm để thấy Bình Minh; thua thì chơi lại Đêm đó.

## Luật và điểm
- Đom đóm tự nhặt khi lại gần (tối đa 10). Một đèn cần 10 đom đóm, nạp nhiều lần được.
- Đèn sáng tạo vùng an toàn 6 m; Bóng Mực không vào được.
- Bị Bóng Mực chạm: −1 ngọn lửa, rơi một nửa đom đóm, bất tử 1,5 s. Rơi khỏi đảo: −1 ngọn lửa, mất hết đom đóm, hồi sinh sau 1 s.
- Gió Lạc cướp 3 đom đóm nếu bạn mang ≥ 5; toả sáng trúng nó để buộc nó bỏ chạy hoặc thả lại đồ. Bùa Gió: chạy nhanh hơn và lướt không hồi chiêu trong 10 s.
- Điểm: nạp +10/đom đóm, thắp đèn +100, toả sáng trúng +5/bóng; thắng thêm +2/giây còn lại và +50/ngọn lửa còn lại. Tổng điểm game = tổng điểm các Đêm đã thắng.

## Test và headless
```
npm test                 # 64 test
npm run proof            # chạy scenario thật, tất định, hiệu năng; ghi docs/proof/phase-2/
node src/headless.js --seed 1 --night 1 --ticks 600 --out out.jsonl [--scenario f.json] [--inputs f.json] [--snapshot-every 10]
```
Theo Test Contract v1.1 (`game.contract.json`). Lỗi định dạng file → exit 2, thông báo ở stderr. Một Đêm đầy đủ (21 600 tick) chạy khoảng 0,3 s. Số liệu chuẩn ở `src/sim/config.js`; các giả định ở `docs/notes/phase-2-assumptions.md`; spec + tiêu chí nghiệm thu ở `docs/spec-phase-2.md`.

## Sáng tạo của tôi
Chỉ ở bản web, không ảnh hưởng headless: bầu trời sao, đom đóm lơ lửng nhấp nhô, đèn lồng đung đưa, nhân vật nhấp nháy khi bất tử, lá bay báo gió, nhạc nền và âm thanh tổng hợp bằng WebAudio (không dùng file ngoài).

## Cấu trúc
`src/sim/` lõi mô phỏng · `src/headless.js` CLI · `src/web/` Three.js · `tests/` · `docs/` · `AGENTS.md`, `.claude/` harness.
