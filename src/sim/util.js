export const round3 = (v) => {
  const r = Math.round(v * 1000) / 1000;
  return r === 0 ? 0 : r;
};
export const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
export const dist3 = (ax, ay, az, bx, by, bz) => Math.hypot(ax - bx, ay - by, az - bz);
