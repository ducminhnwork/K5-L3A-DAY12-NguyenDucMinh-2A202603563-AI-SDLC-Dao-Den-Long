import test from 'node:test';
import assert from 'node:assert/strict';
import { run, events, snaps, last, quiet, near } from './helpers.js';

const frames = (...parts) => ({ frames: parts.flat().sort((a, b) => a.tick - b.tick) });
const press = (tick, key) => [{ tick, [key]: true }, { tick: tick + 1, [key]: false }];

test('Đêm 1: đảo bán kính 40, ngoài đó là biển mây (rơi)', () => {
  const inside = run({ seed: 1, ticks: 300, scenario: { ...quiet, player: { pos: [39.9, 0, 0] } } });
  assert.equal(events(inside, 'player_hit').length, 0);
  const out = run({ seed: 1, ticks: 300, scenario: { ...quiet, player: { pos: [40.5, 0, 0] } } });
  assert.equal(events(out, 'player_hit')[0].data.by, 'fall');
});

test('Đêm 1: đèn L1..L5 đúng toạ độ chuẩn', () => {
  const l = snaps(run({ seed: 1, ticks: 0 }))[0].lanterns;
  assert.deepEqual(l.map((x) => x.pos), [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]]);
});

test('Đêm 2: 6 đèn, đi qua cầu tre sang đảo B, rơi nếu lệch khỏi cầu', () => {
  const l = snaps(run({ seed: 1, night: 2, ticks: 0 }))[0].lanterns;
  assert.equal(l.length, 6);
  assert.deepEqual(l[3].pos, [70, 0, 20]);
  const ok = run({ seed: 1, night: 2, ticks: 700, scenario: { ...quiet }, inputs: frames({ tick: 0, move: [0, 1], cam_yaw_deg: 90 }) });
  assert.ok(last(snaps(ok)).player.pos[0] > 60);
  assert.equal(events(ok, 'player_hit').length, 0);
  const off = run({ seed: 1, night: 2, ticks: 400, scenario: { ...quiet, player: { pos: [20, 0, 5] } }, inputs: frames({ tick: 0, move: [0, 1], cam_yaw_deg: 90 }) });
  assert.equal(events(off, 'player_hit')[0].data.by, 'fall'); // z=5 ngoài cầu (|z|<=2) giữa hai đảo
});

test('Đêm 2: bục nhảy bắn Mây sang đảo kia (Y 14, ngang 24 m/s), vận tốc giữ tới khi chạm đất, phím không ghi đè', () => {
  const rows = run({
    seed: 1, night: 2, ticks: 200,
    scenario: { ...quiet, player: { pos: [20, 0, 18] } },
    inputs: frames({ tick: 0, move: [-1, 0] }), // đẩy ngược cũng không đổi quỹ đạo
  });
  const s = snaps(rows);
  assert.ok(near(s[1].player.vel[1], 14 - 20 / 60, 0.01));
  assert.ok(near(Math.hypot(s[2].player.vel[0], s[2].player.vel[2]), 24, 0.01));
  const land = s.find((x, i) => i > 5 && x.player.grounded);
  assert.ok(land, 'phải đáp xuống');
  assert.ok(near(land.tick, 84, 2), `bay ~1.4 s, tick ${land.tick}`);
  assert.ok(Math.hypot(land.player.pos[0] - 70, land.player.pos[2]) <= 28, 'đáp trong đảo đích');
  assert.equal(events(rows, 'player_hit').length, 0);
});

test('Đêm 2: bục thứ hai bắn ngược về đảo A', () => {
  const rows = run({ seed: 1, night: 2, ticks: 200, scenario: { ...quiet, player: { pos: [50, 0, -18] } } });
  const land = snaps(rows).find((x, i) => i > 5 && x.player.grounded);
  assert.ok(Math.hypot(land.player.pos[0], land.player.pos[2]) <= 28);
});

