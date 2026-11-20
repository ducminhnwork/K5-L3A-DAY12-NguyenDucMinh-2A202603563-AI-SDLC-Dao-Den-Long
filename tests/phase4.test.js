// Ticket-04 "Bình minh" (contract v1.3): bảng xếp hạng, bench, soak, xuất bảng xếp hạng, hợp đồng.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateName, makeEntry, addEntry, normalize, isoWithOffset, qualifies, MAX_ENTRIES } from '../src/leaderboard.js';
import { benchStats } from '../src/bench-stats.js';
import { Sim, defaultInput } from '../src/sim/sim.js';
import { runSim } from '../src/sim/run.js';
import { findConflict, DEFAULT_KEYS, ACTIONS } from '../src/web/settings.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-'));
const e = (name, score, at, extra = {}) => ({ name, score, nights_won: 1, achieved_at: at, seed: 1, ...extra });

test('tên hợp lệ: 3-12 ký tự [A-Za-z0-9_] (cho phép chữ có dấu)', () => {
  for (const ok of ['abc', 'Minh_123', 'A'.repeat(12), 'Đức_Minh']) assert.equal(validateName(ok), true, ok);
  for (const bad of ['ab', 'A'.repeat(13), 'có space', 'a-b', '', 'a<b>c', 42, null]) assert.equal(validateName(bad), false, String(bad));
});

test('bảng xếp hạng: điểm giảm dần, bằng điểm thì đạt trước đứng trên, chỉ giữ top 10', () => {
  let list = [];
  list = addEntry(list, e('late', 100, '2026-01-02T00:00:00+07:00'));
  list = addEntry(list, e('early', 100, '2026-01-01T00:00:00+07:00'));
  list = addEntry(list, e('best', 500, '2026-01-03T00:00:00+07:00'));
  assert.deepEqual(list.map((x) => x.name), ['best', 'early', 'late']);
  for (let i = 0; i < 12; i++) list = addEntry(list, e(`p${String(i).padStart(2, '0')}`, i * 10, '2026-02-01T00:00:00+07:00'));
  assert.equal(list.length, MAX_ENTRIES);
  assert.equal(list[0].name, 'best');
  assert.ok(list.every((x, i) => i === 0 || list[i - 1].score >= x.score));
  assert.equal(qualifies(list, 0), false);
  assert.equal(qualifies(list, 99999), true);
});

test('so thời điểm theo thời gian thực, kể cả khác múi giờ', () => {
  const list = normalize([e('aaa', 10, '2026-01-01T10:00:00+07:00'), e('bbb', 10, '2026-01-01T02:00:00Z')]); // 03:00Z vs 02:00Z
  assert.deepEqual(list.map((x) => x.name), ['bbb', 'aaa']);
});

test('makeEntry: kiểm tra đầu vào và ISO 8601 có múi giờ', () => {
  const ent = makeEntry({ name: 'Minh_1', score: 120, nights_won: 2, seed: 9 });
  assert.match(ent.achieved_at, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
  assert.match(isoWithOffset(new Date(0)), /[+-]\d\d:\d\d$/);
  assert.throws(() => makeEntry({ name: 'x', score: 1, nights_won: 0, seed: 1 }));
  assert.throws(() => makeEntry({ name: 'abcd', score: -1, nights_won: 0, seed: 1 }));
  assert.throws(() => makeEntry({ name: 'abcd', score: 1, nights_won: 4, seed: 1 }));
});

function cli(args, env = {}) {
  return spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, ...env } });
}

test('--export-leaderboard ghi {"entries":[...]} đúng thứ tự, bền qua các lần chạy', () => {
  const d = tmp();
  const file = path.join(d, 'lb.json');
  fs.writeFileSync(file, JSON.stringify({ entries: [e('low', 5, '2026-01-01T00:00:00+07:00'), e('high', 50, '2026-01-01T00:00:00+07:00')] }));
  const out = path.join(d, 'out.json');
  const r = cli(['scripts/run.js', '--export-leaderboard', out], { LEADERBOARD_FILE: file });
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.deepEqual(j.entries.map((x) => x.name), ['high', 'low']);
  const none = cli(['scripts/run.js', '--export-leaderboard', path.join(d, 'o2.json')], { LEADERBOARD_FILE: path.join(d, 'khong-co.json') });
  assert.equal(none.status, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(d, 'o2.json'), 'utf8')), { entries: [] });
  assert.equal(cli(['scripts/run.js', '--export-leaderboard']).status, 2);
});

