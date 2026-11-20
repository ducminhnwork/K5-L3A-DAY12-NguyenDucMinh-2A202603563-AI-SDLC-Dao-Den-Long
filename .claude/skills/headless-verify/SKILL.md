---
name: headless-verify
description: Kiểm chứng game Đảo Đèn Lồng bằng test và chạy headless trước khi gắn tag phase.
---
1. `npm test` — phải xanh hoàn toàn.
2. `npm run proof` — sinh `docs/proof/phase-N/` từ lần chạy thật.
3. Chạy headless hai lần cùng seed, so sánh file byte-by-byte.
4. Kiểm `game.contract.json` khớp `src/sim/config.js`.
5. Chỉ gắn tag khi bằng chứng khớp commit.
