import test from 'node:test';
import assert from 'node:assert/strict';
import { run, events, snaps, last, quiet, lit, near } from './helpers.js';
import { TUNING } from '../src/sim/config.js';

const others = [lit('L2', [0, 0, 60]), lit('L3', [0, 0, 61]), lit('L4', [0, 0, 62]), lit('L5', [0, 0, 63])];
const hold = (extra) => ({ frames: [{ tick: 0, ...extra }] });

test('tick model: snapshot 0 trước input, N bước đúng N tick, tốc độ 6 m/s', () => {
  const rows = run({ seed: 1, ticks: 10, scenario: quiet, inputs: hold({ move: [0, 1] }) });
  const s = snaps(rows);
  assert.equal(s[0].tick, 0);
  assert.deepEqual(s[0].player.pos, [0, 0, 0]);
  assert.equal(last(rows).ticks, 10);
  assert.equal(s[10].player.pos[2], 1); // 10 bước x 0.1 m
  assert.equal(s[10].time_left_s, Math.round((240 - 10 / 60) * 1000) / 1000);
  assert.equal(s[1].player.vel[2], 6); // đạt tốc độ tối đa trong <= 0.1 s
});

test('chuẩn hoá vector chéo, yaw 90 độ, frame chỉ đổi trường có mặt', () => {
  const a = run({ seed: 1, ticks: 10, scenario: quiet, inputs: hold({ move: [1, 1] }) });
  const p = snaps(a)[10].player.pos;
  assert.ok(near(Math.hypot(p[0], p[2]), 1));
  const b = run({ seed: 1, ticks: 20, scenario: quiet, inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 10, cam_yaw_deg: 90 }] } });
  const q = snaps(b)[20].player.pos;
  assert.equal(q[2], 1);
  assert.equal(q[0], 1);
});

test('nhảy: 7 m/s, trọng lực 20, chỉ nhảy khi chạm đất', () => {
  const rows = run({ seed: 1, ticks: 100, scenario: quiet, inputs: { frames: [{ tick: 0, jump: true }, { tick: 1, jump: false }, { tick: 5, jump: true }, { tick: 6, jump: false }] } });
  const ys = snaps(rows).map((s) => s.player.pos[1]);
  assert.ok(Math.max(...ys) > 1.1 && Math.max(...ys) < 1.3, `apex ${Math.max(...ys)}`);
  assert.equal(snaps(rows)[5].player.grounded, false);
  assert.ok(ys[6] < ys[5] + 0.2); // bấm lần hai khi đang bay không nhảy thêm
  assert.equal(ys.at(-1), 0);
  assert.equal(snaps(rows).at(-1).player.grounded, true);
});

test('lướt: 14 m/s trong 12 tick, hồi chiêu 90 tick từ lúc bắt đầu, bấm lúc đang lướt bị bỏ qua', () => {
  const rows = run({
    seed: 1, ticks: 120, scenario: quiet,
    inputs: { frames: [{ tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 5, dash: true }, { tick: 6, dash: false }, { tick: 50, dash: true }, { tick: 51, dash: false }, { tick: 90, dash: true }, { tick: 91, dash: false }] },
  });
  const ev = events(rows, 'dash');
  assert.deepEqual(ev.map((e) => e.tick), [1, 91]); // tick 5 bị bỏ (đang lướt), tick 50 bị bỏ (hồi chiêu)
  const s = snaps(rows);
  assert.ok(near(s[12].player.pos[2], 2.8)); // đứng yên: lướt theo hướng mặt +Z, 12 x 14/60
  assert.ok(near(s[13].player.pos[2], 2.8));
  assert.ok(near(s[1].player.dash_cd_s, 1.5));
});

test('lướt trên không giữ nguyên độ cao, hướng theo phím di chuyển', () => {
  const rows = run({
    seed: 1, ticks: 40, scenario: quiet,
    inputs: { frames: [{ tick: 0, jump: true }, { tick: 1, jump: false }, { tick: 10, move: [1, 0], dash: true }, { tick: 11, dash: false }] },
  });
  const s = snaps(rows);
  const y10 = s[10].player.pos[1];
  for (let k = 11; k <= 21; k++) assert.ok(near(s[k].player.pos[1], s[11].player.pos[1], 1e-6));
  assert.ok(s[22].player.pos[0] > 2.5);
  assert.ok(y10 > 0.5);
});

