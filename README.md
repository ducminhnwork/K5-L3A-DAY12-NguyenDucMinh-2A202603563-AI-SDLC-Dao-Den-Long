# Đảo Đèn Lồng — Phase 1

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
| ← / → | xoay camera |
| Space | nhảy |
| E | nạp đom đóm vào đèn gần nhất (trong 3 m) |
| F | toả sáng: choáng và đẩy Bóng Mực, tốn 1 đom đóm |
| R | chơi lại |

## Luật & điểm
- Đom đóm tự nhặt khi lại gần (tối đa 5). Một đèn cần 4 đom đóm.
- Đèn sáng tạo vùng an toàn bán kính 5 m, Bóng Mực không vào được.
- Bị Bóng Mực chạm: mất 1 ngọn lửa, rơi một nửa đom đóm, bất tử 1,5 s.
- Thắng: thắp cả 5 đèn. Thua: hết 3 ngọn lửa, hoặc hết 300 s (bình minh).
- Điểm: nhặt +10, thắp đèn +100, choáng +25/bóng; thắng thêm +1/giây còn lại và +50/ngọn lửa còn lại.

## Test và headless
```
npm test
node src/headless.js --seed 1 --night 1 --ticks 600 --out out.jsonl [--scenario f.json] [--inputs f.json] [--snapshot-every 10]
```
Định dạng theo Test Contract v1.0 (`game.contract.json`). Lỗi định dạng file → exit 2, thông báo ở stderr. Bằng chứng chạy thật: `docs/proof/phase-1/` (`npm run proof`).

Tuning trong contract: `fall_enabled=false` (mép đảo là rào vô hình, không rơi). Các giá trị khác là giả định của tôi, xem `docs/notes/phase-1-assumptions.md`.

## Sáng tạo của tôi
Chỉ ở bản web, không ảnh hưởng headless: mây tím trôi quanh đảo, bầu trời sao, đom đóm lơ lửng nhấp nhô, đèn lồng đung đưa, nhân vật nhấp nháy khi bất tử.

## Cấu trúc
`src/sim/` lõi mô phỏng · `src/headless.js` CLI · `src/web/` Three.js · `tests/` · `docs/` · `AGENTS.md`, `.claude/` harness.
