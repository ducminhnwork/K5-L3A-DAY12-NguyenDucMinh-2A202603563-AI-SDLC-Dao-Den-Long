import { FormatError } from './errors.js';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isBool = (v) => typeof v === 'boolean';
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);

/** Kiểm tra và chuẩn hoá file inputs. Trả về mảng frames đã sắp theo tick. */
export function parseInputs(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new FormatError('inputs: phải là object có trường "frames"');
  }
  if (!Array.isArray(obj.frames)) throw new FormatError('inputs: "frames" phải là mảng');
  let last = -1;
  obj.frames.forEach((f, i) => {
    const where = `inputs.frames[${i}]`;
    if (f === null || typeof f !== 'object' || Array.isArray(f)) {
      throw new FormatError(`${where}: phải là object`);
    }
    if (!Number.isInteger(f.tick) || f.tick < 0) {
      throw new FormatError(`${where}.tick: phải là số nguyên >= 0`);
    }
    if (f.tick <= last) {
      throw new FormatError(`${where}.tick: phải tăng nghiêm ngặt (gặp ${f.tick} sau ${last})`);
    }
    last = f.tick;
    if ('move' in f) {
      if (!Array.isArray(f.move) || f.move.length !== 2 || !f.move.every(isNum)) {
        throw new FormatError(`${where}.move: phải là [x, z]`);
      }
      if (f.move.some((c) => c < -1 || c > 1)) {
        throw new FormatError(`${where}.move: mỗi thành phần phải trong [-1, 1]`);
      }
    }
    if ('cam_yaw_deg' in f && !isNum(f.cam_yaw_deg)) {
      throw new FormatError(`${where}.cam_yaw_deg: phải là số`);
    }
    for (const k of ['jump', 'interact', 'pulse', 'dash']) {
      if (k in f && !isBool(f[k])) throw new FormatError(`${where}.${k}: phải là boolean`);
    }
  });
  return obj.frames;
}

/** Kiểm tra file scenario. Chỉ kiểm tra hình dạng; id đèn lạ sẽ bị Sim từ chối. */
export function parseScenario(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new FormatError('scenario: phải là object');
  }
  if ('player' in obj) {
    const p = obj.player;
    if (p === null || typeof p !== 'object' || Array.isArray(p)) {
      throw new FormatError('scenario.player: phải là object');
    }
    if ('pos' in p && !isVec3(p.pos)) throw new FormatError('scenario.player.pos: phải là [x,y,z]');
    if ('carried' in p && !(Number.isInteger(p.carried) && p.carried >= 0)) {
      throw new FormatError('scenario.player.carried: phải là số nguyên >= 0');
    }
    if ('flames' in p && !(Number.isInteger(p.flames) && p.flames >= 0)) {
      throw new FormatError('scenario.player.flames: phải là số nguyên >= 0');
    }
  }
  for (const k of ['random_motes', 'random_shades']) {
    if (k in obj && !isBool(obj[k])) throw new FormatError(`scenario.${k}: phải là boolean`);
  }
  if ('motes' in obj) {
    if (!Array.isArray(obj.motes) || !obj.motes.every(isVec3)) {
      throw new FormatError('scenario.motes: phải là mảng [x,y,z]');
    }
  }
  if ('shades' in obj) {
    if (!Array.isArray(obj.shades)) throw new FormatError('scenario.shades: phải là mảng');
    obj.shades.forEach((s, i) => {
      if (s === null || typeof s !== 'object' || !isVec3(s.pos)) {
        throw new FormatError(`scenario.shades[${i}].pos: phải là [x,y,z]`);
      }
      if ('id' in s && typeof s.id !== 'string') {
        throw new FormatError(`scenario.shades[${i}].id: phải là chuỗi`);
      }
    });
  }
  if ('lanterns' in obj) {
    if (!Array.isArray(obj.lanterns)) throw new FormatError('scenario.lanterns: phải là mảng');
    obj.lanterns.forEach((l, i) => {
      if (l === null || typeof l !== 'object' || typeof l.id !== 'string') {
        throw new FormatError(`scenario.lanterns[${i}].id: phải là chuỗi`);
      }
      if ('pos' in l && !isVec3(l.pos)) throw new FormatError(`scenario.lanterns[${i}].pos: phải là [x,y,z]`);
      if ('deposited' in l && !(Number.isInteger(l.deposited) && l.deposited >= 0)) {
        throw new FormatError(`scenario.lanterns[${i}].deposited: phải là số nguyên >= 0`);
      }
      if ('lit' in l && !isBool(l.lit)) throw new FormatError(`scenario.lanterns[${i}].lit: phải là boolean`);
    });
  }
  if ('time_left_s' in obj && !(isNum(obj.time_left_s) && obj.time_left_s > 0)) {
    throw new FormatError('scenario.time_left_s: phải là số > 0');
  }
  return obj;
}
