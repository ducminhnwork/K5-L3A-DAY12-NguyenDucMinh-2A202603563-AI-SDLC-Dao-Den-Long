import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TUNING } from '../src/sim/config.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-'));
const w = (name, content) => {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, content);
  return p;
};
const cli = (...args) => spawnSync('node', ['src/headless.js', ...args], { encoding: 'utf8' });
const base = (out) => ['--seed', '1', '--night', '1', '--ticks', '30', '--out', out];

test('game.contract.json khớp TUNING thật sự dùng trong game', () => {
  const c = JSON.parse(fs.readFileSync('game.contract.json', 'utf8'));
  assert.equal(c.contract_version, '1.0');
  assert.deepEqual(c.tuning, JSON.parse(JSON.stringify(TUNING)));
  for (const k of ['team', 'build_cmd', 'run_cmd', 'headless_cmd']) assert.ok(c[k]);
});

test('headless: exit 0, dòng cuối là end, snapshot mỗi 10 tick mặc định', () => {
  const out = path.join(tmp, 'a.jsonl');
  const r = cli(...base(out));
  assert.equal(r.status, 0, r.stderr);
  const rows = fs.readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(rows.at(-1), { type: 'end', ticks: 30, state: 'playing', score: 0 });
  assert.deepEqual(rows.filter((r) => r.type === 'snapshot').map((r) => r.tick), [0, 10, 20, 30]);
});

test('headless: --snapshot-every tuỳ chỉnh', () => {
  const out = path.join(tmp, 'b.jsonl');
  assert.equal(cli(...base(out), '--snapshot-every', '15').status, 0);
  const t = fs.readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => r.type === 'snapshot').map((r) => r.tick);
  assert.deepEqual(t, [0, 15, 30]);
});

test('headless: inputs hỏng -> exit 2 và thông báo ở stderr', () => {
  const bad = w('bad.json', '{"frames":[{"tick":5},{"tick":3}]}');
  const r = cli(...base(path.join(tmp, 'c.jsonl')), '--inputs', bad);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /tick/);
});

test('headless: JSON không hợp lệ / move ngoài [-1,1] / scenario sai -> exit 2', () => {
  assert.equal(cli(...base(path.join(tmp, 'd.jsonl')), '--inputs', w('x.json', '{oops')).status, 2);
  assert.equal(cli(...base(path.join(tmp, 'd.jsonl')), '--inputs', w('y.json', '{"frames":[{"tick":0,"move":[2,0]}]}')).status, 2);
  assert.equal(cli(...base(path.join(tmp, 'd.jsonl')), '--scenario', w('z.json', '{"lanterns":[{"id":"L9"}]}')).status, 2);
  assert.equal(cli(...base(path.join(tmp, 'd.jsonl')), '--scenario', w('q.json', '{"motes":[[1,2]]}')).status, 2);
});

test('headless: thiếu tham số / file không tồn tại -> mã khác 0', () => {
  assert.notEqual(cli('--seed', '1').status, 0);
  assert.notEqual(cli(...base(path.join(tmp, 'e.jsonl')), '--inputs', path.join(tmp, 'none.json')).status, 0);
});

test('headless: cùng tham số cho file byte-giống nhau', () => {
  const a = path.join(tmp, 'f1.jsonl');
  const b = path.join(tmp, 'f2.jsonl');
  cli('--seed', '7', '--night', '1', '--ticks', '600', '--out', a);
  cli('--seed', '7', '--night', '1', '--ticks', '600', '--out', b);
  assert.equal(fs.readFileSync(a, 'utf8'), fs.readFileSync(b, 'utf8'));
});
