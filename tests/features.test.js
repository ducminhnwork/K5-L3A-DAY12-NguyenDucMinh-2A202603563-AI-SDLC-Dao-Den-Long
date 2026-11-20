import test from 'node:test';
import assert from 'node:assert/strict';
import { run, events, snaps, last, quiet, lit, near } from './helpers.js';

const hold = (extra) => ({ frames: [{ tick: 0, ...extra }] });
const press = (tick, key) => [{ tick, [key]: true }, { tick: tick + 1, [key]: false }];
const frames = (...parts) => ({ frames: parts.flat().sort((a, b) => a.tick - b.tick) });

// ---------- Tỏa Sáng ----------
test('Tỏa Sáng: khoảng cách 3D và điểm', () => {
  const rows = run({
    seed: 1, ticks: 2,
    scenario: { ...quiet, player: { carried: 5 }, shades: [{ id: 'S1', pos: [0, 5.7, 0] }, { id: 'S2', pos: [0, 5.9, 0] }, { id: 'S3', pos: [3, 1, 0] }] },
    inputs: hold({ pulse: true }),
  });
  assert.deepEqual(events(rows, 'pulse')[0].data.stunned_ids, ['S1', 'S3']);
  assert.equal(last(snaps(rows)).score, 10);
  assert.equal(last(snaps(rows)).player.carried, 2);
});

test('Tỏa Sáng: choáng 120 tick, đẩy 4 m trong 15 tick, hồi chiêu 3 s, làm mới khi pulse lại', () => {
  const rows = run({
    seed: 1, ticks: 400,
    scenario: { ...quiet, player: { carried: 10, flames: 9 }, shades: [{ id: 'S1', pos: [3, 1, 0] }] },
    inputs: frames(press(0, 'pulse'), press(100, 'pulse'), press(180, 'pulse')),
  });
  const s = snaps(rows);
  assert.equal(s[1].shades[0].state, 'stunned');
  assert.ok(near(s[15].shades[0].pos[0], 7, 0.01)); // 3 + 4
  assert.ok(near(s[16].shades[0].pos[0], 7, 0.01)); // dừng đẩy sau 15 tick
  assert.equal(events(rows, 'pulse').length, 2); // tick 100 bị hồi chiêu chặn; tick 180 cách 180 tick từ lần đầu
  assert.deepEqual(events(rows, 'pulse').map((e) => e.tick), [1, 181]);
  assert.equal(s[1].player.pulse_cd_s, 3);
});

test('Tỏa Sáng: không đủ 3 đom đóm không kích hoạt; bóng trùng vị trí bị đẩy theo +X', () => {
  const no = run({ seed: 1, ticks: 3, scenario: { ...quiet, player: { carried: 2 }, shades: [{ pos: [2, 1, 0] }] }, inputs: hold({ pulse: true }) });
  assert.equal(events(no, 'pulse').length, 0);
  const co = run({ seed: 1, ticks: 16, scenario: { ...quiet, player: { carried: 3 }, shades: [{ id: 'S1', pos: [0, 1, 0] }] }, inputs: hold({ pulse: true }) });
  assert.ok(last(snaps(co)).shades[0].pos[0] > 3.9);
});

test('Tỏa Sáng: choáng hết sau 120 tick', () => {
  const rows = run({ seed: 1, ticks: 130, scenario: { ...quiet, player: { carried: 3 }, shades: [{ id: 'S1', pos: [3, 1, 0] }] }, inputs: hold({ pulse: true }) });
  const s = snaps(rows);
  assert.equal(s[1].shades[0].state, 'stunned');
  assert.equal(s[120].shades[0].state, 'stunned');
  assert.notEqual(s[121].shades[0].state, 'stunned');
});

