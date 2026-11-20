---
name: headless-verify
description: Kiểm chứng game Đảo Đèn Lồng bằng test và scenario headless trước khi gắn tag phase.
---
1. `npm test` — phải xanh hoàn toàn.
2. `npm run proof` — chạy test + từng scenario trong `scenarios/phase2/manifest.json` (mỗi cái có kỳ vọng thật), kiểm tất định và hiệu năng (một Đêm ≤ 30 s). Thoát khác 0 nếu có gì sai; kết quả ở `docs/proof/phase-N/`.
3. Với tính năng mới: thêm test + mục manifest + dòng spec TRƯỚC khi viết code.
4. Kiểm `game.contract.json` khớp `src/sim/config.js` (test tự kiểm).
5. Chỉ gắn tag khi bằng chứng sinh ra từ đúng commit sắp tag.
