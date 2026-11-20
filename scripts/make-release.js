#!/usr/bin/env node
// Tạo bản Release chạy được: release/dao-den-long-v1.0.0.zip (chỉ cần Node 18+, không cần npm install).
//   npm run release   ->  giải nén, rồi:  node scripts/run.js
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ver = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const name = `dao-den-long-v${ver}`;
const root = path.join('release', name);
fs.rmSync('release', { recursive: true, force: true });
const sh = process.platform === 'win32';
const b = spawnSync(sh ? 'npx.cmd' : 'npx', ['vite', 'build'], { stdio: 'inherit', shell: sh });
if (b.status !== 0) process.exit(1);
const copy = (from, to = from) => {
  fs.mkdirSync(path.dirname(path.join(root, to)), { recursive: true });
  fs.cpSync(from, path.join(root, to), { recursive: true });
};
for (const f of ['dist', 'scripts/run.js', 'scripts/server.js', 'src/leaderboard.js', 'src/leaderboard-store.js', 'LICENSE', 'CREDITS.md']) copy(f);
fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name, version: ver, type: 'module', scripts: { start: 'node scripts/run.js' } }, null, 2));
fs.writeFileSync(path.join(root, 'RUN.md'), `# Đảo Đèn Lồng v${ver} (bản chạy sẵn)\n\nCần Node.js 18 trở lên. Không cần cài thêm gì:\n\n    node scripts/run.js\n\nTrình duyệt sẽ mở http://localhost:5173/ (thêm --no-open để tự mở, --port 8080 để đổi cổng).\nBảng xếp hạng lưu ở data/leaderboard.json cạnh thư mục này; xuất ra bằng:\n\n    node scripts/run.js --export-leaderboard out.json\n`);
const zip = path.join('release', `${name}.zip`);
const z = process.platform === 'win32'
  ? spawnSync('tar', ['-a', '-c', '-f', zip, '-C', 'release', name], { stdio: 'inherit' })
  : spawnSync('zip', ['-qr', path.resolve(zip), name], { cwd: 'release', stdio: 'inherit' });
if (z.status !== 0) { process.stderr.write('Không tạo được file zip; thư mục release/' + name + ' vẫn dùng được.\n'); process.exit(1); }
console.log(`OK: ${zip}`);
