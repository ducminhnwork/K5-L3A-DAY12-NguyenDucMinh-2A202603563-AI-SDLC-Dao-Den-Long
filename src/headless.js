#!/usr/bin/env node
// Chế độ headless theo Test Contract v1.0:
//   node src/headless.js --seed <int> --night 1 [--scenario f.json] [--inputs f.json]
//                        --ticks <int> --out f.jsonl [--snapshot-every <int>]
import fs from 'node:fs';
import { runSim } from './sim/run.js';
import { FormatError } from './sim/errors.js';

const USAGE =
  'usage: headless --seed <int> --night 1 [--scenario <file.json>] [--inputs <file.json>] ' +
  '--ticks <int> --out <file.jsonl> [--snapshot-every <int>]';

function fail(code, msg) {
  process.stderr.write(`error: ${msg}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) throw new FormatError(`tham số lạ: ${a}\n${USAGE}`);
    const key = a.slice(2);
    const val = argv[++i];
    if (val === undefined) throw new FormatError(`thiếu giá trị cho --${key}`);
    out[key] = val;
  }
  return out;
}

const toInt = (name, s, min) => {
  if (!/^-?\d+$/.test(String(s))) throw new FormatError(`--${name} phải là số nguyên`);
  const n = Number(s);
  if (n < min) throw new FormatError(`--${name} phải >= ${min}`);
  return n;
};

function readJson(file, what) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    throw new FormatError(`không đọc được ${what} "${file}": ${e.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new FormatError(`${what} "${file}" không phải JSON hợp lệ: ${e.message}`);
  }
}

try {
  const a = parseArgs(process.argv.slice(2));
  for (const req of ['seed', 'night', 'ticks', 'out']) {
    if (!(req in a)) throw new FormatError(`thiếu --${req}\n${USAGE}`);
  }
  const seed = toInt('seed', a.seed, 0);
  const night = toInt('night', a.night, 1);
  if (night > 3) throw new FormatError('--night phải là 1, 2 hoặc 3');
  const ticks = toInt('ticks', a.ticks, 0);
  const snapshotEvery = 'snapshot-every' in a ? toInt('snapshot-every', a['snapshot-every'], 1) : 10;
  const scenario = 'scenario' in a ? readJson(a.scenario, 'scenario') : {};
  const inputs = 'inputs' in a ? readJson(a.inputs, 'inputs') : { frames: [] };

  const lines = runSim({ seed, night, scenario, inputs, ticks, snapshotEvery });
  fs.writeFileSync(a.out, lines.join('\n') + '\n');
  process.exit(0);
} catch (e) {
  if (e instanceof FormatError) fail(2, e.message);
  fail(1, e && e.stack ? e.stack : String(e));
}
