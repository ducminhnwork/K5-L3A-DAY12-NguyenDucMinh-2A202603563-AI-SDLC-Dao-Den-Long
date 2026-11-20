// Sinh bằng chứng thật cho phase: chạy toàn bộ test + từng scenario headless và KIỂM TRA kết quả mong đợi.
// Dùng: node scripts/make-proof.js [phase]   (mặc định 2). Thoát khác 0 nếu có gì sai.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const phase = process.argv[2] ?? '2';
const dir = `docs/proof/phase-${phase}`;
fs.mkdirSync(dir, { recursive: true });
let failed = false;

const t = spawnSync('node', ['--test'], { encoding: 'utf8' });
fs.writeFileSync(`${dir}/test-output.txt`, t.stdout + t.stderr);
if (t.status !== 0) failed = true;
const summary = [`tests exit=${t.status}`];

if (phase === '2') {
  const manifest = JSON.parse(fs.readFileSync('scenarios/phase2/manifest.json', 'utf8'));
  fs.mkdirSync(`${dir}/runs`, { recursive: true });
  for (const m of manifest) {
    const sc = `${dir}/runs/${m.name}.scenario.json`;
    const inp = `${dir}/runs/${m.name}.inputs.json`;
    const out = `${dir}/runs/${m.name}.jsonl`;
    fs.writeFileSync(sc, JSON.stringify(m.scenario));
    fs.writeFileSync(inp, JSON.stringify(m.inputs));
    const r = spawnSync('node', ['src/headless.js', '--seed', '1', '--night', String(m.night), '--scenario', sc, '--inputs', inp, '--ticks', String(m.ticks), '--out', out, '--snapshot-every', '10'], { encoding: 'utf8' });
    let ok = r.status === 0;
    let why = '';
    if (ok) {
      const rows = fs.readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
      const ev = (n) => rows.some((x) => x.type === 'event' && x.name === n);
      const snaps = rows.filter((x) => x.type === 'snapshot');
      const end = rows.at(-1);
      const e = m.expect;
      if (e.event && !ev(e.event)) { ok = false; why = `thiếu sự kiện ${e.event}`; }
      if (e.no_event && ev(e.no_event)) { ok = false; why = `không được có sự kiện ${e.no_event}`; }
      if (e.end_state && end.state !== e.end_state) { ok = false; why = `end.state=${end.state}`; }
      if (e.min_x !== undefined && snaps.at(-1).player.pos[0] < e.min_x) { ok = false; why = `x=${snaps.at(-1).player.pos[0]}`; }
      if (e.end_y !== undefined && Math.abs(snaps.at(-1).player.pos[1] - e.end_y) > 0.01) { ok = false; why = `y=${snaps.at(-1).player.pos[1]}`; }
      if (e.wind_active_at !== undefined && !snaps.find((s) => s.tick === e.wind_active_at)?.wind.active) { ok = false; why = 'gió chưa nổi'; }
    } else why = `exit=${r.status} ${r.stderr}`;
    if (!ok) failed = true;
    summary.push(`${ok ? 'PASS' : 'FAIL'} ${m.name} (${m.feature}) ${why}`);
  }
  // tất định: chạy hai lần cùng đầu vào, so từng byte
  const a = `${dir}/runs/determinism-a.jsonl`;
  const b = `${dir}/runs/determinism-b.jsonl`;
  for (const o of [a, b]) spawnSync('node', ['src/headless.js', '--seed', '7', '--night', '3', '--ticks', '3000', '--out', o]);
  const same = fs.readFileSync(a, 'utf8') === fs.readFileSync(b, 'utf8');
  if (!same) failed = true;
  summary.push(`${same ? 'PASS' : 'FAIL'} determinism (night 3, seed 7, 3000 tick)`);
  // hiệu năng: một Đêm đầy đủ 21600 tick (Mây nhiều lửa để chạy hết giờ)
  fs.writeFileSync(`${dir}/runs/perf.scenario.json`, JSON.stringify({ player: { flames: 99 }, time_left_s: 400 }));
  for (const n of [1, 2, 3]) {
    const t0 = Date.now();
    const r = spawnSync('node', ['src/headless.js', '--seed', '9', '--night', String(n), '--ticks', '21600', '--scenario', `${dir}/runs/perf.scenario.json`, '--out', `${dir}/runs/perf-n${n}.jsonl`]);
    const sec = (Date.now() - t0) / 1000;
    summary.push(`perf night ${n}: ${sec.toFixed(2)} s (ngưỡng 30 s) exit=${r.status}`);
    if (sec > 30 || r.status !== 0) failed = true;
    fs.rmSync(`${dir}/runs/perf-n${n}.jsonl`, { force: true }); // file lớn, chỉ giữ số đo
  }
}
fs.writeFileSync(`${dir}/summary.txt`, summary.join('\n') + '\n');
console.log(summary.join('\n'));
process.exit(failed ? 1 : 0);
