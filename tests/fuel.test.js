// Test cho Ticket-03 "Đèn cạn dầu" (contract v1.2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { run, events, snaps, last, quiet, lit, near } from './helpers.js';

const hold = (extra) => ({ frames: [{ tick: 0, ...extra }] });
const press = (tick, key) => [{ tick, [key]: true }, { tick: tick + 1, [key]: false }];
const frames = (...parts) => ({ frames: parts.flat().sort((a, b) => a.tick - b.tick) });
const far = [lit('L2', [0, 0, 60]), lit('L3', [0, 0, 61]), lit('L4', [0, 0, 62]), lit('L5', [0, 0, 63])];
const lamp = (o) => ({ id: 'L1', pos: [0, 0, 1], ...o });

test('dầu: vừa thắp fuel=100, hao 1/giây (1/60 mỗi tick), snapshot có fuel/ever_lit/relit_count', () => {
  const rows = run({ seed: 1, ticks: 120, scenario: { ...quiet, player: { carried: 10 }, lanterns: [lamp()] }, inputs: frames(press(0, 'interact')) });
  const s = snaps(rows);
  assert.equal(s[1].lanterns[0].fuel, 100); // 99.98 làm tròn 1 chữ số
  assert.equal(s[1].lanterns[0].ever_lit, true);
  assert.equal(s[1].lanterns[0].relit_count, 0);
  assert.ok(near(s[61].lanterns[0].fuel, 99, 0.06), `fuel ${s[61].lanterns[0].fuel}`);
  assert.equal(s[0].lanterns[1].fuel, 0); // đèn tắt có fuel 0
  assert.equal(s[0].lanterns[1].ever_lit, false);
});

test('dầu: đèn đặt lit:true không có fuel mặc định 100; fuel đặt tay được tôn trọng', () => {
  const s0 = snaps(run({ seed: 1, ticks: 0, scenario: { ...quiet, lanterns: [lit('L1', [0, 0, 9]), { id: 'L2', pos: [0, 0, 8], lit: true, fuel: 42 }] } }))[0];
  assert.equal(s0.lanterns[0].fuel, 100);
  assert.equal(s0.lanterns[1].fuel, 42);
});

test('châm dầu: used = min(mang, ceil((100-fuel)/10)), +10/đom đóm, +5 điểm/đom đóm, sự kiện refuel, không có deposit', () => {
  const rows = run({
    seed: 1, ticks: 3,
    scenario: { ...quiet, player: { carried: 9 }, lanterns: [lamp({ lit: true, fuel: 33 })] },
    inputs: hold({ interact: true }),
  });
  const ev = events(rows, 'refuel')[0];
  assert.equal(ev.data.lantern_id, 'L1');
  assert.equal(ev.data.amount, 7); // ceil(67/10)
  assert.equal(ev.data.fuel, 100); // 33 + 70 = 103 -> chặn ở 100
  assert.equal(events(rows, 'deposit').length, 0);
  assert.equal(last(snaps(rows)).score, 7 * 5);
  assert.equal(last(snaps(rows)).player.carried, 2);
});

test('châm dầu: ít đom đóm thì châm một phần', () => {
  const rows = run({ seed: 1, ticks: 2, scenario: { ...quiet, player: { carried: 2 }, lanterns: [lamp({ lit: true, fuel: 10 })] }, inputs: hold({ interact: true }) });
  const ev = events(rows, 'refuel')[0];
  assert.deepEqual([ev.data.amount, ev.data.fuel], [2, 30]);
});

test('hết dầu: đèn tắt, deposited=0, lantern_out, ever_lit giữ nguyên, ambient giảm', () => {
  const rows = run({ seed: 1, ticks: 130, scenario: { ...quiet, lanterns: [{ id: 'L1', pos: [0, 0, 9], lit: true, fuel: 1 }, ...far.slice(0, 1)] } });
  const out = events(rows, 'lantern_out')[0];
  assert.deepEqual(out.data, { lantern_id: 'L1' });
  assert.equal(out.tick, 60);
  const s = snaps(rows);
  assert.equal(s[59].lanterns[0].lit, true);
  assert.equal(s[60].lanterns[0].lit, false);
  assert.equal(s[60].lanterns[0].fuel, 0);
  assert.equal(s[60].lanterns[0].deposited, 0);
  assert.equal(s[60].lanterns[0].ever_lit, true);
});

