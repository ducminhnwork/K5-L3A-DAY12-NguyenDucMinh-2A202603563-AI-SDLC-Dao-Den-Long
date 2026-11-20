# AGENTS.md — Đảo Đèn Lồng

## Quy tắc
- Lõi game ở `src/sim/` KHÔNG import đồ họa/DOM. Hiển thị ở `src/web/`.
- Mọi con số tuning nằm ở `src/sim/config.js`; `game.contract.json` phải khớp (có test).
- Không dùng `Math.random`/thời gian thật trong `src/sim/` (tất định theo seed).
- Không xoá test, không sửa test cho "xanh giả". Test đỏ thì sửa code hoặc ghi rõ vào `docs/notes/`.
- Không commit `.env`/khoá. Không force-push sau khi gắn tag.
- Tính năng sáng tạo chỉ ở `src/web/` và không được đổi output headless.

## Lệnh
- `npm install` · `npm start` · `npm test` · `npm run proof`
- Headless: `node src/headless.js --seed 1 --night 1 --ticks 600 --out out.jsonl`

## Kỹ năng
- `.claude/skills/headless-verify/SKILL.md`: cách kiểm chứng headless trước khi tag.
