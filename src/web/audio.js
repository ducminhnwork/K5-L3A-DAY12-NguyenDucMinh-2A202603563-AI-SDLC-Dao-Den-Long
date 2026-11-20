// Âm thanh tổng hợp bằng WebAudio (không dùng file ngoài): nhạc nền đêm + hiệu ứng.
import { loadSettings } from './settings.js';

let ctx = null;
let master = null;
let musicTimer = null;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  applyVolume();
  return true;
}

export function applyVolume() {
  if (master) master.gain.value = (loadSettings().volume / 100) * 0.5;
}

function tone(freq, dur, { type = 'sine', gain = 0.3, slide = 0, delay = 0 } = {}) {
  if (!ensure()) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  pick: () => tone(880, 0.12, { gain: 0.2, slide: 400 }),
  light: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, { delay: i * 0.08, gain: 0.25 })),
  pulse: () => tone(300, 0.5, { type: 'triangle', slide: 700, gain: 0.3 }),
  hit: () => tone(140, 0.4, { type: 'sawtooth', slide: -90, gain: 0.35 }),
  jump: () => tone(380, 0.15, { type: 'square', slide: 300, gain: 0.1 }),
  dash: () => tone(900, 0.2, { type: 'sawtooth', slide: -600, gain: 0.12 }),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.4, { delay: i * 0.12, gain: 0.25 })),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.5, { delay: i * 0.18, type: 'triangle', gain: 0.25 })),
  spawn: () => tone(110, 0.5, { type: 'sine', slide: 40, gain: 0.3 }),
  tick: () => tone(1200, 0.06, { type: 'square', gain: 0.12 }),
};

const SCALE = [220, 261.6, 293.7, 329.6, 392, 440];

export function startMusic() {
  if (musicTimer || !ensure()) return;
  let i = 0;
  musicTimer = setInterval(() => {
    const f = SCALE[(i * 3 + (i >> 2)) % SCALE.length];
    tone(f, 1.6, { gain: 0.07, type: 'sine' });
    if (i % 4 === 0) tone(f / 2, 2.4, { gain: 0.06, type: 'triangle' });
    i += 1;
  }, 900);
}

export function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
}