test('thắp lại: đèn từng sáng chỉ cần 5, đèn mới cần 10; +40 thắp lại, +100 thắp lần đầu; lantern_lit.relight', () => {
  const sc = (o) => ({ ...quiet, player: { carried: 10 }, lanterns: [lamp(o)] });
  const re = run({ seed: 1, ticks: 3, scenario: sc({ ever_lit: true }), inputs: hold({ interact: true }) });
  assert.deepEqual(events(re, 'deposit')[0].data, { lantern_id: 'L1', amount: 5, deposited: 5 });
  assert.deepEqual(events(re, 'lantern_lit')[0].data, { lantern_id: 'L1', relight: true });
  assert.equal(last(snaps(re)).score, 5 * 5 + 40);
  assert.equal(last(snaps(re)).lanterns[0].relit_count, 1);
  assert.equal(last(snaps(re)).lanterns[0].fuel, 100);
  const first = run({ seed: 1, ticks: 3, scenario: sc({}), inputs: hold({ interact: true }) });
  assert.deepEqual(events(first, 'lantern_lit')[0].data, { lantern_id: 'L1', relight: false });
  assert.equal(last(snaps(first)).score, 10 * 5 + 100);
});

test('sức chứa = 10 + 2 x successful_lights, tối đa 20; đèn đặt sẵn không tính; lần thắp tính cả thắp lại', () => {
  const cap = (n) => snaps(run({ seed: 1, ticks: 0, scenario: { ...quiet, player: { successful_lights: n } } }))[0].player.capacity;
  assert.deepEqual([cap(0), cap(1), cap(3), cap(5), cap(9)], [10, 12, 16, 20, 20]);
  const preset = snaps(run({ seed: 1, ticks: 0, scenario: { ...quiet, lanterns: [lit('L1', [0, 0, 9])] } }))[0];
  assert.equal(preset.player.capacity, 10);
  const rows = run({ seed: 1, ticks: 3, scenario: { ...quiet, player: { carried: 10 }, lanterns: [lamp()] }, inputs: hold({ interact: true }) });
  assert.equal(last(snaps(rows)).player.capacity, 12);
  const re = run({ seed: 1, ticks: 3, scenario: { ...quiet, player: { carried: 5 }, lanterns: [lamp({ ever_lit: true })] }, inputs: hold({ interact: true }) });
  assert.equal(last(snaps(re)).player.capacity, 12);
});

test('sức chứa: nhặt được nhiều hơn 10 khi đã thắp', () => {
  const motes = Array.from({ length: 15 }, () => [0, 0, 0]);
  const rows = run({ seed: 1, ticks: 2, scenario: { ...quiet, motes, player: { successful_lights: 3 } } });
  assert.equal(last(snaps(rows)).player.carried, 15); // 10 + 2x3 = 16 >= 15
  const capped = run({ seed: 1, ticks: 2, scenario: { ...quiet, motes, player: { successful_lights: 0 } } });
  assert.equal(last(snaps(capped)).player.carried, 10);
});

// ---------- vùng an toàn & hút dầu ----------
test('vùng an toàn chỉ còn khi fuel >= 30: đúng 30 còn, dưới 30 mất', () => {
  const at = (fuel) => {
    const rows = run({
      seed: 1, ticks: 2,
      scenario: { ...quiet, lanterns: [{ id: 'L1', pos: [0, 0, 20], lit: true, fuel }], shades: [{ id: 'S1', pos: [3, 1, 20], state: 'chase' }], player: { pos: [0, 0, 0], flames: 9 } },
    });
    return snaps(rows)[1].shades[0].pos;
  };
  const pOn = at(30.5); // sau 1 tick vẫn >= 30 => vùng còn: bóng bị đẩy ra mép 6 m
  assert.ok(Math.hypot(pOn[0], pOn[2] - 20) > 3.1);
  const pOff = at(29);
  assert.ok(Math.hypot(pOff[0], pOff[2] - 20) < 3.01); // không còn đẩy
});

