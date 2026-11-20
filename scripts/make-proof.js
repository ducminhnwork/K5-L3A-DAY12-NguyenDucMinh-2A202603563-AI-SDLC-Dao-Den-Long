// Sinh bằng chứng thật cho phase: chạy toàn bộ test + từng scenario headless và KIỂM TRA kết quả mong đợi.
// Dùng: node scripts/make-proof.js [phase]   (2, 3 hoặc 4; phase sau chạy lại manifest phase trước để kiểm hồi quy). Thoát khác 0 nếu có gì sai.
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

function runManifest(file, tag) {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.mkdirSync(`${dir}/runs`, { recursive: true });
  for (const m of manifest) {
    const base = `${dir}/runs/${tag}-${m.name}`;
    fs.writeFileSync(`${base}.scenario.json`, JSON.stringify(m.scenario));
    fs.writeFileSync(`${base}.inputs.json`, JSON.stringify(m.inputs));
    const r = spawnSync('node', ['src/headless.js', '--seed', '1', '--night', String(m.night), '--scenario', `${base}.scenario.json`, '--inputs', `${base}.inputs.json`, '--ticks', String(m.ticks), '--out', `${base}.jsonl`, '--snapshot-every', '10'], { encoding: 'utf8' });
    let ok = r.status === 0;
    let why = '';
    if (ok) {
      const rows = fs.readFileSync(`${base}.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
      const ev = (n) => rows.find((x) => x.type === 'event' && x.name === n);
      const snaps = rows.filter((x) => x.type === 'snapshot');
      const end = rows.at(-1);
      const e = m.expect;
      if (e.event && !ev(e.event)) { ok = false; why = `thiếu sự kiện ${e.event}`; }
      if (e.no_event && ev(e.no_event)) { ok = false; why = `không được có sự kiện ${e.no_event}`; }
      if (e.end_state && end.state !== e.end_state) { ok = false; why = `end.state=${end.state}`; }
      if (e.reason && ev('game_over')?.data.reason !== e.reason) { ok = false; why = `reason=${ev('game_over')?.data.reason}`; }
      if (e.capacity !== undefined && snaps.at(-1).player.capacity !== e.capacity) { ok = false; why = `capacity=${snaps.at(-1).player.capacity}`; }
      if (e.min_x !== undefined && snaps.at(-1).player.pos[0] < e.min_x) { ok = false; why = `x=${snaps.at(-1).player.pos[0]}`; }
      if (e.end_y !== undefined && Math.abs(snaps.at(-1).player.pos[1] - e.end_y) > 0.01) { ok = false; why = `y=${snaps.at(-1).player.pos[1]}`; }
      if (e.wind_active_at !== undefined && !snaps.find((s) => s.tick === e.wind_active_at)?.wind.active) { ok = false; why = 'gió chưa nổi'; }
    } else why = `exit=${r.status} ${r.stderr}`;
    if (!ok) failed = true;
    summary.push(`${ok ? 'PASS' : 'FAIL'} [${tag}] ${m.name} (${m.feature}) ${why}`);
  }
}

if (['2', '3', '4'].includes(phase)) {
  runManifest('scenarios/phase2/manifest.json', 'p2');
  if (phase !== '2') runManifest('scenarios/phase3/manifest.json', 'p3');
  // tất định: chạy hai lần cùng đầu vào, so từng byte
  const a = `${dir}/runs/determinism-a.jsonl`;
  const b = `${dir}/runs/determinism-b.jsonl`;
  for (const o of [a, b]) spawnSync('node', ['src/headless.js', '--seed', '7', '--night', '3', '--ticks', '3000', '--out', o]);
  const same = fs.readFileSync(a, 'utf8') === fs.readFileSync(b, 'utf8');
  if (!same) failed = true;
  summary.push(`${same ? 'PASS' : 'FAIL'} determinism (night 3, seed 7, 3000 tick)`);
  // hiệu năng: một Đêm đầy đủ (Mây nhiều lửa để chạy hết giờ)
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
if (phase === '4') {
  // soak thật (headless, 10 Đêm) và bench trong sandbox (renderer phần mềm: CHỈ để chứng minh lệnh chạy được, số đo không đại diện)
  const sk = spawnSync('node', ['scripts/soak.js', '--seed', '7', '--nights', '10', '--out', `${dir}/soak-sandbox.json`], { encoding: 'utf8' });
  summary.push(`${sk.status === 0 ? 'PASS' : 'FAIL'} soak 10 Đêm (sandbox) exit=${sk.status}`);
  if (sk.status !== 0) failed = true;
  if (process.env.PROOF_BENCH !== '0') {
    const bn = spawnSync('node', ['scripts/bench.js', '--seed', '42', '--duration', '5', '--out', `${dir}/bench-sandbox.json`], { encoding: 'utf8', env: { ...process.env, BENCH_HEADLESS: '1' } });
    summary.push(`${bn.status === 0 ? 'PASS' : 'FAIL'} bench chạy được (sandbox, renderer phần mềm, 5 s; số đo KHÔNG đại diện) exit=${bn.status}`);
    if (bn.status !== 0) failed = true;
  }
}
fs.writeFileSync(`${dir}/summary.txt`, summary.join('\n') + '\n');
console.log(summary.join('\n'));
process.exit(failed ? 1 : 0);
