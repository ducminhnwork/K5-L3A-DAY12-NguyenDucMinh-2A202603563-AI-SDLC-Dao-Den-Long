import { FormatError } from './errors.js';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isBool = (v) => typeof v === 'boolean';
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);
const isNat = (v) => Number.isInteger(v) && v >= 0;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Kiểm tra file inputs (contract v1.1). Trả về mảng frames. */
export function parseInputs(obj) {
  if (!isObj(obj)) throw new FormatError('inputs: phải là object có trường "frames"');
  if (!Array.isArray(obj.frames)) throw new FormatError('inputs: "frames" phải là mảng');
  let last = -1;
  obj.frames.forEach((f, i) => {
    const where = `inputs.frames[${i}]`;
    if (!isObj(f)) throw new FormatError(`${where}: phải là object`);
    if (!Number.isInteger(f.tick) || f.tick < 0) throw new FormatError(`${where}.tick: phải là số nguyên >= 0`);
    if (f.tick <= last) throw new FormatError(`${where}.tick: phải tăng nghiêm ngặt (gặp ${f.tick} sau ${last})`);
    last = f.tick;
    if ('move' in f) {
      if (!Array.isArray(f.move) || f.move.length !== 2 || !f.move.every(isNum)) {
        throw new FormatError(`${where}.move: phải là [x, z]`);
      }
      if (f.move.some((c) => c < -1 || c > 1)) throw new FormatError(`${where}.move: mỗi thành phần phải trong [-1, 1]`);
    }
    if ('cam_yaw_deg' in f && !isNum(f.cam_yaw_deg)) throw new FormatError(`${where}.cam_yaw_deg: phải là số`);
    for (const k of ['jump', 'interact', 'pulse', 'dash', 'pause']) {
      if (k in f && !isBool(f[k])) throw new FormatError(`${where}.${k}: phải là boolean`);
    }
  });
  return obj.frames;
}

const SHADE_STATES = ['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain'];
const DRIFTER_STATES = ['idle', 'chase', 'flee'];

/** Kiểm tra hình dạng file scenario (contract v1.1). Id đèn lạ sẽ bị Sim từ chối (exit 2). */
export function parseScenario(obj) {
  if (!isObj(obj)) throw new FormatError('scenario: phải là object');
  if ('player' in obj) {
    const p = obj.player;
    if (!isObj(p)) throw new FormatError('scenario.player: phải là object');
    if ('pos' in p && !isVec3(p.pos)) throw new FormatError('scenario.player.pos: phải là [x,y,z]');
    for (const k of ['carried', 'flames', 'invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks', 'successful_lights']) {
      if (k in p && !isNat(p[k])) throw new FormatError(`scenario.player.${k}: phải là số nguyên >= 0`);
    }
  }
  for (const k of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) {
    if (k in obj && !isBool(obj[k])) throw new FormatError(`scenario.${k}: phải là boolean`);
  }
  if ('motes' in obj) {
    if (!Array.isArray(obj.motes)) throw new FormatError('scenario.motes: phải là mảng');
    obj.motes.forEach((m, i) => {
      const ok = isVec3(m) || (isObj(m) && isVec3(m.pos) && (m.kind === undefined || ['random', 'dropped'].includes(m.kind)));
      if (!ok) throw new FormatError(`scenario.motes[${i}]: phải là [x,y,z] hoặc {pos,kind?,ttl_ticks?}`);
    });
  }
  if ('shades' in obj) {
    if (!Array.isArray(obj.shades)) throw new FormatError('scenario.shades: phải là mảng');
    obj.shades.forEach((s, i) => {
      const w = `scenario.shades[${i}]`;
      if (!isObj(s) || !isVec3(s.pos)) throw new FormatError(`${w}.pos: phải là [x,y,z]`);
      if ('id' in s && typeof s.id !== 'string') throw new FormatError(`${w}.id: phải là chuỗi`);
      if ('state' in s && !SHADE_STATES.includes(s.state)) throw new FormatError(`${w}.state: phải thuộc ${SHADE_STATES.join('/')}`);
      if ('state_ticks_left' in s && !isNat(s.state_ticks_left)) throw new FormatError(`${w}.state_ticks_left: phải là số nguyên >= 0`);
      if ('target_lantern_id' in s && typeof s.target_lantern_id !== 'string') throw new FormatError(`${w}.target_lantern_id: phải là chuỗi`);
    });
  }
  if ('drifters' in obj) {
    if (!Array.isArray(obj.drifters)) throw new FormatError('scenario.drifters: phải là mảng');
    obj.drifters.forEach((d, i) => {
      const w = `scenario.drifters[${i}]`;
      if (!isObj(d) || !isVec3(d.pos)) throw new FormatError(`${w}.pos: phải là [x,y,z]`);
      if ('id' in d && typeof d.id !== 'string') throw new FormatError(`${w}.id: phải là chuỗi`);
      if ('state' in d && !DRIFTER_STATES.includes(d.state)) throw new FormatError(`${w}.state: phải thuộc ${DRIFTER_STATES.join('/')}`);
      if ('stolen' in d && !isNat(d.stolen)) throw new FormatError(`${w}.stolen: phải là số nguyên >= 0`);
    });
  }
  if ('charms' in obj) {
    if (!Array.isArray(obj.charms)) throw new FormatError('scenario.charms: phải là mảng');
    obj.charms.forEach((c, i) => {
      const w = `scenario.charms[${i}]`;
      if (!isObj(c) || typeof c.id !== 'string') throw new FormatError(`${w}.id: phải là chuỗi`);
      if ('pos' in c && !isVec3(c.pos)) throw new FormatError(`${w}.pos: phải là [x,y,z]`);
      if ('available' in c && !isBool(c.available)) throw new FormatError(`${w}.available: phải là boolean`);
      if ('respawn_ticks' in c && !isNat(c.respawn_ticks)) throw new FormatError(`${w}.respawn_ticks: phải là số nguyên >= 0`);
    });
  }
  if ('lanterns' in obj) {
    if (!Array.isArray(obj.lanterns)) throw new FormatError('scenario.lanterns: phải là mảng');
    obj.lanterns.forEach((l, i) => {
      const w = `scenario.lanterns[${i}]`;
      if (!isObj(l) || typeof l.id !== 'string') throw new FormatError(`${w}.id: phải là chuỗi`);
      if ('pos' in l && !isVec3(l.pos)) throw new FormatError(`${w}.pos: phải là [x,y,z]`);
      if ('deposited' in l && !isNat(l.deposited)) throw new FormatError(`${w}.deposited: phải là số nguyên >= 0`);
      if ('lit' in l && !isBool(l.lit)) throw new FormatError(`${w}.lit: phải là boolean`);
      if ('ever_lit' in l && !isBool(l.ever_lit)) throw new FormatError(`${w}.ever_lit: phải là boolean`);
      if ('fuel' in l && !(isNum(l.fuel) && l.fuel >= 0 && l.fuel <= 100)) throw new FormatError(`${w}.fuel: phải là số trong [0, 100]`);
    });
  }
  if ('time_left_s' in obj && !(isNum(obj.time_left_s) && obj.time_left_s > 0)) {
    throw new FormatError('scenario.time_left_s: phải là số > 0');
  }
  return obj;
}
