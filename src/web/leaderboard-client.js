// Phía trình duyệt: lưu vào máy chủ cục bộ (ghi ra đĩa); nếu không có máy chủ (web tĩnh) thì dùng localStorage.
import { addEntry, makeEntry, normalize } from '../leaderboard.js';

const LS = 'dao-den-long-leaderboard';

function localRead() {
  try {
    return normalize(JSON.parse(localStorage.getItem(LS) || '[]'));
  } catch {
    return [];
  }
}
function localWrite(entries) {
  try {
    localStorage.setItem(LS, JSON.stringify(entries));
  } catch {
    /* bỏ qua */
  }
}

export async function loadBoard() {
  try {
    const r = await fetch('/api/leaderboard', { cache: 'no-store' });
    if (r.ok) return { entries: (await r.json()).entries, where: 'đĩa' };
  } catch {
    /* không có máy chủ */
  }
  return { entries: localRead(), where: 'trình duyệt' };
}

/** Trả về { entries, where } hoặc ném lỗi nếu tên/điểm không hợp lệ. */
export async function saveScore({ name, score, nights_won, seed }) {
  const entry = makeEntry({ name, score, nights_won, seed }); // kiểm hợp lệ trước khi gửi
  try {
    const r = await fetch('/api/leaderboard', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, score, nights_won, seed }) });
    if (r.ok) return { entries: (await r.json()).entries, where: 'đĩa' };
  } catch {
    /* rơi xuống localStorage */
  }
  const entries = addEntry(localRead(), entry);
  localWrite(entries);
  return { entries, where: 'trình duyệt' };
}
