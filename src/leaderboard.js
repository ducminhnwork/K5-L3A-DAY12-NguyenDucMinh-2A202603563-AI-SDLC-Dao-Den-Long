// Bảng xếp hạng: logic thuần, dùng chung cho web, server cục bộ và test.
export const MAX_ENTRIES = 10;
export const NAME_RE = /^[\p{L}\p{N}_]{3,12}$/u; // 3-12 ký tự; chữ có dấu tiếng Việt cũng được (điểm cộng)

export function validateName(name) {
  return typeof name === 'string' && NAME_RE.test(name);
}

const pad = (n, w = 2) => String(n).padStart(w, '0');

/** ISO 8601 có múi giờ cục bộ, ví dụ 2026-11-20T16:35:00+07:00. */
export function isoWithOffset(d = new Date()) {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const a = Math.abs(off);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`
  );
}

export function makeEntry({ name, score, nights_won, seed, now = new Date() }) {
  if (!validateName(name)) throw new Error('Tên phải dài 3-12 ký tự, chỉ gồm chữ, số hoặc dấu gạch dưới');
  if (!Number.isInteger(score) || score < 0) throw new Error('score phải là số nguyên >= 0');
  if (!Number.isInteger(nights_won) || nights_won < 0 || nights_won > 3) throw new Error('nights_won phải trong 0..3');
  if (!Number.isInteger(seed)) throw new Error('seed phải là số nguyên');
  return { name, score, nights_won, achieved_at: typeof now === 'string' ? now : isoWithOffset(now), seed };
}

export function isValidEntry(e) {
  return (
    e && validateName(e.name) && Number.isInteger(e.score) && e.score >= 0 &&
    Number.isInteger(e.nights_won) && e.nights_won >= 0 && e.nights_won <= 3 &&
    typeof e.achieved_at === 'string' && !Number.isNaN(Date.parse(e.achieved_at)) && Number.isInteger(e.seed)
  );
}

/** Điểm giảm dần; bằng điểm thì ai đạt trước đứng trên; vẫn bằng thì giữ thứ tự cũ. Chỉ giữ top 10. */
export function normalize(entries) {
  return entries
    .filter(isValidEntry)
    .map((e, i) => ({ e, i }))
    .sort((a, b) => b.e.score - a.e.score || Date.parse(a.e.achieved_at) - Date.parse(b.e.achieved_at) || a.i - b.i)
    .slice(0, MAX_ENTRIES)
    .map((x) => x.e);
}

export function addEntry(entries, entry) {
  return normalize([...entries, entry]);
}

/** Điểm này có vào được top 10 không (để biết có nên hỏi tên). */
export function qualifies(entries, score) {
  const top = normalize(entries);
  return top.length < MAX_ENTRIES || score > top[top.length - 1].score;
}
