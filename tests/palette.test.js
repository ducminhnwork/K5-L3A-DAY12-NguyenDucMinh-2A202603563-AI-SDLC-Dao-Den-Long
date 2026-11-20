import test from 'node:test';
import assert from 'node:assert/strict';
import { PAL } from '../src/web/world.js';

// Bảng màu chuẩn của Ticket-02 (Phần 3), kiểm tra các hằng thực sự dùng để dựng cảnh.
const SPEC = {
  sky: 0x0e1430, mist: 0x1b2350, grass: 0x2f5d50, sand: 0xc9b48a, wood: 0x6b4a2f, sea: 0x12384a,
  lampOn: 0xffb347, lampCore: 0xffe9b0, lampOff: 0x5b5f6e, moteCore: 0xfff6c2, moteHalo: 0xffe58a,
  shade: 0x120a1a, shadeRim: 0x7a3cff, shadeStun: 0x3a3450, coat: 0xe8e2d0, scarf: 0xc8102e, gold: 0xf2c14e, drifter: 0x8fa3b8,
};
test('bảng màu khớp Ticket-02 (sai lệch RGB <= 10%)', () => {
  for (const [k, want] of Object.entries(SPEC)) {
    for (const sh of [16, 8, 0]) {
      const a = (PAL[k] >> sh) & 255;
      const b = (want >> sh) & 255;
      assert.ok(Math.abs(a - b) <= 25.5, `${k} kênh ${sh}`);
    }
  }
});
