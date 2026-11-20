// Lõi mô phỏng Đảo Đèn Lồng v1.1 - không phụ thuộc đồ họa, 60 tick/giây cố định.
// Bước k đọc input của tick k và tạo trạng thái k+1. Thứ tự xử lý trong tick theo Ticket-02.
import { TUNING, RULES } from './config.js';
import { mulberry32 } from './rng.js';
import { FormatError } from './errors.js';
import { buildMap } from './maps.js';
import { round3, dist2, dist3 } from './util.js';

export const HZ = 60;
export const DT = 1 / HZ;
export { round3 };

const ticksOf = (s) => Math.round(s * HZ);
const EPS = 1e-9;
const U = HZ; // nhiên liệu tính theo đơn vị nguyên 1/60: 100 fuel = 6000 đơn vị
const round1 = (v) => Math.round(v * 10) / 10;
const SHADE_STATES = ['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain'];
const DRIFTER_STATES = ['idle', 'chase', 'flee'];

export const defaultInput = () => ({
  move: [0, 0],
  yawDeg: 0,
  jump: false,
  interact: false,
  pulse: false,
  dash: false,
  pause: false,
});

export class Sim {
  constructor({ seed = 1, night = 1, scenario = {}, bench = false } = {}) {
    this.bench = bench; // chỉ web benchmark: tắt spawn, sát thương, nhặt, hao dầu, kết thúc Đêm
    this.t = TUNING;
    this.R = RULES;
    this.rng = mulberry32(seed);
    this.night = night;
    this.map = buildMap(night);
    this.tick = 0; // mọi bước đã chạy (kể cả khi tạm dừng)
    this.simTick = 0; // chỉ tăng khi không tạm dừng
    this.state = 'playing';
    this.paused = false;
    this.over = false;
    this.score = 0;
    this.events = [];
    this.prev = { jump: false, interact: false, pulse: false, dash: false, pause: false };
    this.counters = { mote: 1, shade: 1, drifter: 1 };

    this.totalTicks = ticksOf(scenario.time_left_s ?? this.map.duration_s);
    this.shadeSpeed = night === 3 ? RULES.shade_speed_night3 : TUNING.shade_speed;
    this.windOn = scenario.wind_enabled ?? this.map.wind;
    this.wind = { active: false, warning: false, dir: 0 };
    this.randomShades = scenario.random_shades !== false;
    this.randomDrifters = (scenario.random_drifters ?? this.map.drifters) === true;

    this.initPlayer(scenario.player ?? {});
    this.initLanterns(scenario.lanterns ?? []);
    this.initMotes(scenario);
    this.initShades(scenario.shades);
    this.initDrifters(scenario.drifters);
    this.initCharms(scenario.charms);
  }

  // ---------- khởi tạo ----------
  initPlayer(p) {
    const pos = p.pos ?? this.map.start;
    this.player = {
      x: pos[0], y: pos[1], z: pos[2],
      vy: 0,
      grounded: false,
      carried: p.carried ?? 0,
      flames: p.flames ?? this.t.flames,
      invuln: p.invuln_ticks ?? 0,
      dashCd: p.dash_cd_ticks ?? 0,
      pulseCd: p.pulse_cd_ticks ?? 0,
      charm: p.charm_ticks ?? 0,
      dashTicks: 0, dashX: 0, dashZ: 1,
      facingX: 0, facingZ: 1,
      launched: false, lvx: 0, lvz: 0,
      respawnWait: 0,
      vel: [0, 0, 0],
      lights: p.successful_lights ?? 0,
    };
    const sup = this.supportAt(pos[0], pos[2], pos[1]);
    this.player.grounded = typeof sup === 'number' && Math.abs(pos[1] - sup) < 1e-6;
  }

  initLanterns(overrides) {
    const full = this.t.fuel_max * U;
    this.lanterns = this.map.lanterns.map(([id, p]) => ({
      id, x: p[0], y: p[1], z: p[2], lit: false, deposited: 0, fuel: 0, everLit: false, relit: 0,
    }));
    for (const o of overrides) {
      const l = this.lanterns.find((x) => x.id === o.id);
      if (!l) throw new FormatError(`scenario.lanterns: không có đèn id "${o.id}" ở Đêm ${this.night}`);
      if (o.pos) [l.x, l.y, l.z] = o.pos;
      if (o.deposited !== undefined) l.deposited = o.deposited;
      let lit = o.lit;
      if (lit === undefined && o.fuel !== undefined) lit = o.fuel > 0;
      if (lit !== undefined) {
        l.lit = lit;
        if (lit) {
          l.fuel = o.fuel !== undefined ? Math.min(full, Math.round(o.fuel * U)) : full;
          l.everLit = true;
          if (l.fuel <= 0) l.lit = false;
        }
      }
      if (o.ever_lit !== undefined) l.everLit = o.ever_lit || l.lit;
      if (l.lit) l.deposited = this.t.lantern_cost;
    }
  }

