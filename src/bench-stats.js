// Công thức số liệu benchmark (thuần, có test). dts là mảng thời gian mỗi khung hình, đơn vị ms.
export function benchStats(dts) {
  const n = dts.length;
  if (n === 0) return { avg_fps: 0, p1_low_fps: 0, frame_ms_p95: 0, frames: 0 };
  const sum = dts.reduce((a, b) => a + b, 0);
  const desc = [...dts].sort((a, b) => b - a);
  const k = Math.max(1, Math.ceil(0.01 * n));
  const worst = desc.slice(0, k).reduce((a, b) => a + b, 0) / k;
  const asc = [...dts].sort((a, b) => a - b);
  const p95 = asc[Math.min(n - 1, Math.ceil(0.95 * n) - 1)]; // thứ hạng gần nhất (nearest-rank)
  const r2 = (x) => Math.round(x * 100) / 100;
  return { avg_fps: r2((1000 * n) / sum), p1_low_fps: r2(1000 / worst), frame_ms_p95: r2(p95), frames: n };
}
