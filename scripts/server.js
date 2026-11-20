// Máy chủ cục bộ rất nhỏ: phục vụ thư mục dist/ và lưu bảng xếp hạng + nhận kết quả benchmark.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEntries, writeEntries } from '../src/leaderboard-store.js';
import { addEntry, makeEntry } from '../src/leaderboard.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};

function body(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 1e6) reject(new Error('quá lớn')); });
    req.on('end', () => resolve(d));
    req.on('error', reject);
  });
}

/** hooks: { '/__bench/first-frame': fn(json), '/__bench/result': fn(json) } cho script bench. */
export function createServer({ dist = path.join(ROOT, 'dist'), hooks = {} } = {}) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const send = (code, obj) => {
      res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify(obj));
    };
    try {
      if (url.pathname === '/api/leaderboard') {
        if (req.method === 'GET') return send(200, { entries: readEntries() });
        if (req.method === 'POST') {
          const entry = makeEntry({ ...JSON.parse((await body(req)) || '{}'), now: undefined });
          const entries = addEntry(readEntries(), entry);
          writeEntries(entries);
          return send(200, { entries });
        }
      }
      if (hooks[url.pathname] && req.method === 'POST') {
        await hooks[url.pathname](JSON.parse((await body(req)) || '{}'));
        return send(200, { ok: true });
      }
      let p = decodeURIComponent(url.pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.normalize(path.join(dist, p));
      if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        return res.end('404');
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
      return fs.createReadStream(file).pipe(res);
    } catch (e) {
      return send(400, { error: String(e.message ?? e) });
    }
  });
}

export function ensureBuilt(dist = path.join(ROOT, 'dist')) {
  if (fs.existsSync(path.join(dist, 'index.html'))) return;
  // eslint-disable-next-line global-require
  return import('node:child_process').then(({ spawnSync }) => {
    const vite = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');
    const r = spawnSync(vite, ['build'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
    if (r.status !== 0) throw new Error('Không build được (chạy "npm install" trước).');
  });
}
