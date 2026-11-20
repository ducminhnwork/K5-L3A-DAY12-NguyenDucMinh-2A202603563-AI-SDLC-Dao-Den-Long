#!/usr/bin/env node
// Benchmark: node scripts/bench.js --seed 42 --duration 30 --out bench.json
// Mở Chrome/Edge (cửa sổ 1280x720, không toàn màn hình, tắt vsync bằng cờ dòng lệnh), chạy ?bench=1, ghi bench.json.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createServer, ensureBuilt } from './server.js';
import { benchStats } from '../src/bench-stats.js';

const T_PROCESS_START = performance.timeOrigin; // mốc "bắt đầu tiến trình"
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const seed = Number(opt('--seed', 42));
const duration = Number(opt('--duration', 30));
const out = opt('--out');
if (!out || !Number.isFinite(duration) || duration <= 0 || !Number.isInteger(seed)) {
  process.stderr.write('usage: bench --seed 42 --duration 30 --out bench.json\n');
  process.exit(2);
}

function findBrowser() {
  const env = process.env.CHROME_PATH;
  if (env && fs.existsSync(env)) return env;
  const c = {
    win32: ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'],
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'],
  }[process.platform] ?? [];
  const hit = c.find((p) => fs.existsSync(p));
  if (hit) return hit;
  // playwright (nếu có sẵn) làm phương án cuối
  const pw = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(pw)) {
    for (const d of fs.readdirSync(pw).filter((x) => x.startsWith('chromium'))) {
      for (const rel of ['chrome-linux/chrome', 'chrome-win/chrome.exe', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
        const p = path.join(pw, d, rel);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return null;
}

/** RSS (MB) của tất cả tiến trình trình duyệt thuộc thư mục hồ sơ tạm này; null nếu không đo được. */
function browserRssMb(marker) {
  try {
    if (process.platform === 'win32') {
      const ps = `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${marker}*' } | Measure-Object WorkingSetSize -Sum | Select -ExpandProperty Sum`;
      const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
      const v = Number(String(r.stdout).trim());
      return Number.isFinite(v) && v > 0 ? v / 1048576 : null;
    }
    const r = spawnSync('ps', ['-eo', 'rss,args'], { encoding: 'utf8' });
    let kb = 0;
    for (const line of String(r.stdout).split('\n')) if (line.includes(marker)) kb += Number(line.trim().split(/\s+/)[0]) || 0;
    return kb > 0 ? kb / 1024 : null;
  } catch {
    return null;
  }
}

await ensureBuilt();
const browser = findBrowser();
if (!browser) {
  process.stderr.write('error: không tìm thấy Chrome/Edge. Đặt biến CHROME_PATH tới chrome.exe rồi chạy lại.\n');
  process.exit(1);
}

let firstFrameAt = null;
let rendererName = null;
let resolveResult;
const resultP = new Promise((r) => { resolveResult = r; });
const server = createServer({
  hooks: {
    '/__bench/first-frame': (j) => { firstFrameAt ??= Date.now(); rendererName = j.renderer ?? rendererName; },
    '/__bench/result': (j) => resolveResult(j),
  },
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-bench-'));
const marker = path.basename(profile);
const headless = process.env.BENCH_HEADLESS === '1'; // chỉ dùng cho CI/sandbox, số đo không đại diện
const flags = [
  `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--window-size=1280,720', '--window-position=0,0',
  '--disable-gpu-vsync', '--disable-frame-rate-limit', // tắt vsync
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  ...(headless ? ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] : []),
  ...(process.env.BENCH_EXTRA_FLAGS ? process.env.BENCH_EXTRA_FLAGS.split(' ') : []),
  `--app=http://127.0.0.1:${port}/?bench=1&seed=${seed}&duration=${duration}`,
];
const t0 = Date.now();
const child = spawn(browser, flags, { stdio: 'ignore' });
let peak = 0;
const sampler = setInterval(() => {
  const m = browserRssMb(marker);
  if (m && m > peak) peak = m;
}, 500);
const timeout = setTimeout(() => {
  process.stderr.write('error: quá thời gian chờ benchmark\n');
  cleanup();
  process.exit(1);
}, (duration + 60) * 1000);
function cleanup() {
  clearInterval(sampler);
  clearTimeout(timeout);
  try { child.kill(); } catch { /* đã thoát */ }
  server.close();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* Windows có thể còn khoá */ }
}
child.on('error', (e) => { process.stderr.write(`error: không mở được trình duyệt: ${e.message}\n`); cleanup(); process.exit(1); });

const res = await resultP;
const stats = benchStats(res.dts);
// load_ms: từ lúc tiến trình bench bắt đầu tới khung hình benchmark đầu tiên (gồm cả build nếu dist chưa có)
const load_ms = Math.round((firstFrameAt ?? Date.now()) - T_PROCESS_START);
const result = {
  contract_version: '1.3',
  ...stats,
  load_ms,
  peak_mem_mb: peak > 0 ? Math.round(peak * 10) / 10 : null,
  vsync_off: !process.env.BENCH_KEEP_VSYNC, // cờ --disable-gpu-vsync đã truyền; Chrome không báo lại xác nhận, xem README
  renderer: res.renderer ?? rendererName ?? 'unknown',
  os: `${os.type()} ${os.release()} ${os.arch()}`,
};
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
cleanup();
process.exit(0);
