import test from 'node:test';
import assert from 'node:assert/strict';
import { run, events, snaps, last, quiet } from './helpers.js';
import { TUNING } from '../src/sim/config.js';

const lit = (id, pos) => ({ id, pos, lit: true });
const allOtherLit = [lit('L2', [0, 0, 60]), lit('L3', [0, 0, 61]), lit('L4', [0, 0, 62]), lit('L5', [0, 0, 63])];

test('mô hình tick: snapshot 0 trước input, N bước đúng N tick', () => {
  const rows = run({ seed: 1, ticks: 10, scenario: quiet, inputs: { frames: [{ tick: 0, move: [0, 1] }] } });
  const s = snaps(rows);
  assert.equal(s[0].tick, 0);
  assert.deepEqual(s[0].player.pos, [0, 0, 0]);
  assert.equal(last(rows).ticks, 10);
  assert.equal(s[10].tick, 10);
  assert.equal(s[10].player.pos[2], 1); // 10 bước x 0.1 m
  assert.equal(s[10].time_left_s, round(300 - 10 / 60));
});
const round = (v) => Math.round(v * 1000) / 1000;

test('vector di chuyển dài hơn 1 được chuẩn hoá', () => {
  const a = run({ seed: 1, ticks: 10, scenario: quiet, inputs: { frames: [{ tick: 0, move: [1, 1] }] } });
  const p = snaps(a)[10].player.pos;
  assert.ok(Math.abs(Math.hypot(p[0], p[2]) - 1) < 0.002);
});

test('cam_yaw_deg=90, move [0,1] đi về +X', () => {
  const rows = run({ seed: 1, ticks: 10, scenario: quiet, inputs: { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }] } });
  const p = snaps(rows)[10].player.pos;
  assert.equal(p[0], 1);
  assert.ok(Math.abs(p[2]) < 0.001);
});

test('trường vắng mặt trong frame giữ giá trị cũ', () => {
  const rows = run({
    seed: 1,
    ticks: 20,
    scenario: quiet,
    inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 10, cam_yaw_deg: 90 }] },
  });
  const p = snaps(rows)[20].player.pos;
  assert.equal(p[2], 1); // 10 bước đầu đi +Z
  assert.equal(p[0], 1); // 10 bước sau đi +X (move vẫn [0,1])
});

test('nhặt đom đóm trong bán kính, sự kiện ghi tick = k+1', () => {
  const rows = run({
    seed: 1,
    ticks: 60,
    scenario: { ...quiet, motes: [[0, 0, 5]] },
    inputs: { frames: [{ tick: 0, move: [0, 1] }] },
  });
  const ev = events(rows, 'mote_picked');
  assert.equal(ev.length, 1);
  assert.deepEqual(ev[0].data, { carried: 1 });
  assert.ok(ev[0].tick >= 35 && ev[0].tick <= 36, `tick ${ev[0].tick}`);
  assert.equal(last(snaps(rows)).score, TUNING.score.per_mote);
  assert.equal(last(snaps(rows)).motes_active, 0);
});

test('không nhặt quá carry_capacity', () => {
  const motes = Array.from({ length: 8 }, () => [0, 0, 0]);
  const rows = run({ seed: 1, ticks: 2, scenario: { ...quiet, motes } });
  assert.equal(events(rows, 'mote_picked').length, TUNING.carry_capacity);
  assert.equal(last(snaps(rows)).player.carried, TUNING.carry_capacity);
  assert.equal(last(snaps(rows)).motes_active, 3);
});

test('nạp đủ đom đóm thì thắp đèn, cộng điểm thắp đèn', () => {
  const rows = run({
    seed: 1,
    ticks: 5,
    scenario: { ...quiet, player: { pos: [0, 0, 0], carried: 4 }, lanterns: [{ id: 'L1', pos: [0, 0, 2] }] },
    inputs: { frames: [{ tick: 0, interact: true }] },
  });
  assert.deepEqual(events(rows, 'deposit')[0].data, { lantern_id: 'L1', amount: 4, deposited: 4 });
  assert.equal(events(rows, 'lantern_lit').length, 1);
  assert.equal(last(snaps(rows)).score, TUNING.score.per_lantern);
  assert.equal(last(snaps(rows)).lanterns[0].lit, true);
  assert.equal(last(snaps(rows)).player.carried, 0);
});

test('nạp một phần: deposited tích luỹ, chưa sáng', () => {
  const rows = run({
    seed: 1,
    ticks: 3,
    scenario: { ...quiet, player: { carried: 2 }, lanterns: [{ id: 'L1', pos: [0, 0, 1] }] },
    inputs: { frames: [{ tick: 0, interact: true }] },
  });
  assert.deepEqual(events(rows, 'deposit')[0].data, { lantern_id: 'L1', amount: 2, deposited: 2 });
  assert.equal(events(rows, 'lantern_lit').length, 0);
});

