#!/usr/bin/env node
// Soak test: chạy headless N Đêm liên tiếp trong một tiến trình.
//   node scripts/soak.js --seed 7 --nights 10 --out soak.json
import fs from 'node:fs';
import v8 from 'node:v8';
import vm from 'node:vm';
import { Sim, defaultInput } from '../src/sim/sim.js';
import { mulberry32 } from '../src/sim/rng.js';

v8.setFlagsFromString('--expose_gc');
const gc = vm.runInNewContext('gc');
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const seed = Number(opt('--seed', 7));
const nights = Number(opt('--nights', 10));
const out = opt('--out');
if (!Number.isInteger(seed) || !Number.isInteger(nights) || nights < 1 || !out) {
  process.stderr.write('usage: soak --seed <int> --nights <int> --out <file.json>\n');
  process.exit(2);
}
const mb = () => Math.round((process.memoryUsage().rss / 1048576) * 10) / 10;
const settle = () => { gc(); gc(); };

// Làm nóng V8 (JIT, bộ nhớ đệm) như một phần của "tải xong": đo thực tế RSS tăng ~20 MB sau Đêm đầu rồi đi ngang,
// nên nếu không làm nóng thì mem_start đo lúc chưa JIT sẽ làm phép so 1.2x sai chứ không phản ánh rò rỉ.
function warmUp() {
  for (let n = 1; n <= 3; n++) {
    const w = new Sim({ seed: 1, night: n, scenario: { player: { flames: 99 } } });
    const r = mulberry32(n);
    const inp = defaultInput();
    for (let t = 0; t < 4000 && !w.over; t++) {
      if (t % 30 === 0) { const a = r() * Math.PI * 2; inp.move = [Math.cos(a), Math.sin(a)]; }
      inp.jump = r() < 0.05; inp.dash = r() < 0.03; inp.pulse = r() < 0.02; inp.interact = r() < 0.1;
      w.step(inp);
    }
  }
}
warmUp();

let crashes = 0;
const results = [];
let memStart = null;
const t0 = Date.now();

for (let i = 0; i < nights; i++) {
  const night = (i % 3) + 1; // Đêm 1 -> 2 -> 3 xoay vòng
  let sim = null;
  try {
    sim = new Sim({ seed: seed + i, night });
    if (i === 0) {
      settle();
      memStart = mb();
    }
    const rng = mulberry32(seed + i);
    const input = defaultInput();
    let dir = [0, 1];
    for (let tick = 0; !sim.over; tick++) {
      if (tick % 30 === 0) {
        const a = rng() * Math.PI * 2;
        dir = [Math.cos(a), Math.sin(a)];
      }
      input.move = dir;
      input.jump = rng() < 0.05;
      input.dash = rng() < 0.03;
      input.pulse = rng() < 0.02;
      input.interact = rng() < 0.1;
      sim.step(input);
      if (tick > 100000) throw new Error('Đêm không kết thúc');
    }
    results.push(sim.state);
  } catch (e) {
    crashes += 1;
    results.push('crash');
    process.stderr.write(`Đêm ${i + 1} lỗi: ${e.stack}\n`);
  }
  sim = null; // reset Đêm
}
settle();
const result = {
  nights,
  crashes,
  results,
  mem_start_mb: memStart,
  mem_end_mb: mb(),
  note: 'mem_start đo sau khi làm nóng V8 (warm-up 3 x 4000 tick) và gc; xem docs/notes/phase-4-assumptions.md',
  duration_s: Math.round(((Date.now() - t0) / 1000) * 10) / 10,
};
fs.writeFileSync(out, JSON.stringify(result));
console.log(JSON.stringify(result));
process.exit(crashes === 0 && result.mem_end_mb <= 1.2 * memStart ? 0 : 1);
