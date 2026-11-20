// Lưu bảng xếp hạng trên đĩa (Node). Mặc định: <thư mục dự án>/data/leaderboard.json, đổi bằng LEADERBOARD_FILE.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize } from './leaderboard.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const defaultFile = () => process.env.LEADERBOARD_FILE || path.join(ROOT, 'data', 'leaderboard.json');

export function readEntries(file = defaultFile()) {
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    return normalize(Array.isArray(j) ? j : j.entries ?? []);
  } catch {
    return [];
  }
}

export function writeEntries(entries, file = defaultFile()) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ entries: normalize(entries) }, null, 2));
  fs.renameSync(tmp, file);
}