test('interact chỉ kích hoạt khi chuyển false->true, giữ nút không lặp', () => {
  const rows = run({
    seed: 1,
    ticks: 30,
    scenario: { ...quiet, player: { carried: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, 1] }] },
    inputs: { frames: [{ tick: 0, interact: true }] }, // giữ nguyên true tới hết
  });
  assert.equal(events(rows, 'deposit').length, 1);
});

test('ngoài interact_radius thì không nạp được', () => {
  const rows = run({
    seed: 1,
    ticks: 3,
    scenario: { ...quiet, player: { carried: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, TUNING.interact_radius + 0.5] }] },
    inputs: { frames: [{ tick: 0, interact: true }] },
  });
  assert.equal(events(rows, 'deposit').length, 0);
});

test('đèn lit:true đặt sẵn không cộng điểm, không phát sự kiện', () => {
  const rows = run({ seed: 1, ticks: 5, scenario: { ...quiet, lanterns: [lit('L1', [0, 0, 20])] } });
  assert.equal(events(rows).length, 0);
  assert.equal(last(snaps(rows)).score, 0);
});

test('thắp hết đèn: thắng all_lit, điểm cuối gồm thưởng thời gian và máu', () => {
  const rows = run({
    seed: 1,
    ticks: 100,
    scenario: {
      ...quiet,
      time_left_s: 100,
      player: { carried: 4, flames: 2 },
      lanterns: [{ id: 'L1', pos: [0, 0, 1] }, ...allOtherLit],
    },
    inputs: { frames: [{ tick: 0, interact: true }] },
  });
  assert.deepEqual(events(rows, 'game_over')[0].data, { result: 'won', reason: 'all_lit' });
  const end = last(rows);
  assert.equal(end.state, 'won');
  assert.equal(end.ticks, 1); // dừng ngay khi thắng
  const expected = TUNING.score.per_lantern + TUNING.score.per_second_left * Math.floor(100 - 1 / 60) + TUNING.score.per_flame_left * 2;
  assert.equal(end.score, expected);
});