test('Bóng wander đi tới đèn fuel<30 gần nhất, tới <= 2 m thì drain và đứng yên, hút 5/giây (+1 hao)', () => {
  const rows = run({
    seed: 1, ticks: 300,
    scenario: { ...quiet, player: { pos: [0, 0, -30], flames: 9 }, lanterns: [{ id: 'L2', pos: [20, 0, 0], lit: true, fuel: 29 }, { id: 'L1', pos: [-8, 0, 0], lit: true, fuel: 25 }, ...far.slice(2)], shades: [{ id: 'S1', pos: [-8, 1, 8], state: 'wander' }] },
  });
  const s = snaps(rows);
  const first = s.find((x) => x.shades[0].state === 'drain');
  assert.ok(first, 'phải vào drain');
  assert.equal(first.shades[0].target_lantern_id, 'L1'); // gần nhất, không phải L2
  const t0 = first.tick;
  const p0 = first.shades[0].pos;
  const f0 = first.lanterns.find((l) => l.id === 'L1').fuel;
  const later = s[t0 + 60];
  assert.deepEqual(later.shades[0].pos, p0); // đứng yên
  const f1 = later.lanterns.find((l) => l.id === 'L1').fuel;
  assert.ok(near(f0 - f1, 6, 0.15), `hút 5/s + hao 1/s => 6 mỗi giây, thực tế ${f0 - f1}`);
  assert.equal(events(rows, 'fuel_drain')[0].data.shade_id, 'S1');
});

test('fuel_drain ghi mỗi 60 tick; nhiều Bóng cộng dồn; đèn cạn thì tắt và Bóng về wander', () => {
  const rows = run({
    seed: 1, ticks: 400,
    scenario: { ...quiet, player: { pos: [0, 0, -40], flames: 9 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }, ...far], shades: [{ id: 'S1', pos: [1, 1, 0], state: 'drain', target_lantern_id: 'L1' }, { id: 'S2', pos: [-1, 1, 0], state: 'drain', target_lantern_id: 'L1' }] },
  });
  const d = events(rows, 'fuel_drain');
  assert.ok(d.length >= 2 && d[0].tick === 60);
  // 20 fuel với 11 fuel/s (5+5+1) => hết trong ~1.8 s
  const out = events(rows, 'lantern_out')[0];
  assert.ok(out.tick > 100 && out.tick < 115, `tick ${out.tick}`);
  const s = snaps(rows);
  assert.notEqual(s[out.tick + 1].shades[0].state, 'drain');
});

test('drain -> chase khi Mây vào trong 6 m; drain -> stunned khi trúng Tỏa Sáng (+15 điểm)', () => {
  const sc = (px, carried) => ({ ...quiet, player: { pos: [px, 0, 0], carried, flames: 9 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }, ...far], shades: [{ id: 'S1', pos: [0, 1, 1], state: 'drain', target_lantern_id: 'L1' }] });
  assert.equal(snaps(run({ seed: 1, ticks: 2, scenario: sc(5.9, 0) }))[1].shades[0].state, 'chase');
  assert.equal(snaps(run({ seed: 1, ticks: 2, scenario: sc(7, 0) }))[1].shades[0].state, 'drain');
  const rows = run({ seed: 1, ticks: 2, scenario: sc(4.5, 3), inputs: hold({ pulse: true }) });
  assert.equal(snaps(rows)[1].shades[0].state, 'stunned');
  assert.equal(last(snaps(rows)).score, 15);
});