  get capacity() {
    return Math.min(this.t.capacity_max, this.R.capacity_base + this.R.capacity_per_light * this.player.lights);
  }

  zoneOn(l) {
    return l.lit && l.fuel >= this.t.low_fuel_threshold * U;
  }

  initMotes(sc) {
    this.motes = [];
    if (sc.motes) {
      for (const m of sc.motes) {
        const pos = Array.isArray(m) ? m : m.pos;
        const kind = Array.isArray(m) ? 'random' : m.kind ?? 'random';
        const ttl = kind === 'dropped' ? (Array.isArray(m) ? RULES.drop_ttl_ticks : m.ttl_ticks ?? RULES.drop_ttl_ticks) : null;
        this.addMote(pos[0], pos[1], pos[2], kind, ttl);
      }
    } else if (sc.random_motes !== false) {
      const idx = this.map.motePoints.map((_, i) => i);
      for (let i = 0; i < RULES.mote_initial && i < idx.length; i++) {
        const j = i + Math.floor(this.rng() * (idx.length - i));
        [idx[i], idx[j]] = [idx[j], idx[i]];
        const p = this.map.motePoints[idx[i]];
        this.addMote(p[0], p[1], p[2], 'random', null);
      }
    }
  }

  initShades(list) {
    this.shades = [];
    if (!list) return;
    for (const s of list) {
      const sh = this.addShade(s.pos[0], s.pos[1], s.pos[2], s.id, s.state ?? 'wander', s.state_ticks_left ?? 0, true);
      if (s.target_lantern_id) sh.target = s.target_lantern_id;
    }
  }

  initDrifters(list) {
    this.drifters = [];
    for (const d of list ?? []) {
      let id = d.id;
      if (id === undefined) id = `D${this.counters.drifter++}`;
      else {
        const m = /^D(\d+)$/.exec(id);
        if (m) this.counters.drifter = Math.max(this.counters.drifter, Number(m[1]) + 1);
      }
      this.drifters.push({
        id, x: d.pos[0], y: d.pos[1], z: d.pos[2],
        state: d.state ?? 'idle', stolen: d.stolen ?? 0, stole: (d.stolen ?? 0) > 0,
        fleeTicks: d.state === 'flee' ? d.state_ticks_left ?? RULES.drifter_flee_ticks : 0,
        heading: 0, headTicks: 0,
      });
    }
  }

  initCharms(list) {
    const defs = list
      ? list.map((c, i) => ({ id: c.id ?? `C${i + 1}`, pos: c.pos ?? this.map.charms.find((m) => m[0] === c.id)?.[1] ?? [0, 0, 0], c }))
      : this.map.charms.map(([id, pos]) => ({ id, pos, c: {} }));
    this.charms = defs.map(({ id, pos, c }) => ({
      id, x: pos[0], y: pos[1], z: pos[2],
      available: c.available ?? true,
      respawn: c.respawn_ticks ?? 0,
    }));
  }

  addMote(x, y, z, kind = 'random', ttl = null) {
    const m = { id: `M${this.counters.mote++}`, x, y, z, kind, ttl };
    this.motes.push(m);
    return m;
  }

  addShade(x, y, z, id, state, ticks, fromScenario = false) {
    let sid = id;
    if (sid === undefined) sid = `S${this.counters.shade++}`;
    else {
      const m = /^S(\d+)$/.exec(sid);
      if (m) this.counters.shade = Math.max(this.counters.shade, Number(m[1]) + 1);
    }
    let base;
    if (fromScenario) {
      const sup = this.supportAt(x, z, y);
      base = typeof sup === 'number' ? sup : y - 1;
    } else base = y - 1;
    const s = {
      id: sid, x, y, z, dy: y - base, state, ticks,
      pushTicks: 0, stunPush: 0, dirX: 1, dirZ: 0, heading: 0, headTicks: 0,
      target: null, drainTicks: 0,
    };
    this.shades.push(s);
    return s;
  }

  // ---------- địa hình ----------
  /** null = hư không; -Infinity = bị tường chặn; số = độ cao mặt đứng được. */
  supportAt(x, z, y) {
    const hs = this.map.surfaces(x, z);
    if (hs.length === 0) return null;
    let best = -Infinity;
    for (const h of hs) if (h <= y + this.R.step_tol + EPS && h > best) best = h;
    return best;
  }

  blockedByObstacle(x, z, y) {
    for (const o of this.map.obstacles) if (dist2(x, z, o.x, o.z) < o.r && y < o.top) return true;
    return false;
  }

  canGo(x, z, y, allowVoid) {
    if (this.blockedByObstacle(x, z, y)) return false;
    const s = this.supportAt(x, z, y);
    if (s === -Infinity) return false;
    if (s === null) return allowVoid;
    return true;
  }