test('đom đóm: 20 lúc đầu tại 20 điểm khác nhau thuộc tập điểm chuẩn', () => {
  const rows = run({ seed: 11, ticks: 0 });
  const m = snaps(rows)[0].motes;
  assert.equal(m.length, 20);
  assert.equal(new Set(m.map((x) => x.pos.join())).size, 20);
  for (const x of m) {
    const r = Math.hypot(x.pos[0], x.pos[2]);
    assert.ok(near(r, 12, 0.01) || near(r, 33, 0.01), `r=${r}`);
  }
});

test('đom đóm: nhặt trong 1.0 m, chênh cao <= 1.5, sức chứa 10', () => {
  const mk = (pos) => run({ seed: 1, ticks: 2, scenario: { ...quiet, motes: [pos] } });
  assert.equal(events(mk([1, 0, 0]), 'mote_picked').length, 1); // đúng 1.0 m (bao gồm)
  assert.equal(events(mk([1.01, 0, 0]), 'mote_picked').length, 0);
  assert.equal(events(mk([0.5, 1.6, 0]), 'mote_picked').length, 0);
  assert.equal(events(mk([0.5, 1.5, 0]), 'mote_picked').length, 1);
  const rows = run({ seed: 1, ticks: 2, scenario: { ...quiet, motes: Array.from({ length: 13 }, () => [0, 0, 0]) } });
  assert.equal(last(snaps(rows)).player.carried, 10);
  assert.equal(last(snaps(rows)).motes_active, 3);
});

test('đom đóm: sinh thêm mỗi 240 tick khi dưới 30, hết điểm trống thì bỏ lượt', () => {
  const rows = run({ seed: 2, ticks: 721, scenario: { random_shades: false } });
  const s = snaps(rows);
  assert.equal(s[239].motes_active, 20);
  assert.equal(s[240].motes_active, 21);
  assert.equal(s[480].motes_active, 22);
  const full = run({ seed: 2, ticks: 2500, scenario: { random_shades: false } });
  assert.equal(last(snaps(full)).motes_active, 24); // chỉ có 24 điểm
});

test('đèn: chi phí 10, nạp nhiều lần, +10/đom đóm và +100/đèn', () => {
  const rows = run({
    seed: 1, ticks: 6,
    scenario: { ...quiet, player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 1] }] },
    inputs: { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }] },
  });
  assert.deepEqual(events(rows, 'deposit')[0].data, { lantern_id: 'L1', amount: 10, deposited: 10 });
  assert.equal(events(rows, 'lantern_lit').length, 1);
  assert.equal(last(snaps(rows)).score, 10 * 5 + 100); // Ticket-03: +5/đom đóm nạp

  const part = run({
    seed: 1, ticks: 6,
    scenario: { ...quiet, player: { carried: 4 }, lanterns: [{ id: 'L1', pos: [0, 0, 1], deposited: 8 }] },
    inputs: hold({ interact: true }),
  });
  assert.deepEqual(events(part, 'deposit')[0].data, { lantern_id: 'L1', amount: 2, deposited: 10 }); // min(đang mang, còn thiếu)
  assert.equal(last(snaps(part)).player.carried, 2);
});

test('đèn: bán kính 2.0, chọn đèn gần nhất, bằng nhau thì id nhỏ hơn, đèn sáng chưa đầy dầu cũng được chọn', () => {
  const sc = (l) => ({ ...quiet, player: { carried: 3 }, lanterns: l });
  assert.equal(events(run({ seed: 1, ticks: 2, scenario: sc([{ id: 'L1', pos: [0, 0, 2.01] }]), inputs: hold({ interact: true }) }), 'deposit').length, 0);
  assert.equal(events(run({ seed: 1, ticks: 2, scenario: sc([{ id: 'L1', pos: [0, 0, 2] }]), inputs: hold({ interact: true }) }), 'deposit').length, 1);
  const tie = run({ seed: 1, ticks: 2, scenario: sc([{ id: 'L3', pos: [1, 0, 0] }, { id: 'L2', pos: [-1, 0, 0] }]), inputs: hold({ interact: true }) });
  assert.equal(events(tie, 'deposit')[0].data.lantern_id, 'L2');
  // [Ticket-03 thay thế] trước đây bỏ qua đèn đã sáng; nay đèn sáng nhưng chưa đầy dầu cũng được chọn (hao 1 tick => chưa đầy)
  const skip = run({ seed: 1, ticks: 2, scenario: sc([{ id: 'L1', pos: [0, 0, 0.5], lit: true }, { id: 'L2', pos: [0, 0, 1.5] }]), inputs: hold({ interact: true }) });
  assert.equal(events(skip, 'refuel')[0].data.lantern_id, 'L1');
  assert.equal(events(skip, 'deposit').length, 0);
});

