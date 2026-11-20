// Bản đồ chuẩn (Ticket-02 Phần 2). Góc đo từ +X, điểm = (r cosθ, r sinθ) trên (x, z).
import { TUNING } from './config.js';
import { round3, dist2 } from './util.js';

const rad = (d) => (d * Math.PI) / 180;
const pt = (cx, cz, r, ang, y = 0) => [
  round3(cx + r * Math.cos(rad(ang))),
  y,
  round3(cz + r * Math.sin(rad(ang))),
];
const ring = (cx, cz, r, n, start = 0, y = 0) =>
  Array.from({ length: n }, (_, i) => pt(cx, cz, r, start + (360 / n) * i, y));

function map1() {
  return {
    night: 1,
    name: 'Đảo Bến',
    duration_s: TUNING.night1_duration_s,
    start: [0, 0, 0],
    surfaces: (x, z) => (Math.hypot(x, z) <= 40 ? [0] : []),
    obstacles: [],
    lanterns: [
      ['L1', [0, 0, 25]],
      ['L2', [23.8, 0, 7.7]],
      ['L3', [14.7, 0, -20.2]],
      ['L4', [-14.7, 0, -20.2]],
      ['L5', [-23.8, 0, 7.7]],
    ],
    motePoints: [...ring(0, 0, 12, 8), ...ring(0, 0, 33, 16)],
    shadePoints: ring(0, 0, 37, 12, 15).map((p) => [p[0], p[2]]),
    pads: [],
    charms: [],
    drifters: false,
    wind: false,
  };
}

function map2() {
  const inA = (x, z) => dist2(x, z, 0, 0) <= 28;
  const inB = (x, z) => dist2(x, z, 70, 0) <= 28;
  const bridge = (x, z) => x >= 26 && x <= 44 && Math.abs(z) <= 2;
  const dirTo = (from, to, s) => {
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    const l = Math.hypot(dx, dz);
    return [(dx / l) * s, (dz / l) * s];
  };
  return {
    night: 2,
    name: 'Đảo Cau',
    duration_s: TUNING.night2_duration_s,
    start: [0, 0, 0],
    surfaces: (x, z) => (inA(x, z) || inB(x, z) || bridge(x, z) ? [0] : []),
    obstacles: [],
    lanterns: [
      ['L1', [0, 0, 20]],
      ['L2', [17, 0, -10]],
      ['L3', [-17, 0, -10]],
      ['L4', [70, 0, 20]],
      ['L5', [87, 0, -10]],
      ['L6', [53, 0, -10]],
    ],
    motePoints: [
      ...[0, 70].flatMap((cx) => [...ring(cx, 0, 10, 4), ...ring(cx, 0, 22, 8)]),
    ],
    shadePoints: [0, 70].flatMap((cx) => ring(cx, 0, 26, 8, 22.5).map((p) => [p[0], p[2]])),
    pads: [
      { x: 20, y: 0, z: 18, r: 1, vy: 14, vh: dirTo([20, 18], [70, 0], 24) },
      { x: 50, y: 0, z: -18, r: 1, vy: 14, vh: dirTo([50, -18], [0, 0], 24) },
    ],
    charms: [['C1', [35, 0, 0]]],
    drifters: true,
    wind: false,
  };
}

function map3() {
  const ramps = [30, 150].map((a) => ({ ux: Math.cos(rad(a)), uz: Math.sin(rad(a)) }));
  const surfaces = (x, z) => {
    // Các tầng là khối đặc: tại mỗi (x,z) chỉ có mặt trên cùng (đi vào từ dưới là đâm vào vách).
    const r = Math.hypot(x, z);
    let top = -Infinity;
    if (r <= 45) top = 0;
    if (r >= 12 && r <= 24 && z > 0) top = Math.max(top, 3);
    if (r <= 8) top = Math.max(top, 6);
    for (const { ux, uz } of ramps) {
      const along = x * ux + z * uz;
      const perp = Math.abs(-x * uz + z * ux);
      if (along >= 24 && along <= 30 && perp <= 1.5) top = Math.max(top, (3 * (30 - along)) / 6);
    }
    return top === -Infinity ? [] : [top];
  };
  return {
    night: 3,
    name: 'Đảo Chuông',
    duration_s: TUNING.night3_duration_s,
    start: [0, 0, -30],
    surfaces,
    obstacles: [{ x: 0, z: 0, r: 2, top: 14 }], // tháp chuông: trụ r=2, cao 8 trên tầng 2 (Y=6)
    lanterns: [
      ['L1', [0, 6, 6]],
      ['L2', [18, 3, 10]],
      ['L3', [-18, 3, 10]],
      ['L4', [35, 0, -10]],
      ['L5', [-35, 0, -10]],
      ['L6', [20, 0, -35]],
      ['L7', [-20, 0, -35]],
    ],
    motePoints: [
      ...ring(0, 0, 34, 18, 0, 0),
      ...Array.from({ length: 8 }, (_, i) => pt(0, 0, 18, 20 * (i + 1), 3)),
      ...[45, 135, 225, 315].map((a) => pt(0, 0, 5, a, 6)),
    ],
    shadePoints: ring(0, 0, 43, 16, 0).map((p) => [p[0], p[2]]),
    pads: [{ x: 0, y: 3, z: 13, r: 1, vy: 12, vh: [0, -8] }],
    charms: [
      ['C1', [30, 0, 25]],
      ['C2', [-30, 0, 25]],
    ],
    drifters: true,
    wind: true,
  };
}

export function buildMap(night) {
  if (night === 1) return map1();
  if (night === 2) return map2();
  if (night === 3) return map3();
  throw new Error(`night không hợp lệ: ${night}`);
}