test('benchStats: công thức avg_fps, p1_low (k = max(1, ceil(0.01N))), p95', () => {
  const dts = Array(100).fill(10);
  dts[0] = 50; // 1 khung xấu
  const s = benchStats(dts);
  assert.equal(s.frames, 100);
  assert.equal(s.avg_fps, Math.round((1000 * 100) / (99 * 10 + 50) * 100) / 100);
  assert.equal(s.p1_low_fps, 20); // k = 1 -> 1000/50
  assert.equal(s.frame_ms_p95, 10);
  const small = benchStats([16, 17, 40]); // k = 1
  assert.equal(small.p1_low_fps, 25);
  assert.equal(benchStats([20, 20, 30, 30]).p1_low_fps, 33.33);
});

test('Sim bench: giữ nguyên 200 Bóng Mực wander, không spawn/sát thương/kết thúc', () => {
  const sim = new Sim({ seed: 42, night: 1, bench: true });
  for (let i = 0; i < 200; i++) sim.addShade(((i * 7) % 40) - 20, 1, ((i * 13) % 40) - 20, undefined, 'wander', 0);
  for (let t = 0; t < 60 * 20; t++) sim.step(defaultInput());
  assert.equal(sim.over, false);
  assert.equal(sim.shades.length, 200);
  assert.ok(sim.shades.every((s) => s.state === 'wander'));
  assert.equal(sim.player.flames, 3);
});

test('bench không đổi đầu ra headless (cờ mặc định tắt)', () => {
  const a = runSim({ seed: 3, night: 1, ticks: 600, inputs: { frames: [] }, snapshotEvery: 60 });
  const b = runSim({ seed: 3, night: 1, ticks: 600, inputs: { frames: [] }, snapshotEvery: 60 });
  assert.deepEqual(a, b);
});

test('soak: 3 Đêm liên tiếp không lỗi, đúng khoá đầu ra', () => {
  const out = path.join(tmp(), 'soak.json');
  const r = cli(['scripts/soak.js', '--seed', '7', '--nights', '3', '--out', out]);
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(j.nights, 3);
  assert.equal(j.crashes, 0);
  assert.equal(j.results.length, 3);
  for (const k of ['mem_start_mb', 'mem_end_mb', 'duration_s']) assert.equal(typeof j[k], 'number');
  assert.ok(j.mem_end_mb <= 1.2 * j.mem_start_mb);
  assert.equal(cli(['scripts/soak.js']).status, 2);
});

test('hợp đồng v1.3 có bench_cmd, soak_cmd và vẫn giữ lệnh cũ', () => {
  const c = JSON.parse(fs.readFileSync('game.contract.json', 'utf8'));
  assert.equal(c.contract_version, '1.3');
  for (const k of ['build_cmd', 'run_cmd', 'headless_cmd', 'bench_cmd', 'soak_cmd']) assert.equal(typeof c[k], 'string', k);
  for (const k of ['bench_cmd', 'soak_cmd', 'run_cmd']) assert.ok(fs.existsSync(c[k].split(' ')[1]), c[k]);
});

test('đổi phím: phát hiện trùng phím, mặc định đủ 9 hành động và không trùng nhau', () => {
  assert.equal(ACTIONS.length, 9);
  assert.equal(new Set(Object.values(DEFAULT_KEYS)).size, 9);
  assert.equal(findConflict(DEFAULT_KEYS, 'e', 'jump'), 'Tương tác (nạp / châm dầu)');
  assert.equal(findConflict(DEFAULT_KEYS, 'e', 'interact'), null);
  assert.equal(findConflict(DEFAULT_KEYS, 'j', 'jump'), null);
});

test('chữ giao diện >= 18 px ở 1280x720 (kiểm tra CSS)', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /--fs:18px/);
  assert.match(html, /body\.large\{--fs:22\.5px\}/); // 18 x 1.25
  assert.doesNotMatch(html, /font-size:\s*(1[0-7]|[0-9])px/);
});