  slide(x, z, nx, nz, y, allowVoid) {
    if (this.canGo(nx, nz, y, allowVoid)) return [nx, nz];
    if (this.canGo(nx, z, y, allowVoid)) return [nx, z];
    if (this.canGo(x, nz, y, allowVoid)) return [x, nz];
    return [x, z];
  }

  topHeight(x, z, fallback = 0) {
    const hs = this.map.surfaces(x, z);
    return hs.length ? Math.max(...hs) : fallback;
  }

  get timeLeftS() {
    return round3((this.totalTicks - this.simTick) / HZ);
  }

  emit(name, data) {
    this.events.push({ type: 'event', tick: this.tick, name, data });
  }

  litNear(x, z, r = this.t.safe_radius) {
    return this.lanterns.some((l) => this.zoneOn(l) && dist2(x, z, l.x, l.z) < r - EPS);
  }

  // ---------- một tick ----------
  step(input = defaultInput()) {
    this.events = [];
    if (this.over) return this.events;
    this.tick += 1;
    const p = this.player;
    const edge = {};
    for (const k of ['jump', 'interact', 'pulse', 'dash', 'pause']) {
      edge[k] = !!input[k] && !this.prev[k];
      this.prev[k] = !!input[k];
    }

    // 1) pause
    if (edge.pause) {
      if (this.paused) {
        this.paused = false;
        this.state = 'playing';
        this.emit('resumed', {});
      } else {
        this.paused = true;
        this.state = 'paused';
        this.emit('paused', {});
        return this.events;
      }
    } else if (this.paused) return this.events;
    this.simTick += 1;

    // 2) giảm bộ đếm
    this.updateWind();
    if (p.invuln > 0) p.invuln -= 1;
    if (p.dashCd > 0) p.dashCd -= 1;
    if (p.pulseCd > 0) p.pulseCd -= 1;
    if (p.charm > 0) p.charm -= 1;
    for (const c of this.charms) {
      if (!c.available && c.respawn > 0) {
        c.respawn -= 1;
        if (c.respawn === 0) c.available = true;
      }
    }
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      if (m.kind === 'dropped' && m.ttl !== null) {
        m.ttl -= 1;
        if (m.ttl <= 0) this.motes.splice(i, 1);
      }
    }
    for (const s of this.shades) if (s.ticks > 0) s.ticks -= 1;
    this.updateFuel();

    // 3) di chuyển Mây
    this.movePlayer(input, edge);
    const active = p.respawnWait === 0;