test('pulse: choáng và đẩy Bóng Mực, trừ đom đóm, cộng điểm, rồi tỉnh lại', () => {
  const rows = run({
    seed: 1,
    ticks: 200,
    scenario: { ...quiet, player: { carried: 2 }, shades: [{ id: 'S1', pos: [5, 1, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
  });
  const pulse = events(rows, 'pulse')[0];
  assert.deepEqual(pulse.data, { stunned_ids: ['S1'] });
  assert.equal(pulse.tick, 1);
  const s = snaps(rows);
  assert.equal(s[1].player.carried, 2 - TUNING.pulse_cost);
  assert.equal(s[1].shades[0].state, 'stunned');
  assert.equal(s[1].shades[0].pos[0], 5 + TUNING.pulse_push_m);
  assert.equal(s[1].score, TUNING.score.per_stun);
  assert.equal(s[Math.round(TUNING.pulse_stun_s * 60)].shades[0].state, 'chase'); // tỉnh đúng sau 180 bước
});

test('pulse khi không đủ đom đóm: không làm gì', () => {
  const rows = run({
    seed: 1,
    ticks: 3,
    scenario: { ...quiet, player: { carried: 0 }, shades: [{ pos: [3, 1, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }] },
  });
  assert.equal(events(rows, 'pulse').length, 0);
});

test('pulse có hồi chiêu', () => {
  const frames = [];
  for (let k = 0; k < 40; k += 2) frames.push({ tick: k, pulse: true }, { tick: k + 1, pulse: false });
  const rows = run({ seed: 1, ticks: 40, scenario: { ...quiet, player: { carried: 5 } }, inputs: { frames } });
  // 1.5 s = 90 tick: trong 40 tick chỉ pulse được 1 lần
  assert.equal(events(rows, 'pulse').length, 1);
});

test('bị Bóng Mực chạm: mất máu, đánh rơi, bất tử tạm, hết máu thì thua', () => {
  const rows = run({
    seed: 1,
    ticks: 400,
    scenario: { ...quiet, player: { carried: 4 }, shades: [{ id: 'S1', pos: [0.5, 1, 0] }] },
  });
  const hits = events(rows, 'player_hit');
  assert.equal(hits.length, TUNING.flames);
  assert.deepEqual(hits[0].data, { by: 'shade', flames: 2, dropped: 2 });
  assert.equal(hits[0].tick, 1);
  assert.equal(hits[1].tick, 1 + Math.round(TUNING.invuln_s * 60)); // không bị chạm trong lúc bất tử
  assert.deepEqual(events(rows, 'game_over')[0].data, { result: 'lost', reason: 'no_flames' });
  assert.equal(last(rows).state, 'lost');
});

test('hết giờ: thua dawn, dừng đúng tick', () => {
  const rows = run({ seed: 1, ticks: 500, scenario: { ...quiet, time_left_s: 1 } });
  assert.deepEqual(events(rows, 'game_over')[0].data, { result: 'lost', reason: 'dawn' });
  assert.equal(last(rows).ticks, 60);
  assert.equal(events(rows, 'game_over')[0].tick, 60);
});

test('mọi đèn đã sáng đặt sẵn thì thắng ngay', () => {
  const rows = run({
    seed: 1,
    ticks: 600,
    scenario: {
      ...quiet,
      player: { pos: [0, 0, 0], flames: 99 },
      lanterns: [lit('L1', [0, 0, 0]), ...allOtherLit],
      shades: [{ pos: [30, 1, 0] }],
      time_left_s: 1000,
    },
  });
  // thắng ngay vì mọi đèn sáng -> dùng đèn chưa thắp để giữ game chạy
  assert.equal(last(rows).state, 'won');
});

test('safe_radius: giữ game chạy, kiểm tra khoảng cách tới đèn sáng ở mọi snapshot', () => {
  const rows = run({
    seed: 1,
    ticks: 600,
    scenario: {
      ...quiet,
      player: { pos: [0, 0, 0], flames: 99 },
      lanterns: [lit('L1', [0, 0, 0]), { id: 'L2', pos: [0, 0, 60] }, ...allOtherLit.slice(1)],
      shades: [{ pos: [30, 1, 0] }],
      time_left_s: 1000,
    },
  });
  for (const s of snaps(rows)) {
    const d = Math.hypot(s.shades[0].pos[0], s.shades[0].pos[2]);
    assert.ok(d >= TUNING.safe_radius - 0.002, `tick ${s.tick}: d=${d}`);
  }
});

test('Bóng Mực đuổi theo người chơi và tốc độ không vượt shade_speed', () => {
  const rows = run({ seed: 1, ticks: 60, scenario: { ...quiet, player: { flames: 99 }, shades: [{ pos: [20, 1, 0] }] } });
  const s = snaps(rows);
  const moved = 20 - s[60].shades[0].pos[0];
  assert.ok(Math.abs(moved - TUNING.shade_speed) < 0.01, `moved ${moved}`);
});

test('nhảy: Y tăng rồi về 0; khoảng cách vẫn tính trên XZ', () => {
  const rows = run({
    seed: 1,
    ticks: 80,
    scenario: quiet,
    inputs: { frames: [{ tick: 0, jump: true }, { tick: 1, jump: false }] },
  });
  const ys = snaps(rows).map((s) => s.player.pos[1]);
  assert.ok(Math.max(...ys) > 0.5);
  assert.equal(ys[ys.length - 1], 0);
});

test('tất định: cùng seed+scenario+inputs cho output giống hệt; seed khác thì khác', () => {
  const inputs = { frames: [{ tick: 0, move: [0.5, 1], cam_yaw_deg: 30 }, { tick: 300, pulse: true }] };
  const a = run({ seed: 42, ticks: 1500, inputs });
  const b = run({ seed: 42, ticks: 1500, inputs });
  const c = run({ seed: 43, ticks: 1500, inputs });
  assert.deepEqual(a, b);
  assert.notDeepEqual(snaps(a)[0].shades, snaps(c)[0].shades);
});

test('random_shades=false: không sinh Bóng Mực kể cả sau nhiều giây', () => {
  const rows = run({ seed: 5, ticks: 3000, scenario: { random_shades: false, random_motes: false, time_left_s: 100, player: { flames: 99 } } });
  assert.equal(events(rows, 'shade_spawned').length, 0);
  assert.equal(last(snaps(rows)).shades.length, 0);
});

test('random_shades=true: có sinh thêm Bóng Mực, id tăng dần', () => {
  const rows = run({ seed: 5, ticks: 2500, scenario: { random_motes: false, player: { flames: 99 } } });
  const sp = events(rows, 'shade_spawned');
  assert.ok(sp.length >= 1);
  assert.equal(sp[0].data.id, 'S3'); // S1, S2 đã có sẵn
});

test('mặc định có 5 đèn và đom đóm ngẫu nhiên', () => {
  const rows = run({ seed: 9, ticks: 0 });
  assert.equal(snaps(rows)[0].lanterns.length, 5);
  assert.ok(snaps(rows)[0].motes_active > 0);
});

test('không rơi khỏi đảo: rào chắn ở mép', () => {
  const rows = run({ seed: 1, ticks: 1200, scenario: quiet, inputs: { frames: [{ tick: 0, move: [0, 1] }] } });
  const p = last(snaps(rows)).player.pos;
  assert.ok(Math.hypot(p[0], p[2]) <= 50.001);
});
