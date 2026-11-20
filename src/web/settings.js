// Cài đặt (âm lượng, độ nhạy chuột) lưu giữa các lần mở game.
const KEY = 'dao-den-long-settings';
const DEFAULTS = { volume: 60, sens: 40 };
let cache = null;

export function loadSettings() {
  if (cache) return cache;
  try {
    cache = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export function saveSettings(s) {
  cache = { ...DEFAULTS, ...s };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* trình duyệt chặn storage: bỏ qua, vẫn dùng bản trong bộ nhớ */
  }
}