// ---------- Bóng Mực ----------
test('Bóng Mực: lịch sinh Đêm 1 (2 con ở tick 300, rồi 1 con mỗi 480), id S1.., trạng thái spawning', () => {
  const rows = run({ seed: 4, ticks: 1300, scenario: { random_motes: false, player: { flames: 99 } } });
  const sp = events(rows, 'shade_spawned');
  assert.deepEqual(sp.map((e) => [e.tick, e.data.id]), [[300, 'S1'], [300, 'S2'], [780, 'S3'], [1260, 'S4']]);
  assert.equal(snaps(rows)[300].shades[0].state, 'spawning');
  assert.equal(snaps(rows)[299].shades.length, 0);
});

test('Bóng Mực: sinh cách người chơi >= 15 m, tối đa 6 ở Đêm 1', () => {
  const rows = run({ seed: 5, ticks: 8000, scenario: { random_motes: false, player: { flames: 99 }, time_left_s: 200 } });
  for (const e of events(rows, 'shade_spawned')) {
    const sh = snaps(rows)[e.tick].shades.find((x) => x.id === e.data.id);
    const pl = snaps(rows)[e.tick].player.pos;
    assert.ok(Math.hypot(sh.pos[0] - pl[0], sh.pos[2] - pl[2]) >= 15 - 0.01 || e.tick > 0);
  }
  assert.ok(last(snaps(rows)).shades.length <= 6);
});

test('Bóng Mực: phát hiện 12 m, bỏ đuổi 18 m, tốc độ 4 m/s', () => {
  const rows = run({ seed: 1, ticks: 60, scenario: { ...quiet, player: { flames: 99 }, shades: [{ id: 'S1', pos: [11.5, 1, 0], state: 'wander' }, { id: 'S2', pos: [30, 1, 0], state: 'wander' }] } });
  const s = snaps(rows);
  assert.equal(s[1].shades[0].state, 'chase');
  assert.equal(s[1].shades[1].state, 'wander');
  const moved = 11.5 - s[60].shades[0].pos[0];
  assert.ok(near(moved, 4, 0.02), `moved ${moved}`);
  const lose = run({ seed: 1, ticks: 2, scenario: { ...quiet, shades: [{ id: 'S1', pos: [18.5, 1, 0], state: 'chase' }] } });
  assert.equal(snaps(lose)[1].shades[0].state, 'wander');
});

test('Bị đánh: -1 lửa, rơi floor(mang/2) vào vành 1.5-2.5 m, TTL 480, bất tử 90 tick, bóng recoil 2 m / 60 tick', () => {
  const rows = run({ seed: 1, ticks: 700, scenario: { ...quiet, player: { carried: 5, flames: 5 }, shades: [{ id: 'S1', pos: [0.5, 1, 0], state: 'chase' }] } });
  const hit = events(rows, 'player_hit');
  assert.deepEqual(hit[0].data, { by: 'shade', flames: 4, dropped: 2, lost: 0 });
  assert.equal(hit[0].tick, 1);
  const s = snaps(rows);
  const dropped = s[1].motes.filter((m) => m.kind === 'dropped');
  assert.equal(dropped.length, 2);
  for (const m of dropped) {
    const r = Math.hypot(m.pos[0] - s[1].player.pos[0], m.pos[2] - s[1].player.pos[2]);
    assert.ok(r >= 1.49 && r <= 2.51, `r=${r}`);
    assert.equal(m.ttl_s, 8);
  }
  assert.equal(s[1].shades[0].state, 'recoil');
  assert.equal(s[1].player.invuln, true);
  assert.equal(hit[1].tick, 91); // lần chạm kế tiếp sau đúng 90 tick bất tử
  const sh = (k) => s[k].shades[0].pos;
  assert.ok(near(Math.hypot(sh(61)[0] - sh(1)[0], sh(61)[2] - sh(1)[2]), 2, 0.05));
});