test('Đêm 2: lướt giữa không trung vẫn được, giữ nguyên độ cao 12 tick rồi tiếp tục quỹ đạo phóng', () => {
  const rows = run({ seed: 1, night: 2, ticks: 200, scenario: { ...quiet, player: { pos: [20, 0, 18] } }, inputs: frames({ tick: 10, move: [0, 1], cam_yaw_deg: 90, dash: true }, { tick: 11, dash: false }) });
  const s = snaps(rows);
  assert.equal(events(rows, 'dash').length, 1);
  for (let k = 11; k <= 22; k++) assert.equal(s[k].player.pos[1], s[11].player.pos[1]);
  assert.ok(s[23].player.pos[1] !== s[22].player.pos[1] || s[23].player.vel[1] !== 0);
  assert.ok(s[23].player.vel[0] > 20); // vận tốc phóng được giữ lại
});

test('Đêm 2: thời lượng 330 s, Bóng Mực sinh mỗi 420 tick, tối đa 8', () => {
  const rows = run({ seed: 3, night: 2, ticks: 1300, scenario: { random_motes: false, random_drifters: false, player: { flames: 99 } } });
  assert.deepEqual(events(rows, 'shade_spawned').map((e) => e.tick), [300, 300, 720, 1140]);
  assert.equal(snaps(run({ seed: 1, night: 2, ticks: 0 }))[0].time_left_s, 330);
  const cap = run({ seed: 3, night: 2, ticks: 12000, scenario: { random_motes: false, random_drifters: false, player: { flames: 99 }, time_left_s: 500 } });
  assert.ok(last(snaps(cap)).shades.length <= 8);
});

test('Đêm 3: 7 đèn, 30 điểm đom đóm (20 ban đầu), thời lượng 360 s, Bóng Mực 4.5 m/s', () => {
  const s0 = snaps(run({ seed: 1, night: 3, ticks: 0 }))[0];
  assert.equal(s0.lanterns.length, 7);
  assert.equal(s0.motes.length, 20);
  assert.equal(s0.time_left_s, 360);
  assert.deepEqual(s0.lanterns[0].pos, [0, 6, 6]);
  const rows = run({ seed: 1, night: 3, ticks: 60, scenario: { ...quiet, player: { pos: [0, 0, -30], flames: 99 }, shades: [{ id: 'S1', pos: [0, 1, -20], state: 'chase' }] } });
  assert.ok(near(-20 - snaps(rows)[1].shades[0].pos[2], 0.075, 0.002));
});

test('Đêm 3: vách đứng tầng 1 chặn không leo; dốc 30° đi lên được tới Y=3', () => {
  // đi từ (0,0,30) về -Z: gặp vách tầng 1 ở r=24 (z>0)
  const wall = run({ seed: 1, night: 3, ticks: 200, scenario: { ...quiet, player: { pos: [0, 0, 30] } }, inputs: frames({ tick: 0, move: [0, -1] }) });
  const w = last(snaps(wall)).player;
  assert.ok(w.pos[2] >= 24 - 0.01 && w.pos[1] === 0, `pos ${w.pos}`);
  // dốc 30°: chân (26,0,15) => r=30; đỉnh r=24
  const up = run({ seed: 1, night: 3, ticks: 140, scenario: { ...quiet, player: { pos: [25.98, 0, 15] } }, inputs: frames({ tick: 0, move: [-0.866, -0.5] }) });
  const p = last(snaps(up)).player;
  assert.ok(near(p.pos[1], 3, 0.01), `y=${p.pos[1]}`);
  assert.equal(p.grounded, true);
});

test('Đêm 3: bước ra mép tầng 1 thì rơi xuống tầng dưới (không phải hư không)', () => {
  const rows = run({ seed: 1, night: 3, ticks: 200, scenario: { ...quiet, player: { pos: [0, 3, 23] } }, inputs: frames({ tick: 0, move: [0, 1] }) });
  const p = last(snaps(rows)).player;
  assert.equal(p.pos[1], 0);
  assert.equal(events(rows, 'player_hit').length, 0);
});

