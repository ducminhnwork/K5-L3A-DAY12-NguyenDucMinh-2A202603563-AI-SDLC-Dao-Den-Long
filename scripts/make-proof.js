// Sinh bằng chứng thật: chạy test + một lượt headless, ghi vào docs/proof/phase-1/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const dir = 'docs/proof/phase-1';
fs.mkdirSync(dir, { recursive: true });
const t = spawnSync('node', ['--test'], { encoding: 'utf8' });
fs.writeFileSync(`${dir}/test-output.txt`, t.stdout + t.stderr);
const h = spawnSync('node', ['src/headless.js', '--seed', '1', '--night', '1', '--scenario', 'scenarios/win-one-lantern.json',
  '--inputs', 'scenarios/win-one-lantern.inputs.json', '--ticks', '600', '--out', `${dir}/sample-run.jsonl`], { encoding: 'utf8' });
fs.writeFileSync(`${dir}/headless-exit.txt`, `exit=${h.status}\n${h.stderr}`);
console.log(`tests exit=${t.status}, headless exit=${h.status}`);
process.exit(t.status || h.status);
