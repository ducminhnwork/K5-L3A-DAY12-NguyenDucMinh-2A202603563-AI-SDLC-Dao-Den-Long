// Lõi mô phỏng Đảo Đèn Lồng - KHÔNG phụ thuộc đồ họa, chạy 60 tick/giây cố định.
// Mô hình tick: bước k đọc input của tick k và tạo ra trạng thái k+1.
import { TUNING, WORLD } from './config.js';
import { mulberry32 } from './rng.js';
import { FormatError } from './errors.js';

export const HZ = 60;
export const DT = 1 / HZ;

export const round3 = (v) => {
  const r = Math.round(v * 1000) / 1000;
  return r === 0 ? 0 : r;
};
const ticksOf = (seconds) => Math.round(seconds * HZ);
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

export const defaultInput = () => ({
  move: [0, 0],
  yawDeg: 0,
  jump: false,
  interact: false,
  pulse: false,
});

export class Sim {
  /**
   * @param {object} opts
   * @param {number} opts.seed
   * @param {object} [opts.scenario] đã qua parseScenario
   * @param {object} [opts.tuning]
   * @param {object} [opts.world]
   */
  constructor({ seed = 1, scenario = {}, tuning = TUNING, world = WORLD } = {}) {
    this.t = tuning;
    this.w = world;
    this.rng = mulberry32(seed);
    this.tick = 0; // số bước đã chạy (= sim_tick ở Phase 1)
    this.state = 'playing';
    this.score = 0;
    this.events = []; // sự kiện của bước vừa chạy
    this.prev = { jump: false, interact: false, pulse: false };
    this.nextMote = 1;
    this.nextShade = 1;

    // thời gian đêm
    const base = scenario.time_left_s ?? tuning.night1_duration_s;
    this.totalTicks = ticksOf(base);

    // người chơi
    const p = scenario.player ?? {};
    const pos = p.pos ?? [0, 0, 0];
    this.player = {
      x: pos[0],
      y: pos[1],
      z: pos[2],
      vy: 0,
      carried: p.carried ?? 0,
      flames: p.flames ?? tuning.flames,
      invuln: 0, // tick còn bất tử
      cooldown: 0, // tick còn hồi chiêu pulse
    };

    // đèn lồng: vòng tròn mặc định L1..L5
    this.lanterns = [];
    for (let i = 0; i < tuning.lantern_count_night1; i++) {
      const phi = (i * 2 * Math.PI) / tuning.lantern_count_night1;
      this.lanterns.push({
        id: `L${i + 1}`,
        x: round3(world.lantern_ring_radius * Math.sin(phi)),
        y: 0,
        z: round3(world.lantern_ring_radius * Math.cos(phi)),
        lit: false,
        deposited: 0,
      });
    }
    for (const o of scenario.lanterns ?? []) {
      const l = this.lanterns.find((x) => x.id === o.id);
      if (!l) throw new FormatError(`scenario.lanterns: không có đèn id "${o.id}"`);
      if (o.pos) [l.x, l.y, l.z] = o.pos;
      if (o.deposited !== undefined) l.deposited = o.deposited;
      if (o.lit !== undefined) {
        l.lit = o.lit;
        if (o.lit && o.deposited === undefined) l.deposited = tuning.lantern_cost;
      }
    }

    // đom đóm
    this.motes = [];
    if (scenario.motes) {
      for (const m of scenario.motes) this.addMote(m[0], m[2]);
    } else if (scenario.random_motes !== false) {
      for (let i = 0; i < world.random_motes; i++) {
        const [x, z] = this.randomSpot(world.island_radius - 6, 4);
        this.addMote(x, z);
      }
    }

    // Bóng Mực
    this.randomShades = scenario.random_shades !== false;
    this.shades = [];
    if (scenario.shades) {
      for (const s of scenario.shades) this.addShade(s.pos[0], s.pos[1], s.pos[2], s.id);
    } else if (this.randomShades) {
      for (let i = 0; i < world.initial_shades; i++) {
        const [x, z] = this.randomSpot(world.shade_spawn_radius, world.shade_spawn_radius * 0.5);
        this.addShade(x, world.shade_y, z);
      }
    }
    this.spawnTimer = ticksOf(world.shade_spawn_interval_s);
  }

  addMote(x, z) {
    this.motes.push({ id: `M${this.nextMote++}`, x, z });
  }

  addShade(x, y, z, id) {
    let sid = id;
    if (sid === undefined) sid = `S${this.nextShade++}`;
    else {
      const m = /^S(\d+)$/.exec(sid);
      if (m) this.nextShade = Math.max(this.nextShade, Number(m[1]) + 1);
    }
    const s = { id: sid, x, y, z, state: 'chase', stun: 0 };
    this.shades.push(s);
    return s;
  }