test('Bị đánh: bóng chạm lúc Mây bất tử không làm gì (không recoil)', () => {
  const rows = run({ seed: 1, ticks: 3, scenario: { ...quiet, player: { invuln_ticks: 50 }, shades: [{ id: 'S1', pos: [0.5, 1, 0], state: 'chase' }] } });
  assert.equal(events(rows, 'player_hit').length, 0);
  assert.equal(snaps(rows)[2].shades[0].state, 'chase');
});

test('Bị đánh: tối đa 1 lần mất Ngọn Lửa mỗi tick', () => {
  const rows = run({ seed: 1, ticks: 2, scenario: { ...quiet, shades: [{ id: 'S1', pos: [0.5, 1, 0], state: 'chase' }, { id: 'S2', pos: [-0.5, 1, 0], state: 'chase' }] } });
  assert.equal(events(rows, 'player_hit').length, 1);
  assert.equal(snaps(rows)[1].player.flames, 2);
});

test('Bóng đang choáng / spawning / recoil không gây sát thương', () => {
  for (const state of ['stunned', 'spawning', 'recoil']) {
    const rows = run({ seed: 1, ticks: 5, scenario: { ...quiet, shades: [{ pos: [0.5, 1, 0], state, state_ticks_left: 100 }] } });
    assert.equal(events(rows, 'player_hit').length, 0, state);
  }
});

// ---------- Vùng an toàn ----------
test('Vùng an toàn: bóng ngoài bị chặn ở mép 6 m', () => {
  const rows = run({
    seed: 1, ticks: 600,
    scenario: { ...quiet, player: { pos: [0, 0, 0], flames: 99 }, lanterns: [lit('L1', [0, 0, 0]), { id: 'L2', pos: [0, 0, 60] }], shades: [{ pos: [30, 1, 0], state: 'chase' }], time_left_s: 1000 },
  });
  for (const s of snaps(rows)) assert.ok(Math.hypot(s.shades[0].pos[0], s.shades[0].pos[2]) >= 6 - 0.002, `tick ${s.tick}`);
});

test('Vùng an toàn: bóng đang ở trong lúc đèn thắp bị đẩy ra mép trong <= 30 tick, không gây sát thương', () => {
  const rows = run({
    seed: 1, ticks: 40,
    scenario: { ...quiet, player: { carried: 10, flames: 9 }, lanterns: [{ id: 'L1', pos: [0, 0, 1] }, lit('L2', [0, 0, 60]), lit('L3', [0, 0, 61]), lit('L4', [0, 0, 62]), { id: 'L5', pos: [0, 0, 63] }], shades: [{ id: 'S1', pos: [0.5, 1, 0], state: 'chase' }] },
    inputs: frames(press(0, 'interact')),
  });
  assert.equal(events(rows, 'lantern_lit').length, 1);
  assert.equal(events(rows, 'player_hit').length, 0);
  const s = snaps(rows);
  const d = (k) => Math.hypot(s[k].shades[0].pos[0], s[k].shades[0].pos[2] - 1);
  assert.ok(d(1) > 0.4 && d(1) < 6);
  assert.ok(d(31) >= 6 - 0.002);
});

// ---------- Rơi khỏi đảo ----------
test('Rơi khỏi đảo: -1 lửa, mất hết đom đóm, chờ 60 tick rồi hồi sinh bất tử 90 tick', () => {
  const rows = run({ seed: 1, ticks: 200, scenario: { ...quiet, player: { pos: [45, 0, 0], carried: 6 } } });
  const hit = events(rows, 'player_hit');
  assert.equal(hit.length, 1);
  assert.deepEqual(hit[0].data, { by: 'fall', flames: 2, dropped: 0, lost: 6 });
  const t0 = hit[0].tick;
  const s = snaps(rows);
  assert.equal(s[t0].player.carried, 0);
  assert.ok(s[t0].player.pos[1] < -10);
  assert.ok(s[t0 + 59].player.pos[1] < -10);
  assert.deepEqual(s[t0 + 60].player.pos, [0, 0, 0]);
  assert.equal(s[t0 + 60].player.invuln, true);
  assert.deepEqual(s[t0 + 60].player.vel, [0, 0, 0]);
});