test('drain -> wander khi cách đèn > 2 m hoặc khi fuel được châm lên >= 30; hết choáng về wander', () => {
  const far2 = run({ seed: 1, ticks: 2, scenario: { ...quiet, player: { pos: [0, 0, -40] }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }, ...far], shades: [{ id: 'S1', pos: [0, 1, 3], state: 'drain', target_lantern_id: 'L1' }] } });
  assert.notEqual(snaps(far2)[1].shades[0].state, 'drain');
  const refuel = run({ seed: 1, ticks: 3, scenario: { ...quiet, player: { pos: [12, 0, 0], carried: 3 }, lanterns: [{ id: 'L1', pos: [10, 0, 0], lit: true, fuel: 20 }, ...far], shades: [{ id: 'S1', pos: [10, 1, 1], state: 'drain', target_lantern_id: 'L1' }] }, inputs: hold({ interact: true }) });
  assert.ok(near(events(refuel, 'refuel')[0].data.fuel, 50, 0.2)); // tick đầu đèn bị hút 5/s + hao 1/s trước khi châm
  assert.notEqual(snaps(refuel)[2].shades[0].state, 'drain');
  const st = run({ seed: 1, ticks: 125, scenario: { ...quiet, player: { pos: [0, 0, -40] }, shades: [{ id: 'S1', pos: [0, 1, 0], state: 'stunned', state_ticks_left: 5 }] } });
  assert.equal(snaps(st)[4].shades[0].state, 'stunned');
  assert.equal(snaps(st)[5].shades[0].state, 'wander');
});

test('châm dầu lên >= 30 lúc Bóng trong vùng 6 m: bị đẩy ra mép <= 30 tick, không gây sát thương', () => {
  const rows = run({
    seed: 1, ticks: 40,
    scenario: { ...quiet, player: { pos: [0, 0, 1.5], carried: 3, flames: 9 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }, ...far], shades: [{ id: 'S1', pos: [0.4, 1, 0], state: 'chase' }] },
    inputs: frames(press(1, 'interact')),
  });
  const ev = events(rows, 'refuel')[0];
  assert.equal(ev.data.fuel, 50);
  assert.equal(events(rows, 'player_hit').filter((e) => e.tick > ev.tick).length, 0);
  const d = (k) => Math.hypot(snaps(rows)[k].shades[0].pos[0], snaps(rows)[k].shades[0].pos[2]);
  assert.ok(d(ev.tick + 31) >= 6 - 0.002);
});

test('Bóng đi về đèn tắt gần nhất khi không có đèn yếu', () => {
  const rows = run({ seed: 1, ticks: 60, scenario: { ...quiet, player: { pos: [0, 0, -40], flames: 9 }, lanterns: [{ id: 'L1', pos: [30, 0, 0] }, { id: 'L2', pos: [-5, 0, 0] }], shades: [{ id: 'S1', pos: [0, 1, 10], state: 'wander' }] } });
  assert.ok(snaps(rows)[60].shades[0].pos[2] < 10 - 1.5); // tiến về L2 (gần nhất)
});

test('tính dầu theo số nguyên 1/60: 3600 tick hao đúng 60.0, không lệch số thực', () => {
  const rows = run({ seed: 1, ticks: 3600, scenario: { ...quiet, time_left_s: 200, lanterns: [{ id: 'L1', pos: [0, 0, 9], lit: true }] } });
  assert.equal(last(snaps(rows)).lanterns[0].fuel, 40);
});

// ---------- điểm ----------
test('điểm: Tỏa Sáng trúng +5/con (không drain); thưởng thời gian đã bỏ', () => {
  const rows = run({ seed: 1, ticks: 2, scenario: { ...quiet, player: { carried: 3 }, shades: [{ pos: [2, 1, 0] }, { pos: [-2, 1, 0] }] }, inputs: hold({ pulse: true }) });
  assert.equal(last(snaps(rows)).score, 10);
  const win = run({ seed: 1, ticks: 700, scenario: { ...quiet, time_left_s: 1, player: { flames: 1 }, lanterns: [lit('L1', [0, 0, 60]), lit('L2', [0, 0, 61]), lit('L3', [0, 0, 62])] } });
  assert.equal(last(win).score, 3 * (50 + 99) + 50); // không có +2/giây
});

test('Đêm 2/3: ngưỡng thắng và thời lượng mới; tất định giữ nguyên với luật mới', () => {
  for (const night of [1, 2, 3]) {
    const a = run({ seed: 5, night, ticks: 3000, scenario: { player: { flames: 99 } } });
    const b = run({ seed: 5, night, ticks: 3000, scenario: { player: { flames: 99 } } });
    assert.deepEqual(a, b);
  }
  assert.deepEqual([1, 2, 3].map((n) => snaps(run({ seed: 1, night: n, ticks: 0 }))[0].time_left_s), [240, 270, 300]);
});