test('interact chỉ kích hoạt khi false->true', () => {
  const rows = run({ seed: 1, ticks: 30, scenario: { ...quiet, player: { carried: 9 }, lanterns: [{ id: 'L1', pos: [0, 0, 1] }] }, inputs: hold({ interact: true }) });
  assert.equal(events(rows, 'deposit').length, 1);
});

test('[Ticket-03] không còn thắng sớm: thắp đủ đèn không kết thúc Đêm', () => {
  const rows = run({
    seed: 1, ticks: 100,
    scenario: { ...quiet, time_left_s: 100, player: { carried: 10, flames: 2 }, lanterns: [{ id: 'L1', pos: [0, 0, 1] }, ...others] },
    inputs: hold({ interact: true }),
  });
  assert.equal(events(rows, 'lantern_lit').length, 1);
  assert.equal(events(rows, 'game_over').length, 0);
  assert.equal(last(rows).state, 'playing');
});

test('[Ticket-03] thắng khi sống tới bình minh với >= ceil(0.6 x đèn) đèn sáng; điểm bình minh', () => {
  const rows = run({
    seed: 1, ticks: 600,
    scenario: { ...quiet, time_left_s: 2, player: { flames: 2 }, lanterns: [lit('L1', [0, 0, 60]), lit('L2', [0, 0, 61]), lit('L3', [0, 0, 62])] },
  });
  assert.deepEqual(events(rows, 'game_over')[0].data, { result: 'won', reason: 'dawn_survived' });
  assert.equal(last(rows).ticks, 120);
  // 3 đèn: fuel 100 - 2 s = 98 => +50+98 mỗi đèn; 2 ngọn lửa => +100
  assert.equal(last(rows).score, 3 * (50 + 98) + 2 * 50);
});

test('[Ticket-03] hết giờ mà đèn sáng dưới ngưỡng thì thua dawn; ngưỡng 3/5, 4/6, 5/7', () => {
  const two = run({ seed: 1, ticks: 500, scenario: { ...quiet, time_left_s: 1, lanterns: [lit('L1', [0, 0, 60]), lit('L2', [0, 0, 61])] } });
  assert.deepEqual(events(two, 'game_over')[0].data, { result: 'lost', reason: 'dawn' });
  const three = run({ seed: 1, ticks: 500, scenario: { ...quiet, time_left_s: 1, lanterns: [lit('L1', [0, 0, 60]), lit('L2', [0, 0, 61]), lit('L3', [0, 0, 62])] } });
  assert.equal(events(three, 'game_over')[0].data.result, 'won');
  const lights = (n, k) => Array.from({ length: k }, (_, i) => lit(`L${i + 1}`, [0, 0, 60 + i]));
  const n2 = (k) => events(run({ seed: 1, night: 2, ticks: 500, scenario: { ...quiet, time_left_s: 1, lanterns: lights(6, k) } }), 'game_over')[0].data.result;
  assert.deepEqual([n2(3), n2(4)], ['lost', 'won']);
  const n3 = (k) => events(run({ seed: 1, night: 3, ticks: 500, scenario: { ...quiet, time_left_s: 1, lanterns: lights(7, k) } }), 'game_over')[0].data.result;
  assert.deepEqual([n3(4), n3(5)], ['lost', 'won']);
});

test('[Ticket-03] hết Ngọn Lửa luôn thua no_flames, kể cả ở tick bình minh', () => {
  const rows = run({
    seed: 1, ticks: 5,
    scenario: { ...quiet, time_left_s: 1 / 60, player: { flames: 1 }, lanterns: [lit('L1', [0, 0, 60]), lit('L2', [0, 0, 61]), lit('L3', [0, 0, 62])], shades: [{ pos: [0.5, 1, 0], state: 'chase' }] },
  });
  assert.deepEqual(events(rows, 'game_over')[0].data, { result: 'lost', reason: 'no_flames' });
});

test('tất định: cùng seed/scenario/inputs ra output giống hệt', () => {
  for (const night of [1, 2, 3]) {
    const inputs = { frames: [{ tick: 0, move: [0.5, 1], cam_yaw_deg: 30 }, { tick: 300, pulse: true }, { tick: 400, dash: true }] };
    const a = run({ seed: 42, night, ticks: 2500, inputs });
    const b = run({ seed: 42, night, ticks: 2500, inputs });
    assert.deepEqual(a, b);
  }
});