test('Đêm 3: bục nhảy (0,3,13) đưa Mây lên tầng 2 (Y=6)', () => {
  const rows = run({ seed: 1, night: 3, ticks: 150, scenario: { ...quiet, player: { pos: [0, 3, 13] } } });
  const p = last(snaps(rows)).player;
  assert.ok(near(p.pos[1], 6, 0.01), `y=${p.pos[1]}`);
  assert.ok(Math.hypot(p.pos[0], p.pos[2]) <= 8 && Math.hypot(p.pos[0], p.pos[2]) > 2);
});

test('Đêm 3: tháp chuông (trụ r=2) không đi xuyên được', () => {
  const rows = run({ seed: 1, night: 3, ticks: 120, scenario: { ...quiet, player: { pos: [0, 6, 6] } }, inputs: frames({ tick: 0, move: [0, -1] }) });
  const p = last(snaps(rows)).player;
  assert.ok(Math.hypot(p.pos[0], p.pos[2]) >= 1.99);
});

test('Đêm 3: gió mạnh 2 m/s kéo dài 5 s, cứ 30 s một lần, báo trước 2 s', () => {
  const rows = run({ seed: 1, night: 3, ticks: 2200, scenario: { ...quiet, player: { pos: [0, 0, -30], flames: 99 }, wind_enabled: true } });
  const s = snaps(rows);
  assert.equal(s[1799].wind.active, false);
  assert.equal(s[1800].wind.active, false);
  assert.equal(s[1801].wind.active, true);
  assert.equal(s[2100].wind.active, true);
  assert.equal(s[2101].wind.active, false);
  const dir = s[1801].wind.dir_deg;
  const dx = s[1900].player.pos[0] - s[1800].player.pos[0];
  const dz = s[1900].player.pos[2] - s[1800].player.pos[2];
  assert.ok(near(Math.hypot(dx, dz), 2 * (100 / 60), 0.02));
  assert.ok(near(Math.atan2(dz, dx) * 180 / Math.PI, ((dir + 180) % 360) - 180, 0.5) || near(Math.atan2(dz, dx) * 180 / Math.PI + 360, dir, 0.5));
  const off = run({ seed: 1, night: 3, ticks: 1900, scenario: { ...quiet, wind_enabled: false } });
  assert.equal(last(snaps(off)).wind.active, false);
});

// ---------- Gió Lạc ----------
const drifter = (o) => ({ id: 'D1', pos: [10, 1.5, 0], state: 'idle', ...o });

test('Gió Lạc: sinh tại tick 1200, 2400, ...; tối đa 2; id D1, D2', () => {
  const rows = run({ seed: 2, night: 2, ticks: 4000, scenario: { random_motes: false, random_shades: false, player: { flames: 99 } } });
  const s = snaps(rows);
  assert.equal(s[1199].drifters.length, 0);
  assert.equal(s[1200].drifters.length, 1);
  assert.equal(s[1200].drifters[0].id, 'D1');
  assert.ok(s.every((x) => x.drifters.length <= 2));
  const n1 = snaps(run({ seed: 2, night: 1, ticks: 2500, scenario: { random_motes: false, random_shades: false } }));
  assert.equal(last(n1).drifters.length, 0); // Đêm 1 không có Gió Lạc
});

test('Gió Lạc: idle -> chase khi mang >= 5 và cách <= 15 m; điều kiện mất thì về idle', () => {
  const sc = (carried, x) => ({ ...quiet, night: 2, player: { carried }, drifters: [drifter({ pos: [x, 1.5, 0] })] });
  assert.equal(snaps(run({ seed: 1, night: 2, ticks: 2, scenario: sc(5, 15) }))[1].drifters[0].state, 'chase');
  assert.equal(snaps(run({ seed: 1, night: 2, ticks: 2, scenario: sc(4, 10) }))[1].drifters[0].state, 'idle');
  assert.equal(snaps(run({ seed: 1, night: 2, ticks: 2, scenario: sc(5, 16) }))[1].drifters[0].state, 'idle');
});