  /** Điểm ngẫu nhiên đều trong hình vành khăn [rMin, rMax]. */
  randomSpot(rMax, rMin = 0) {
    const a = this.rng() * 2 * Math.PI;
    const r = Math.sqrt(rMin * rMin + this.rng() * (rMax * rMax - rMin * rMin));
    return [round3(r * Math.sin(a)), round3(r * Math.cos(a))];
  }

  get timeLeftS() {
    return round3((this.totalTicks - this.tick) / HZ);
  }

  emit(name, data) {
    this.events.push({ type: 'event', tick: this.tick, name, data });
  }

  /** Chạy một bước với input của tick hiện tại. Trả về danh sách sự kiện của bước. */
  step(input = defaultInput()) {
    this.events = [];
    if (this.state !== 'playing') return this.events;
    const { t, w, player } = this;
    this.tick += 1;

    const edge = {
      jump: input.jump && !this.prev.jump,
      interact: input.interact && !this.prev.interact,
      pulse: input.pulse && !this.prev.pulse,
    };
    this.prev = { jump: !!input.jump, interact: !!input.interact, pulse: !!input.pulse };

    // 1) di chuyển
    let [mx, mz] = input.move;
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    const th = (input.yawDeg * Math.PI) / 180;
    const dx = mx * Math.cos(th) + mz * Math.sin(th);
    const dz = -mx * Math.sin(th) + mz * Math.cos(th);
    const oldDist = Math.hypot(player.x, player.z);
    let nx = player.x + dx * t.player_speed * DT;
    let nz = player.z + dz * t.player_speed * DT;
    const limit = Math.max(w.island_radius, oldDist); // rào chắn mép đảo (fall_enabled = false)
    const nd = Math.hypot(nx, nz);
    if (nd > limit) {
      nx *= limit / nd;
      nz *= limit / nd;
    }
    player.x = nx;
    player.z = nz;

    // nhảy (chỉ thay đổi Y, mọi khoảng cách tính trên mặt phẳng XZ)
    if (edge.jump && player.y === 0 && player.vy === 0) player.vy = w.jump_velocity;
    if (player.y > 0 || player.vy !== 0) {
      player.vy -= w.gravity * DT;
      player.y += player.vy * DT;
      if (player.y <= 0) {
        player.y = 0;
        player.vy = 0;
      }
    }

    if (player.invuln > 0) player.invuln -= 1;
    if (player.cooldown > 0) player.cooldown -= 1;

    // 2) tương tác: nạp đom đóm vào đèn gần nhất chưa sáng
    if (edge.interact && player.carried > 0) {
      let best = null;
      let bestD = Infinity;
      for (const l of this.lanterns) {
        if (l.lit) continue;
        const d = dist2(player.x, player.z, l.x, l.z);
        if (d <= t.interact_radius && d < bestD) {
          best = l;
          bestD = d;
        }
      }
      if (best) {
        const amount = Math.min(player.carried, t.lantern_cost - best.deposited);
        if (amount > 0) {
          player.carried -= amount;
          best.deposited += amount;
          this.emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
          if (best.deposited >= t.lantern_cost) {
            best.lit = true;
            this.score += t.score.per_lantern;
            this.emit('lantern_lit', { lantern_id: best.id });
          }
        }
      }
    }

    // 3) tỏa sáng (pulse)
    if (edge.pulse && player.cooldown === 0 && player.carried >= t.pulse_cost) {
      player.carried -= t.pulse_cost;
      player.cooldown = ticksOf(t.pulse_cooldown_s);
      const stunned = [];
      for (const s of this.shades) {
        const d = dist2(player.x, player.z, s.x, s.z);
        if (d <= t.pulse_radius) {
          stunned.push(s.id);
          s.state = 'stunned';
          s.stun = ticksOf(t.pulse_stun_s);
          // đẩy ra xa người chơi theo phương ngang
          let ux = 1;
          let uz = 0;
          if (d > 1e-9) {
            ux = (s.x - player.x) / d;
            uz = (s.z - player.z) / d;
          }
          s.x += ux * t.pulse_push_m;
          s.z += uz * t.pulse_push_m;
          this.keepOutOfLight(s);
          this.score += t.score.per_stun;
        }
      }
      this.emit('pulse', { stunned_ids: stunned });
    }

    // 4) nhặt đom đóm (tự động khi trong bán kính và còn chỗ)
    for (let i = 0; i < this.motes.length && player.carried < t.carry_capacity; ) {
      const m = this.motes[i];
      if (dist2(player.x, player.z, m.x, m.z) <= t.pickup_radius) {
        this.motes.splice(i, 1);
        player.carried += 1;
        this.score += t.score.per_mote;
        this.emit('mote_picked', { carried: player.carried });
      } else i += 1;
    }

    // 5) Bóng Mực: sinh thêm theo thời gian
    if (this.randomShades) {
      this.spawnTimer -= 1;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = ticksOf(w.shade_spawn_interval_s);
        if (this.shades.length < w.max_shades) {
          for (let tries = 0; tries < 10; tries++) {
            const [x, z] = this.randomSpot(w.shade_spawn_radius, w.shade_spawn_radius * 0.8);
            if (!this.inLight(x, z)) {
              const s = this.addShade(x, w.shade_y, z);
              this.emit('shade_spawned', { id: s.id });
              break;
            }
          }
        }
      }
    }

