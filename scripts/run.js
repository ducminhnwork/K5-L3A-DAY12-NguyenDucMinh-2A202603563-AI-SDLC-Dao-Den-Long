#!/usr/bin/env node
// Chạy game: node scripts/run.js [--port 5173] [--no-open] | --export-leaderboard out.json
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer, ensureBuilt } from './server.js';
import { readEntries } from '../src/leaderboard-store.js';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

if (args.includes('--export-leaderboard')) {
  const out = opt('--export-leaderboard');
  if (!out) {
    process.stderr.write('error: thiếu đường dẫn sau --export-leaderboard\n');
    process.exit(2);
  }
  fs.writeFileSync(out, JSON.stringify({ entries: readEntries() }, null, 2));
  process.exit(0);
}

await ensureBuilt();
const port = Number(opt('--port') ?? process.env.PORT ?? 5173);
const server = createServer();
server.on('error', (e) => {
  process.stderr.write(`error: không mở được cổng ${port}: ${e.message}\n`);
  process.exit(1);
});
server.listen(port, () => {
  const url = `http://localhost:${port}/`;
  console.log(`Đảo Đèn Lồng đang chạy tại ${url}  (Ctrl+C để dừng)`);
  if (args.includes('--no-open')) return;
  const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try {
    spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch {
    /* không mở được trình duyệt: người dùng tự mở URL */
  }
});