test('Gió Lạc: chạm (<=1.2 m) cướp min(3, mang), rồi flee 7 m/s 240 tick và biến mất cùng số đã cướp, chỉ cướp 1 lần', () => {
  const rows = run({ seed: 1, night: 2, ticks: 300, scenario: { ...quiet, player: { carried: 7, flames: 9 }, drifters: [drifter({ pos: [1.1, 1.5, 0], state: 'chase' })] } });
  const st = events(rows, 'drifter_steal');
  assert.equal(st.length, 1);
  assert.deepEqual(st[0].data, { drifter_id: 'D1', amount: 3, carried: 4 });
  const s = snaps(rows);
  assert.equal(s[st[0].tick].drifters[0].state, 'flee');
  assert.equal(s[st[0].tick].drifters[0].stolen, 3);
  assert.equal(s[st[0].tick + 239].drifters.length, 1);
  assert.equal(s[st[0].tick + 240].drifters.length, 0);
  assert.equal(last(s).player.carried, 4);
});

test('Gió Lạc: cướp không làm mất Ngọn Lửa và bất tử không ngăn cướp', () => {
  const rows = run({ seed: 1, night: 2, ticks: 5, scenario: { ...quiet, player: { carried: 6, invuln_ticks: 200 }, drifters: [drifter({ pos: [0.5, 1.5, 0], state: 'chase' })] } });
  assert.equal(events(rows, 'drifter_steal').length, 1);
  assert.equal(last(snaps(rows)).player.flames, 3);
});

test('Gió Lạc: Tỏa Sáng trúng con đang chase -> flee, không cướp', () => {
  const rows = run({ seed: 1, night: 2, ticks: 5, scenario: { ...quiet, player: { carried: 8 }, drifters: [drifter({ pos: [3, 1.5, 0], state: 'chase' })] }, inputs: frames({ tick: 0, pulse: true }) });
  assert.equal(snaps(rows)[1].drifters[0].state, 'flee');
  assert.equal(snaps(rows)[1].drifters[0].stolen, 0);
  assert.equal(events(rows, 'drifter_steal').length, 0);
});

test('Gió Lạc: Tỏa Sáng trúng con đang flee có đồ -> thả toàn bộ thành đom đóm rơi, biến mất sau 120 tick', () => {
  const rows = run({ seed: 1, night: 2, ticks: 200, scenario: { ...quiet, player: { carried: 3 }, drifters: [drifter({ pos: [3, 1.5, 0], state: 'flee', stolen: 3 })] }, inputs: frames({ tick: 0, pulse: true }) });
  const d = events(rows, 'drifter_drop')[0];
  assert.deepEqual(d.data, { drifter_id: 'D1', amount: 3 });
  const s = snaps(rows);
  assert.equal(s[1].motes.filter((m) => m.kind === 'dropped').length, 3);
  assert.equal(s[119].drifters.length, 1);
  assert.equal(s[121].drifters.length, 0);
});

test('Gió Lạc: vùng an toàn của đèn không chặn Gió Lạc', () => {
  const rows = run({ seed: 1, night: 2, ticks: 60, scenario: { ...quiet, player: { pos: [0, 0, 0], carried: 6 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }], drifters: [drifter({ pos: [10, 1.5, 0], state: 'chase' })] } });
  const dd = snaps(rows)[40].drifters[0];
  assert.ok(Math.hypot(dd.pos[0], dd.pos[2]) < 6);
});

// ---------- hiệu năng ----------
test('chạy headless một Đêm đầy đủ (21600 tick) xong trong <= 30 s', () => {
  for (const night of [1, 2, 3]) {
    const t0 = Date.now();
    run({ seed: 9, night, ticks: 21600, snapshotEvery: 10, scenario: { player: { flames: 99 }, time_left_s: 400 } });
    assert.ok(Date.now() - t0 < 30000);
  }
});
