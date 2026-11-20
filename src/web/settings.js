// Cài đặt được lưu giữa các lần mở game: âm lượng, độ nhạy chuột, mù màu, giảm chuyển động, chữ lớn, phím.
const KEY = 'dao-den-long-settings';

export const ACTIONS = [
  ['forward', 'Đi tới'],
  ['back', 'Đi lùi'],
  ['left', 'Sang trái'],
  ['right', 'Sang phải'],
  ['jump', 'Nhảy'],
  ['dash', 'Lướt'],
  ['interact', 'Tương tác (nạp / châm dầu)'],
  ['pulse', 'Toả sáng'],
  ['pause', 'Tạm dừng'],
];

export const DEFAULT_KEYS = Object.freeze({
  forward: 'w', back: 's', left: 'a', right: 'd', jump: ' ', dash: 'shift', interact: 'e', pulse: 'f', pause: 'p',
});

const DEFAULTS = { volume: 60, sens: 40, colorblind: false, reduceMotion: false, largeText: false, keys: { ...DEFAULT_KEYS } };
let cache = null;

export function keyLabel(k) {
  if (k === ' ') return 'Space';
  if (k === 'shift') return 'Shift';
  if (k === 'control') return 'Ctrl';
  if (k === 'escape') return 'Esc';
  return k.length === 1 ? k.toUpperCase() : k;
}

/** Tìm hành động đang dùng phím này (trừ `except`). Trả về nhãn hoặc null. */
export function findConflict(keys, key, except) {
  for (const [id, label] of ACTIONS) if (id !== except && keys[id] === key) return label;
  return null;
}

export function loadSettings() {
  if (cache) return cache;
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    raw = {};
  }
  cache = { ...DEFAULTS, ...raw, keys: { ...DEFAULT_KEYS, ...(raw.keys ?? {}) } };
  return cache;
}

export function saveSettings(s) {
  cache = { ...DEFAULTS, ...s, keys: { ...DEFAULT_KEYS, ...(s.keys ?? {}) } };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* trình duyệt chặn storage: vẫn dùng bản trong bộ nhớ */
  }
}