    // 4) nhặt
    if (active && !this.bench) this.pickups();
    // 5) tương tác đèn
    const justLit = [];
    if (active && edge.interact) this.interact(justLit);
    // 6) vùng an toàn
    this.updateSafeZones();
    // 7) tỏa sáng
    if (active && edge.pulse) this.pulse();
    // 8) di chuyển Bóng Mực và Gió Lạc
    this.moveShades();
    this.moveDrifters();
    // 9) chạm
    if (active && !this.bench) this.collisions();
    // 10) sinh
    this.spawns();
    // 11) thắng / thua
    this.checkEnd();
    return this.events;
  }

  /** Bước 2: hao dầu 1/s + bị hút; ngay sau đó đèn fuel <= 0 tắt. */
  updateFuel() {
    if (this.bench) return;
    const decay = (this.t.fuel_decay_per_s * U) / HZ; // đơn vị 1/60 mỗi tick
    for (const l of this.lanterns) if (l.lit) l.fuel -= decay;
    for (const s of this.shades) {
      if (s.state !== 'drain') continue;
      const l = this.lanterns.find((x) => x.id === s.target);
      if (!l || !l.lit) continue;
      l.fuel -= (this.t.drain_per_s * U) / HZ;
      s.drainTicks += 1;
      if (s.drainTicks % HZ === 0) this.emit('fuel_drain', { lantern_id: l.id, shade_id: s.id, fuel: round1(Math.max(0, l.fuel) / U) });
    }
    for (const l of this.lanterns) {
      if (l.lit && l.fuel <= 0) {
        l.lit = false;
        l.fuel = 0;
        l.deposited = 0;
        this.emit('lantern_out', { lantern_id: l.id });
      }
    }
  }

  updateWind() {
    const w = this.wind;
    w.active = false;
    w.warning = false;
    if (!this.windOn) return;
    const P = this.R.wind_period_ticks;
    if (this.simTick > P && (this.simTick - 1) % P < this.R.wind_duration_ticks) w.active = true;
    const toNext = P - (this.simTick % P);
    if (!w.active && this.simTick > 0 && toNext <= this.R.wind_warn_ticks && toNext > 0) w.warning = true;
    if ((this.simTick - 1) % P === P - this.R.wind_warn_ticks) w.dir = round3(this.rng() * 360);
  }

  movePlayer(input, edge) {
    const p = this.player;
    const t = this.t;
    const R = this.R;
    if (p.respawnWait > 0) {
      p.respawnWait -= 1;
      p.vel = [0, 0, 0];
      if (p.respawnWait === 0) {
        [p.x, p.y, p.z] = this.map.start;
        p.vy = 0;
        p.grounded = true;
        p.launched = false;
        p.invuln = R.respawn_invuln_ticks;
      }
      return;
    }
    let mx = input.move[0];
    let mz = input.move[1];
    let len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
      len = 1;
    }
    const th = (input.yawDeg * Math.PI) / 180;
    const wx = mx * Math.cos(th) + mz * Math.sin(th);
    const wz = -mx * Math.sin(th) + mz * Math.cos(th);
    const wl = Math.hypot(wx, wz);
    if (wl > EPS) {
      p.facingX = wx / wl;
      p.facingZ = wz / wl;
    }

    // lướt
    if (edge.dash && p.dashTicks === 0 && (p.dashCd === 0 || p.charm > 0)) {
      p.dashTicks = ticksOf(t.dash_duration_s);
      if (wl > EPS) {
        p.dashX = wx / wl;
        p.dashZ = wz / wl;
      } else {
        p.dashX = p.facingX;
        p.dashZ = p.facingZ;
      }
      p.dashCd = p.charm > 0 ? 0 : ticksOf(t.dash_cooldown_s);
      if (!p.grounded) p.vy = 0;
      this.emit('dash', {});
    }
    const dashing = p.dashTicks > 0;
    // nhảy
    if (edge.jump && p.grounded && !dashing) {
      p.vy = R.jump_velocity;
      p.grounded = false;
    }

    let vx;
    let vz;
    if (dashing) {
      vx = p.dashX * t.dash_speed;
      vz = p.dashZ * t.dash_speed;
      p.dashTicks -= 1;
    } else if (p.launched) {
      vx = p.lvx;
      vz = p.lvz;
    } else {
      const sp = p.charm > 0 ? R.charm_speed : t.player_speed;
      vx = wx * sp;
      vz = wz * sp;
    }
    let ex = vx;
    let ez = vz;
    if (this.wind.active) {
      ex += Math.cos((this.wind.dir * Math.PI) / 180) * R.wind_speed;
      ez += Math.sin((this.wind.dir * Math.PI) / 180) * R.wind_speed;
    }
    [p.x, p.z] = this.slide(p.x, p.z, p.x + ex * DT, p.z + ez * DT, p.y, true);

    // bục nhảy
    if (!p.launched) {
      for (const pad of this.map.pads) {
        if (dist2(p.x, p.z, pad.x, pad.z) <= pad.r + EPS && Math.abs(p.y - pad.y) <= 0.5) {
          p.launched = true;
          [p.lvx, p.lvz] = pad.vh;
          p.vy = pad.vy;
          p.grounded = false;
          break;
        }
      }
    }

    // thẳng đứng
    const s0 = this.supportAt(p.x, p.z, p.y);
    const solid = typeof s0 === 'number' && s0 !== -Infinity;
    if (p.grounded) {
      if (solid && p.y - s0 <= 0.35) p.y = s0;
      else p.grounded = false;
    }
    if (!p.grounded && !dashing) {
      p.vy -= R.gravity * DT;
      const ny = p.y + p.vy * DT;
      if (p.vy <= 0 && solid && ny <= s0) {
        p.y = s0;
        p.vy = 0;
        p.grounded = true;
        p.launched = false;
      } else p.y = ny;
    }
    p.vel = [round3(vx), round3(p.vy), round3(vz)];

    // rơi khỏi đảo
    if (p.y < R.fall_y) {
      p.flames -= 1;
      const lost = p.carried;
      p.carried = 0;
      p.dashTicks = 0;
      p.launched = false;
      p.vy = 0;
      p.grounded = false;
      p.vel = [0, 0, 0];
      p.respawnWait = p.flames > 0 ? R.fall_wait_ticks : 0;
      this.emit('player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
    }
  }

  inReach(p, x, z, y, r, dy) {
    return dist2(p.x, p.z, x, z) <= r + EPS && Math.abs(p.y - y) <= dy + EPS;
  }

  pickups() {
    const p = this.player;
    for (let i = 0; i < this.motes.length && p.carried < this.capacity; ) {
      const m = this.motes[i];
      if (this.inReach(p, m.x, m.z, m.y, this.t.pickup_radius, this.R.pickup_dy)) {
        this.motes.splice(i, 1);
        p.carried += 1;
        this.emit('mote_picked', { carried: p.carried });
      } else i += 1;
    }
    for (const c of this.charms) {
      if (c.available && this.inReach(p, c.x, c.z, c.y, this.t.pickup_radius, this.R.pickup_dy)) {
        c.available = false;
        c.respawn = this.R.charm_respawn_ticks;
        p.charm = this.R.charm_ticks;
        this.emit('charm_picked', { charm_id: c.id, charm_ticks: p.charm });
      }
    }
  }

  interact(justLit) {
    const p = this.player;
    if (p.carried <= 0) return;
    const full = this.t.fuel_max * U;
    let best = null;
    let bestD = Infinity;
    for (const l of this.lanterns) {
      if (l.lit && l.fuel >= full) continue; // đầy dầu: không được chọn
      const d = dist2(p.x, p.z, l.x, l.z);
      if (d <= this.t.interact_radius + EPS && d < bestD - EPS) {
        best = l;
        bestD = d;
      }
    }
    if (!best) return;
    if (best.lit) {
      const used = Math.min(p.carried, Math.ceil((full - best.fuel) / (this.t.fuel_per_mote * U)));
      if (used <= 0) return;
      p.carried -= used;
      best.fuel = Math.min(full, best.fuel + this.t.fuel_per_mote * U * used);
      this.score += used * this.t.score.per_mote;
      this.emit('refuel', { lantern_id: best.id, amount: used, fuel: round1(best.fuel / U) });
      return;
    }
    const cost = best.everLit ? this.t.relight_cost : this.t.lantern_cost;
    const amount = Math.min(p.carried, cost - best.deposited);
    if (amount <= 0) return;
    p.carried -= amount;
    best.deposited += amount;
    this.score += amount * this.t.score.per_mote;
    this.emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
    if (best.deposited >= cost) {
      const relight = best.everLit;
      best.lit = true;
      best.fuel = full;
      best.everLit = true;
      if (relight) best.relit += 1;
      p.lights += 1;
      this.score += relight ? this.t.score.per_relight : this.t.score.per_lantern;
      justLit.push(best);
      this.emit('lantern_lit', { lantern_id: best.id, relight });
    }
  }

  /** Bóng trong vùng sáng bị đẩy ra mép trong tối đa 30 tick; ngoài vùng thì bị chặn ở mép. */
  updateSafeZones() {
    const R6 = this.t.safe_radius;
    for (const s of this.shades) {
      let near = null;
      let nd = Infinity;
      for (const l of this.lanterns) {
        if (!this.zoneOn(l)) continue;
        const d = dist2(s.x, s.z, l.x, l.z);
        if (d < R6 - EPS && d < nd) {
          near = l;
          nd = d;
        }
      }
      if (!near) {
        s.pushTicks = 0;
        continue;
      }
      if (s.pushTicks === 0) s.pushTicks = this.R.safe_push_ticks;
      let ux = 1;
      let uz = 0;
      if (nd > EPS) {
        ux = (s.x - near.x) / nd;
        uz = (s.z - near.z) / nd;
      }
      const move = Math.min(this.R.safe_push_speed * DT, R6 - nd);
      s.x += ux * move;
      s.z += uz * move;
      s.pushTicks -= 1;
      if (s.pushTicks === 0 || R6 - (nd + move) <= EPS) {
        s.x = near.x + ux * R6;
        s.z = near.z + uz * R6;
        s.pushTicks = 0;
      }
    }
  }

  pulse() {
    const p = this.player;
    const t = this.t;
    if (p.pulseCd > 0 || p.carried < t.pulse_cost) return;
    p.carried -= t.pulse_cost;
    p.pulseCd = ticksOf(t.pulse_cooldown_s);
    const cx = p.x;
    const cy = p.y + this.R.pulse_center_dy;
    const cz = p.z;
    const ids = [];
    for (const s of this.shades) {
      if (dist3(cx, cy, cz, s.x, s.y, s.z) <= t.pulse_radius + EPS) {
        ids.push(s.id);
        this.score += s.state === 'drain' ? t.score.per_stun_draining : t.score.per_stun;
        s.state = 'stunned';
        s.ticks = ticksOf(t.pulse_stun_s);
        s.stunPush = this.R.pulse_push_ticks;
        const d = dist2(s.x, s.z, cx, cz);
        if (d > EPS) {
          s.dirX = (s.x - cx) / d;
          s.dirZ = (s.z - cz) / d;
        } else {
          s.dirX = 1;
          s.dirZ = 0;
        }
      }
    }
    for (const d of this.drifters) {
      if (dist3(cx, cy, cz, d.x, d.y, d.z) > t.pulse_radius + EPS) continue;
      if (d.state === 'chase') {
        d.state = 'flee';
        d.fleeTicks = this.R.drifter_flee_ticks;
      } else if (d.state === 'flee' && d.stolen > 0) {
        const amount = d.stolen;
        for (let i = 0; i < amount; i++) {
          this.addMote(round3(d.x), this.topHeight(d.x, d.z, 0), round3(d.z), 'dropped', this.R.drop_ttl_ticks);
        }
        d.stolen = 0;
        d.fleeTicks = Math.min(d.fleeTicks, this.R.drifter_drop_remove_ticks);
        this.emit('drifter_drop', { drifter_id: d.id, amount });
      }
    }
    this.emit('pulse', { stunned_ids: ids });
  }

  shadeBase(s) {
    return s.y - s.dy;
  }

  moveShade(s, dx, dz) {
    const base = this.shadeBase(s);
    const [nx, nz] = this.slide(s.x, s.z, s.x + dx, s.z + dz, base, false);
    s.x = nx;
    s.z = nz;
    const sup = this.supportAt(nx, nz, base);
    if (typeof sup === 'number' && sup !== -Infinity) s.y = sup + s.dy;
  }

  decideChase(s, dp) {
    if (s.state === 'wander' && dp <= this.R.shade_detect + EPS) s.state = 'chase';
    else if (s.state === 'chase' && dp > this.R.shade_lose + EPS) s.state = 'wander';
  }

  moveShades() {
    const p = this.player;
    for (const s of this.shades) {
      if (s.state === 'drain') {
        // đèn hết yếu / tắt / quá xa => thôi hút, kể cả khi đang bị đẩy khỏi vùng sáng
        const tl = this.lanterns.find((x) => x.id === s.target);
        if (!tl || !tl.lit || tl.fuel >= this.t.low_fuel_threshold * U || dist2(s.x, s.z, tl.x, tl.z) > this.R.drain_reach_m + EPS) s.state = 'wander';
      }
      if (s.pushTicks > 0) continue; // đang bị đẩy khỏi vùng sáng
      if (s.state === 'spawning') {
        if (s.ticks === 0) s.state = 'wander';
        else continue;
      }
      if (s.state === 'stunned') {
        if (s.stunPush > 0) {
          const step = this.t.pulse_push_m / this.R.pulse_push_ticks;
          this.moveShade(s, s.dirX * step, s.dirZ * step);
          s.stunPush -= 1;
        }
        if (s.ticks === 0) {
          s.stunPush = 0;
          s.state = 'wander';
        } else {
          this.blockSafe(s);
          continue;
        }
      }
      if (s.state === 'recoil') {
        const step = this.R.recoil_m / this.R.recoil_ticks;
        this.moveShade(s, s.dirX * step, s.dirZ * step);
        if (s.ticks === 0) s.state = 'wander';
        this.blockSafe(s);
        continue;
      }
      let dp = dist2(s.x, s.z, p.x, p.z);
      if (s.state === 'drain') {
        const l = this.lanterns.find((x) => x.id === s.target);
        const d = l ? dist2(s.x, s.z, l.x, l.z) : Infinity;
        if (dp <= this.R.drain_flee_to_chase_m + EPS) {
          s.state = 'chase';
          s.target = null;
        } else if (!l || !l.lit || l.fuel >= this.t.low_fuel_threshold * U || d > this.R.drain_reach_m + EPS) {
          s.state = 'wander';
        } else continue; // đứng yên hút dầu (đã trừ ở bước 2)
      }
      if (!this.bench) this.decideChase(s, dp); // bench: giữ nguyên wander
      if (s.state === 'wander') {
        const low = this.t.low_fuel_threshold * U;
        let tgt = null;
        let td = Infinity;
        for (const l of this.lanterns) {
          if (!l.lit || l.fuel >= low) continue;
          const d = dist2(s.x, s.z, l.x, l.z);
          if (d < td - EPS) { tgt = l; td = d; }
        }
        if (tgt) {
          s.target = tgt.id;
          if (td <= this.R.drain_reach_m + EPS) {
            s.state = 'drain';
            s.drainTicks = 0;
            continue;
          }
          const step = Math.min(this.R.hunt_speed * DT, td);
          this.moveShade(s, ((tgt.x - s.x) / td) * step, ((tgt.z - s.z) / td) * step);
          this.blockSafe(s);
          continue;
        }
        s.target = null;
        let un = null;
        let ud = Infinity;
        for (const l of this.lanterns) {
          if (l.lit) continue;
          const d = dist2(s.x, s.z, l.x, l.z);
          if (d < ud - EPS) { un = l; ud = d; }
        }
        if (un && ud > 1.5) {
          const step = Math.min(this.R.wander_speed * DT, ud);
          this.moveShade(s, ((un.x - s.x) / ud) * step, ((un.z - s.z) / ud) * step);
          this.blockSafe(s);
          continue;
        }
        dp = dist2(s.x, s.z, p.x, p.z);
      }
      if (s.state === 'chase') {
        if (dp > EPS) {
          const step = Math.min(this.shadeSpeed * DT, dp);
          this.moveShade(s, ((p.x - s.x) / dp) * step, ((p.z - s.z) / dp) * step);
        }
      } else if (s.state === 'wander') {
        s.headTicks -= 1;
        if (s.headTicks <= 0) {
          s.heading = this.rng() * Math.PI * 2;
          s.headTicks = this.R.wander_retarget_ticks;
        }
        const step = this.R.wander_speed * DT;
        this.moveShade(s, Math.cos(s.heading) * step, Math.sin(s.heading) * step);
      }
      this.blockSafe(s);
    }
  }

  /** Bóng ở ngoài không được vào mép 6 m của đèn đã sáng. */
  blockSafe(s) {
    if (s.pushTicks > 0) return;
    for (const l of this.lanterns) {
      if (!this.zoneOn(l)) continue;
      const d = dist2(s.x, s.z, l.x, l.z);
      if (d < this.t.safe_radius - EPS) {
        let ux = 1;
        let uz = 0;
        if (d > EPS) {
          ux = (s.x - l.x) / d;
          uz = (s.z - l.z) / d;
        }
        s.x = l.x + ux * this.t.safe_radius;
        s.z = l.z + uz * this.t.safe_radius;
      }
    }
  }

  moveDrifters() {
    const p = this.player;
    const R = this.R;
    for (let i = this.drifters.length - 1; i >= 0; i--) {
      const d = this.drifters[i];
      const dp = dist2(d.x, d.z, p.x, p.z);
      if (d.state === 'idle' || d.state === 'chase') {
        if (p.carried >= R.drifter_carry_min && dp <= R.drifter_detect + EPS) d.state = 'chase';
        else d.state = 'idle';
      }
      if (d.state === 'chase') {
        if (dp > EPS) {
          const step = Math.min(R.drifter_speed * DT, dp);
          d.x += ((p.x - d.x) / dp) * step;
          d.z += ((p.z - d.z) / dp) * step;
        }
      } else if (d.state === 'flee') {
        let ux = 1;
        let uz = 0;
        if (dp > EPS) {
          ux = (d.x - p.x) / dp;
          uz = (d.z - p.z) / dp;
        }
        d.x += ux * R.drifter_speed * DT;
        d.z += uz * R.drifter_speed * DT;
        d.fleeTicks -= 1;
        if (d.fleeTicks <= 0) {
          this.drifters.splice(i, 1);
          continue;
        }
      } else {
        d.headTicks -= 1;
        if (d.headTicks <= 0) {
          d.heading = this.rng() * Math.PI * 2;
          d.headTicks = R.wander_retarget_ticks;
        }
        d.x += Math.cos(d.heading) * R.drifter_idle_speed * DT;
        d.z += Math.sin(d.heading) * R.drifter_idle_speed * DT;
      }
    }
  }

  collisions() {
    const p = this.player;
    const R = this.R;
    for (const d of this.drifters) {
      if (d.state !== 'chase' || d.stole) continue;
      if (dist2(d.x, d.z, p.x, p.z) <= R.drifter_hit_r + EPS && p.carried > 0) {
        const amount = Math.min(R.drifter_steal, p.carried);
        p.carried -= amount;
        d.stolen = amount;
        d.stole = true;
        d.state = 'flee';
        d.fleeTicks = R.drifter_flee_ticks;
        this.emit('drifter_steal', { drifter_id: d.id, amount, carried: p.carried });
      }
    }
    if (p.invuln > 0) return;
    for (const s of [...this.shades].sort((a, b) => cmpId(a.id, b.id))) {
      if (s.state !== 'wander' && s.state !== 'chase') continue;
      if (s.pushTicks > 0) continue;
      if (dist2(p.x, p.z, s.x, s.z) <= this.t.shade_hit_radius + EPS && Math.abs(p.y - s.y) <= R.hit_dy + EPS) {
        p.flames -= 1;
        const dropped = Math.floor(p.carried * this.t.hit_drop_ratio);
        p.carried -= dropped;
        for (let i = 0; i < dropped; i++) {
          const a = (i / dropped) * Math.PI * 2;
          const r = R.drop_r_min + this.rng() * (R.drop_r_max - R.drop_r_min);
          const x = round3(p.x + r * Math.cos(a));
          const z = round3(p.z + r * Math.sin(a));
          const sup = this.supportAt(x, z, p.y);
          this.addMote(x, typeof sup === 'number' && sup !== -Infinity ? sup : p.y, z, 'dropped', R.drop_ttl_ticks);
        }
        p.invuln = ticksOf(this.t.invuln_s);
        const d = dist2(s.x, s.z, p.x, p.z);
        s.dirX = d > EPS ? (s.x - p.x) / d : 1;
        s.dirZ = d > EPS ? (s.z - p.z) / d : 0;
        s.state = 'recoil';
        s.ticks = R.recoil_ticks;
        this.emit('player_hit', { by: 'shade', flames: p.flames, dropped, lost: 0 });
        break;
      }
    }
  }

  spawns() {
    if (this.bench) return;
    const R = this.R;
    // đom đóm
    if (this.simTick % R.mote_spawn_ticks === 0 && this.motes.length < R.mote_cap) {
      const free = this.map.motePoints.filter((q) => !this.motes.some((m) => Math.abs(m.x - q[0]) < 0.01 && Math.abs(m.z - q[2]) < 0.01));
      if (free.length) {
        const q = free[Math.floor(this.rng() * free.length)];
        this.addMote(q[0], q[1], q[2], 'random', null);
      }
    }
    // Bóng Mực
    if (this.randomShades) {
      const iv = R.shade_intervals_ticks[this.night - 1];
      let n = 0;
      if (this.simTick === R.shade_first_spawn_tick) n = R.shade_first_spawn_count;
      else if (this.simTick > R.shade_first_spawn_tick && (this.simTick - R.shade_first_spawn_tick) % iv === 0) n = 1;
      for (let i = 0; i < n && this.shades.length < R.shade_max[this.night - 1]; i++) this.spawnShade();
    }
    // Gió Lạc
    if (this.randomDrifters && this.simTick > 0 && this.simTick % R.drifter_spawn_ticks === 0 && this.drifters.length < R.drifter_max) {
      const q = this.map.shadePoints[Math.floor(this.rng() * this.map.shadePoints.length)];
      this.drifters.push({
        id: `D${this.counters.drifter++}`,
        x: q[0], y: this.topHeight(q[0], q[1], 0) + 1.5, z: q[1],
        state: 'idle', stolen: 0, stole: false, fleeTicks: 0, heading: 0, headTicks: 0,
      });
    }
  }

  spawnShade() {
    const p = this.player;
    const valid = this.map.shadePoints.filter(
      (q) =>
        dist2(q[0], q[1], p.x, p.z) >= this.R.shade_spawn_dist_min &&
        !this.litNear(q[0], q[1]) &&
        !this.shades.some((s) => dist2(s.x, s.z, q[0], q[1]) < 1)
    );
    if (!valid.length) return;
    const q = valid[Math.floor(this.rng() * valid.length)];
    const base = this.topHeight(q[0], q[1], 0);
    const s = this.addShade(q[0], base + 1, q[1], undefined, 'spawning', this.R.spawning_ticks);
    this.emit('shade_spawned', { id: s.id });
  }

  /** Sau mọi cập nhật của tick: hết Ngọn Lửa luôn thua trước; thắng chỉ ở bình minh. */
  checkEnd() {
    if (this.bench) return undefined;
    const p = this.player;
    if (p.flames <= 0) return this.finish('lost', 'no_flames');
    if (this.simTick >= this.totalTicks) {
      const need = Math.ceil(this.t.win_ratio * this.lanterns.length - 1e-9);
      const lit = this.lanterns.filter((l) => l.lit).length;
      return lit >= need ? this.finish('won', 'dawn_survived') : this.finish('lost', 'dawn');
    }
    return undefined;
  }

  finish(result, reason) {
    if (result === 'won') {
      for (const l of this.lanterns) if (l.lit) this.score += this.t.score.per_lit_lantern_dawn + Math.floor(l.fuel / U + EPS);
      this.score += this.t.score.per_flame_left * this.player.flames;
    }
    this.state = result;
    this.over = true;
    this.emit('game_over', { result, reason });
  }

  // ---------- đầu ra ----------
  snapshot() {
    const p = this.player;
    const r3 = (a) => a.map(round3);
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.simTick,
      state: this.state,
      night: this.night,
      time_left_s: this.timeLeftS,
      score: this.score,
      wind: { active: this.wind.active, dir_deg: this.wind.dir },
      player: {
        pos: r3([p.x, p.y, p.z]),
        vel: r3(p.vel),
        grounded: p.grounded,
        flames: p.flames,
        carried: p.carried,
        capacity: this.capacity,
        invuln: p.invuln > 0,
        dash_cd_s: round3(p.dashCd / HZ),
        pulse_cd_s: round3(p.pulseCd / HZ),
        charm_s: round3(p.charm / HZ),
      },
      lanterns: this.lanterns.map((l) => ({
        id: l.id,
        pos: r3([l.x, l.y, l.z]),
        lit: l.lit,
        deposited: l.deposited,
        fuel: l.lit ? round1(l.fuel / U) : 0,
        ever_lit: l.everLit,
        relit_count: l.relit,
      })),
      shades: this.shades.map((s) => ({
        id: s.id,
        pos: r3([s.x, s.y, s.z]),
        state: s.state,
        state_ticks_left: s.ticks,
        target_lantern_id: s.target,
      })),
      motes_active: this.motes.length,
      motes: this.motes.map((m) => ({
        id: m.id,
        pos: r3([m.x, m.y, m.z]),
        kind: m.kind,
        ttl_s: m.ttl === null ? null : round3(m.ttl / HZ),
      })),
      drifters: this.drifters.map((d) => ({ id: d.id, pos: r3([d.x, d.y, d.z]), state: d.state, stolen: d.stolen })),
      charms: this.charms.map((c) => ({ id: c.id, pos: r3([c.x, c.y, c.z]), available: c.available, respawn_s: round3(c.respawn / HZ) })),
    };
  }

  end() {
    return { type: 'end', ticks: this.tick, state: this.over ? this.state : 'playing', score: this.score };
  }
}

function cmpId(a, b) {
  const na = Number(a.replace(/\D/g, ''));
  const nb = Number(b.replace(/\D/g, ''));
  return na - nb || (a < b ? -1 : 1);
}

export { SHADE_STATES, DRIFTER_STATES };
