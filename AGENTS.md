# AGENTS.md — Đảo Đèn Lồng

## Quy tắc
- Lõi game ở `src/sim/` KHÔNG import đồ họa/DOM. Hiển thị ở `src/web/`.
- Mọi con số tuning nằm ở `src/sim/config.js`; `game.contract.json` phải khớp (có test).
- Không dùng `Math.random`/thời gian thật trong `src/sim/` (tất định theo seed).
- Không xoá test, không sửa test cho "xanh giả". Test đỏ thì sửa code hoặc ghi rõ vào `docs/notes/`.
- Không commit `.env`/khoá. Không force-push sau khi gắn tag.
- Tính năng sáng tạo chỉ ở `src/web/` và không được đổi output headless.

## Quy tắc thêm ở Phase 2
- Thứ tự xử lý trong một tick là bắt buộc (xem `step()` trong `src/sim/sim.js` và Ticket-02). Không đổi thứ tự mà không cập nhật spec.
- Mọi tính năng mới phải có: (1) test trong `tests/`, (2) một mục trong `scenarios/phase2/manifest.json`, (3) một dòng trong `docs/spec-phase-2.md`.
- Số liệu chuẩn chỉ ở `src/sim/config.js`; bản đồ chỉ ở `src/sim/maps.js`. Web (`src/web/`) không được ghi vào trạng thái của Sim.
- Lỗi agent hay mắc ở repo này: quên truyền tham số (ví dụ `--night`) từ CLI vào lõi; sai dấu/tick lệch 1 trong test. Luôn chạy `npm run proof` trước khi tag.

## Lệnh
- `npm install` · `npm start` · `npm test` · `npm run proof` (sinh `docs/proof/phase-2/`)
- Headless: `node src/headless.js --seed 1 --night 1|2|3 --ticks 600 --out out.jsonl`

## Kỹ năng
- `.claude/skills/headless-verify/SKILL.md`: cách kiểm chứng headless trước khi tag.