    // 6) Bóng Mực: di chuyển đuổi theo người chơi
    for (const s of this.shades) {
      if (s.stun > 0) {
        s.stun -= 1;
        if (s.stun === 0) s.state = 'chase';
        continue;
      }
      const d = dist2(s.x, s.z, player.x, player.z);
      if (d > 1e-9) {
        const stepLen = Math.min(t.shade_speed * DT, d);
        s.x += ((player.x - s.x) / d) * stepLen;
        s.z += ((player.z - s.z) / d) * stepLen;
      }
      this.keepOutOfLight(s);
    }

    // 7) bị chạm
    if (player.invuln === 0) {
      for (const s of this.shades) {
        if (s.state === 'stunned') continue;
        if (dist2(player.x, player.z, s.x, s.z) <= t.shade_hit_radius) {
          player.flames -= 1;
          const dropped = Math.floor(player.carried * t.hit_drop_ratio);
          player.carried -= dropped;
          for (let i = 0; i < dropped; i++) {
            const a = (i * 2 * Math.PI) / dropped;
            const r = t.pickup_radius + 1;
            this.addMote(round3(player.x + r * Math.sin(a)), round3(player.z + r * Math.cos(a)));
          }
          player.invuln = ticksOf(t.invuln_s);
          this.emit('player_hit', { by: 'shade', flames: player.flames, dropped });
          break;
        }
      }
    }

    // 8) kết thúc (ưu tiên: thắng > hết máu > bình minh)
    if (this.lanterns.every((l) => l.lit)) this.finish('won', 'all_lit');
    else if (player.flames <= 0) this.finish('lost', 'no_flames');
    else if (this.tick >= this.totalTicks) this.finish('lost', 'dawn');

    return this.events;
  }

  /** Điểm (x,z) có nằm trong vùng sáng an toàn của một đèn đã thắp không. */
  inLight(x, z) {
    return this.lanterns.some((l) => l.lit && dist2(x, z, l.x, l.z) < this.t.safe_radius);
  }

  /** Bóng Mực không vào được bán kính an toàn quanh đèn đã sáng. */
  keepOutOfLight(s) {
    for (const l of this.lanterns) {
      if (!l.lit) continue;
      const d = dist2(s.x, s.z, l.x, l.z);
      if (d < this.t.safe_radius) {
        let ux = 1;
        let uz = 0;
        if (d > 1e-9) {
          ux = (s.x - l.x) / d;
          uz = (s.z - l.z) / d;
        }
        s.x = l.x + ux * this.t.safe_radius;
        s.z = l.z + uz * this.t.safe_radius;
      }
    }
    const rd = Math.hypot(s.x, s.z);
    const maxR = this.w.island_radius + 5;
    if (rd > maxR) {
      s.x *= maxR / rd;
      s.z *= maxR / rd;
    }
  }

  finish(result, reason) {
    if (result === 'won') {
      const left = Math.max(0, this.totalTicks - this.tick) / HZ;
      this.score +=
        this.t.score.per_second_left * Math.floor(left) +
        this.t.score.per_flame_left * this.player.flames;
    }
    this.state = result;
    this.emit('game_over', { result, reason });
  }

  snapshot() {
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.tick,
      state: this.state,
      time_left_s: this.timeLeftS,
      score: this.score,
      player: {
        pos: [round3(this.player.x), round3(this.player.y), round3(this.player.z)],
        flames: this.player.flames,
        carried: this.player.carried,
      },
      lanterns: this.lanterns.map((l) => ({
        id: l.id,
        pos: [round3(l.x), round3(l.y), round3(l.z)],
        lit: l.lit,
        deposited: l.deposited,
      })),
      shades: this.shades.map((s) => ({
        id: s.id,
        pos: [round3(s.x), round3(s.y), round3(s.z)],
        state: s.state,
      })),
      motes_active: this.motes.length,
      motes: this.motes.map((m) => ({ id: m.id, pos: [round3(m.x), 0, round3(m.z)] })),
    };
  }

  end() {
    return { type: 'end', ticks: this.tick, state: this.state, score: this.score };
  }
}