test('Rơi khỏi đảo: hết lửa thì thua ngay, không hồi sinh', () => {
  const rows = run({ seed: 1, ticks: 200, scenario: { ...quiet, player: { pos: [45, 0, 0], flames: 1 } } });
  assert.deepEqual(events(rows, 'game_over')[0].data, { result: 'lost', reason: 'no_flames' });
  assert.equal(events(rows, 'player_hit').length, 1);
});

test('Rơi khỏi đảo: bỏ qua bất tử', () => {
  const rows = run({ seed: 1, ticks: 100, scenario: { ...quiet, player: { pos: [45, 0, 0], invuln_ticks: 500 } } });
  assert.equal(events(rows, 'player_hit')[0].data.flames, 2);
});

// ---------- Tạm dừng ----------
test('Tạm dừng: tick tăng, sim_tick/thời gian/hồi chiêu đứng yên, snapshot state=paused', () => {
  const rows = run({ seed: 1, ticks: 30, scenario: quiet, inputs: frames(press(5, 'pause'), { tick: 20, pause: true }, { tick: 21, pause: false }, { tick: 0, move: [0, 1] }) });
  const s = snaps(rows);
  assert.deepEqual(events(rows).map((e) => e.name), ['paused', 'resumed']);
  assert.equal(events(rows, 'paused')[0].tick, 6);
  assert.equal(s[6].state, 'paused');
  assert.equal(s[6].sim_tick, 5);
  assert.equal(s[19].sim_tick, 5);
  assert.equal(s[19].player.pos[2], 0.5);
  assert.equal(s[20].state, 'paused');
  assert.equal(s[21].state, 'playing');
  assert.equal(s[21].sim_tick, 6);
  assert.equal(last(rows).state, 'playing');
});

// ---------- Bùa Gió ----------
test('Bùa Gió: nhặt, 7.2 m/s, Lướt không hồi chiêu, hết sau 600 tick, hiện lại sau 2700 tick', () => {
  const rows = run({
    seed: 1, night: 2, ticks: 3000,
    scenario: { ...quiet, player: { pos: [34.5, 0, 0] }, charms: [{ id: 'C1', pos: [35, 0, 0] }] },
    inputs: frames({ tick: 2, move: [0, 1] }, press(10, 'dash'), press(30, 'dash'), { tick: 40, move: [0, 0] }),
  });
  const pick = events(rows, 'charm_picked')[0];
  assert.deepEqual(pick.data, { charm_id: 'C1', charm_ticks: 600 });
  assert.equal(pick.tick, 1);
  const s = snaps(rows);
  assert.equal(s[1].charms[0].available, false);
  assert.ok(near(s[3].player.pos[2] - s[2].player.pos[2], 0.12, 0.001)); // 7.2 m/s
  assert.equal(events(rows, 'dash').length, 2); // lướt liên tiếp không cần hồi chiêu
  assert.equal(s[11].player.dash_cd_s, 0);
  assert.equal(s[600].player.charm_s > 0, true);
  assert.equal(s[601].player.charm_s, 0);
  assert.equal(s[2700].charms[0].available, false);
  assert.equal(s[2701].charms[0].available, true);
});

test('Bùa Gió: nhặt lại thì làm mới; xa quá không nhặt', () => {
  const far = run({ seed: 1, night: 2, ticks: 3, scenario: { ...quiet, player: { pos: [33.9, 0, 0] }, charms: [{ id: 'C1', pos: [35, 0, 0] }] } });
  assert.equal(events(far, 'charm_picked').length, 0);
  const re = run({ seed: 1, night: 2, ticks: 3, scenario: { ...quiet, player: { pos: [35, 0, 0], charm_ticks: 100 }, charms: [{ id: 'C1', pos: [35, 0, 0] }] } });
  assert.equal(events(re, 'charm_picked')[0].data.charm_ticks, 600);
});
