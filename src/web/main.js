import * as THREE from 'three';
import { Sim, defaultInput } from '../sim/sim.js';
import { TUNING, RULES } from '../sim/config.js';
import { loadSettings, saveSettings } from './settings.js';
import { sfx, startMusic, stopMusic, applyVolume } from './audio.js';
import { PAL, setColorblind, buildWorld, makeMay, makeLantern, makeMote, makeShade, makeDrifter, makeCharm } from './world.js';

const HZ = 60;
const $ = (id) => document.getElementById(id);
const INTRO = {
  1: ['Đêm 1 — Đảo Bến', 'Ông Đăng nói: "Đèn cạn dầu rồi, cháu ơi. Thắp đèn, châm dầu, và giữ ít nhất ba ngọn sáng tới bình minh nhé."'],
  2: ['Đêm 2 — Đảo Cau', 'Ông Đăng nói: "Hai hòn đảo, một cây cầu tre không lan can. Bục vàng sẽ tung cháu qua bên kia. Giữ ít nhất bốn ngọn sáng tới bình minh, và coi chừng Gió Lạc."'],
  3: ['Đêm 3 — Đảo Chuông', 'Ông Đăng nói: "Đảo Chuông có ba tầng và gió mạnh. Bóng Mực nhanh hơn rồi. Giữ ít nhất năm trong bảy ngọn sáng tới bình minh, Bóng Mực đang hút dầu đèn."'],
};

// ---------- three.js ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(PAL.sky);
scene.fog = new THREE.Fog(PAL.mist, 40, 160);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
const ambient = new THREE.HemisphereLight(0x8fa3d8, PAL.sky, 0.15);
scene.add(ambient);
const moon = new THREE.DirectionalLight(0xbfc8ff, 0.35);
moon.position.set(-20, 40, 10);
scene.add(moon);
const sea = new THREE.Mesh(new THREE.CircleGeometry(600, 48), new THREE.MeshBasicMaterial({ color: PAL.sea }));
sea.rotation.x = -Math.PI / 2;
sea.position.y = -12;
scene.add(sea);
const stars = new THREE.Points(
  new THREE.BufferGeometry().setFromPoints(Array.from({ length: 400 }, (_, i) => {
    const a = i * 2.399;
    const r = 200 + (i % 7) * 15;
    return new THREE.Vector3(Math.cos(a) * r, 50 + ((i * 37) % 120), Math.sin(a) * r);
  })),
  new THREE.PointsMaterial({ color: PAL.moteCore, size: 1.1 })
);
scene.add(stars);
const may = makeMay();
scene.add(may.grp);

// ---------- trạng thái ----------
let sim = null;
let night = 1;
let totalScore = 0;
let nightViews = null; // các object riêng của đêm hiện tại
let mode = 'menu'; // menu | intro | playing | paused | result | dawn
let yaw = 0;
const keys = new Set();
const pend = { jump: false, interact: false, pulse: false, dash: false };
let lastSecond = -1;

function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.remove('on');
  if (id) $(id).classList.add('on');
}

function disposeNight() {
  if (!nightViews) return;
  scene.remove(nightViews.world, nightViews.root);
  nightViews = null;
}

function startNight(n) {
  disposeNight();
  night = n;
  sim = new Sim({ seed: (Date.now() & 0x7fffffff) >>> 0, night: n });
  const world = buildWorld(n);
  const root = new THREE.Group();
  scene.add(world, root);
  const views = { world, root, lanterns: new Map(), motes: new Map(), shades: new Map(), drifters: new Map(), charms: new Map(), leaves: null };
  for (const l of sim.lanterns) {
    const v = makeLantern(l);
    root.add(v.grp);
    views.lanterns.set(l.id, v);
  }
  const leaves = new THREE.Points(
    new THREE.BufferGeometry().setFromPoints(Array.from({ length: 80 }, () => new THREE.Vector3(0, -50, 0))),
    new THREE.PointsMaterial({ color: PAL.drifter, size: 0.6 })
  );
  root.add(leaves);
  views.leaves = leaves;
  nightViews = views;
  yaw = 0;
  lastSecond = -1;
  mode = 'playing';
  show(null);
  startMusic();
}

// ---------- vào/ra ----------
function openIntro(n) {
  night = n;
  $('introName').textContent = INTRO[n][0];
  $('introText').textContent = INTRO[n][1];
  mode = 'intro';
  show('intro');
}
function toMenu() {
  mode = 'menu';
  stopMusic();
  show('menu');
}
function pause(on) {
  if (mode !== 'playing' && mode !== 'paused') return;
  mode = on ? 'paused' : 'playing';
  show(on ? 'pause' : null);
  if (on && document.pointerLockElement) document.exitPointerLock();
}
function applyColorblind() {
  const cb = loadSettings().colorblind;
  setColorblind(cb);
  document.documentElement.style.setProperty('--danger', cb ? '#FFFFFF' : '#FF5A5F');
  document.body.classList.toggle('cb', !!cb);
}
applyColorblind();
let settingsFrom = 'menu';
function openSettings(from) {
  settingsFrom = from;
  const s = loadSettings();
  $('setVol').value = s.volume;
  $('setSens').value = s.sens;
  $('setCb').checked = !!s.colorblind;
  show('settings');
}
$('btnPlay').onclick = () => { totalScore = 0; openIntro(1); };
$('btnSettings').onclick = () => openSettings('menu');
$('btnPauseSettings').onclick = () => openSettings('pause');
$('btnSettingsBack').onclick = () => show(settingsFrom);
$('setVol').oninput = (e) => { const s = loadSettings(); saveSettings({ ...s, volume: Number(e.target.value) }); applyVolume(); };
$('setCb').onchange = (e) => { saveSettings({ ...loadSettings(), colorblind: e.target.checked }); applyColorblind(); };
$('setSens').oninput = (e) => saveSettings({ ...loadSettings(), sens: Number(e.target.value) });
$('btnStart').onclick = () => startNight(night);
$('btnResume').onclick = () => pause(false);
$('btnRestart').onclick = () => startNight(night);
$('btnToMenu').onclick = toMenu;
$('btnResMenu').onclick = toMenu;
$('btnDawnMenu').onclick = toMenu;
$('btnNext').onclick = () => {
  if (sim.state === 'won') {
    if (night >= 3) return;
    openIntro(night + 1);
  } else startNight(night);
};

function finishNight() {
  const won = sim.state === 'won';
  mode = 'result';
  if (document.pointerLockElement) document.exitPointerLock();
  (won ? sfx.win : sfx.lose)();
  if (won) {
    totalScore += sim.score;
    if (night >= 3) {
      $('dawnText').textContent = `Bình minh đã tới đảo. Tổng điểm của bạn: ${totalScore}.`;
      show('dawn');
      return;
    }
  }
  $('resTitle').textContent = won ? `Đêm ${night} — Thắng!` : sim.events.some((e) => e.data?.reason === 'no_flames') ? 'Ngọn lửa đã tắt…' : 'Bình minh đến quá sớm…';
  $('resText').textContent = won ? `Bình minh tới, đảo vẫn sáng. Điểm đêm này: ${sim.score}. Tổng điểm: ${totalScore}.` : `Điểm đêm này: ${sim.score}. Chơi lại Đêm ${night} nhé.`;
  $('btnNext').textContent = won ? 'Đêm kế tiếp' : 'Chơi lại Đêm';
  show('result');
}

// ---------- input ----------
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if ((k === 'escape' || k === 'p') && !e.repeat) {
    if (mode === 'playing') pause(true);
    else if (mode === 'paused') pause(false);
    return;
  }
  if (e.repeat) return;
  keys.add(k);
  if (k === ' ') { pend.jump = true; e.preventDefault(); }
  if (k === 'e') pend.interact = true;
  if (k === 'f') pend.pulse = true;
  if (k === 'shift') pend.dash = true;
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
renderer.domElement.addEventListener('click', () => {
  if (mode === 'playing' && !document.pointerLockElement) renderer.domElement.requestPointerLock?.();
});
addEventListener('mousemove', (e) => {
  if (mode !== 'playing' || !document.pointerLockElement) return;
  yaw -= e.movementX * (0.05 + loadSettings().sens * 0.004);
});

function currentInput(dt) {
  if (keys.has('arrowleft')) yaw += 90 * dt;
  if (keys.has('arrowright')) yaw -= 90 * dt;
  const inp = defaultInput();
  // Three.js nhìn từ sau lưng theo tay phải: +X của sim hiện bên trái màn hình => A = +x
  inp.move = [(keys.has('a') ? 1 : 0) - (keys.has('d') ? 1 : 0), (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0)];
  inp.yawDeg = yaw;
  inp.jump = keys.has(' ') || pend.jump;
  inp.interact = keys.has('e') || pend.interact;
  inp.pulse = keys.has('f') || pend.pulse;
  inp.dash = keys.has('shift') || pend.dash;
  return inp;
}

// ---------- vòng lặp ----------
let acc = 0;
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (mode === 'playing' && sim) {
    const inp = currentInput(dt);
    acc += dt;
    while (acc >= 1 / HZ && !sim.over) {
      acc -= 1 / HZ;
      const evs = sim.step(inp);
      pend.jump = pend.interact = pend.pulse = pend.dash = false;
      inp.jump = keys.has(' ');
      inp.interact = keys.has('e');
      inp.pulse = keys.has('f');
      inp.dash = keys.has('shift');
      for (const e of evs) onEvent(e);
      if (inp.jump && sim.player.vy > 6.5) sfx.jump();
    }
    if (sim.over) finishNight();
  }
  if (sim && nightViews) draw(now / 1000);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function onEvent(e) {
  switch (e.name) {
    case 'mote_picked': case 'charm_picked': sfx.pick(); break;
    case 'lantern_lit': case 'refuel': sfx.light(); break;
    case 'lantern_out': sfx.hit(); break;
    case 'pulse': sfx.pulse(); break;
    case 'player_hit': sfx.hit(); break;
    case 'dash': sfx.dash(); break;
    case 'shade_spawned': sfx.spawn(); break;
    default:
  }
}

function sync(map, items, make, update, parent) {
  const seen = new Set();
  for (const it of items) {
    seen.add(it.id);
    let v = map.get(it.id);
    if (!v) {
      v = make();
      parent.add(v.grp ?? v);
      map.set(it.id, v);
    }
    update(v, it);
  }
  for (const [id, v] of map) {
    if (!seen.has(id)) { parent.remove(v.grp ?? v); map.delete(id); }
  }
}

const tmp = new THREE.Vector3();
function draw(t) {
  const v = nightViews;
  const p = sim.player;
  may.grp.position.set(p.x, p.y, p.z);
  may.grp.rotation.y = Math.atan2(p.facingX, p.facingZ);
  may.grp.visible = p.invuln % 10 < 7 || sim.over;
  may.light.intensity = 0.8 + 0.4 * Math.sin(t * 6) + (p.charm > 0 ? 0.6 : 0);

  const litCount = sim.lanterns.filter((l) => l.lit).length;
  ambient.intensity = 0.15 + 0.55 * (litCount / sim.lanterns.length);

  for (const l of sim.lanterns) {
    const lv = v.lanterns.get(l.id);
    const low = l.lit && l.fuel < TUNING.low_fuel_threshold * HZ;
    const blink = low ? (Math.floor(t * 2) % 2 === 0 ? 1 : 0.25) : 1; // nhấp nháy chậm 1 Hz khi sắp cạn
    lv.lamp.material.color.setHex(l.lit ? PAL.lampOn : PAL.lampOff);
    lv.lamp.material.emissive.setHex(l.lit ? PAL.lampOn : 0x000000);
    lv.lamp.material.emissiveIntensity = blink;
    lv.lamp.scale.y = l.lit ? 1 : 0.8; // đèn tắt bị xẹp 20%
    lv.tear.visible = !l.lit; // và có vết rách
    lv.core.material.opacity = l.lit ? 0.9 * blink : 0;
    lv.light.intensity = l.lit ? (2.4 + 0.3 * Math.sin(t * 3 + l.x)) * blink : 0;
    lv.ring.material.opacity = l.lit && l.fuel >= TUNING.low_fuel_threshold * HZ ? 0.45 : 0; // vùng an toàn chỉ khi fuel >= 30
    lv.grp.rotation.z = Math.sin(t * 1.2 + l.x) * 0.02;
    lv.bar.visible = l.lit;
    if (l.lit) {
      const f = Math.max(0.001, l.fuel / (TUNING.fuel_max * HZ));
      lv.barFill.scale.x = f;
      lv.barFill.position.x = -0.75 * (1 - f);
      lv.barFill.material.color.setHex(low ? 0xffffff : PAL.gold);
      lv.barFill.material.opacity = blink;
      lv.bar.lookAt(camera.position);
    }
  }
  sync(v.motes, sim.motes, makeMote, (m, d) => m.position.set(d.x, d.y + 0.7 + 0.2 * Math.sin(t * 3 + d.x), d.z), v.root);
  sync(v.shades, sim.shades, makeShade, (s, d) => {
    s.grp.position.set(d.x, d.y + 0.15 * Math.sin(t * 4 + d.z), d.z);
    const stun = d.state === 'stunned';
    s.body.material.color.setHex(stun ? PAL.shadeStun : PAL.shade);
    s.body.material.emissive.setHex(stun ? 0x000000 : PAL.shadeRim);
    s.edge.material.color.setHex(PAL.shadeRim);
    for (const e of s.eyes) e.material.color.setHex(PAL.shadeRim);
    const sc = d.state === 'spawning' ? 1 - d.ticks / RULES.spawning_ticks : 1;
    s.grp.scale.setScalar(Math.max(0.05, sc));
    s.edge.rotation.y = t;
  }, v.root);
  sync(v.drifters, sim.drifters, makeDrifter, (g, d) => {
    g.position.set(d.x, d.y + 0.3 * Math.sin(t * 5 + d.x), d.z);
    g.rotation.y = t * 2;
    g.rotation.z = Math.sin(t * 6) * 0.4;
  }, v.root);
  sync(v.charms, sim.charms.filter((c) => c.available), makeCharm, (g, c) => {
    g.position.set(c.x, c.y + 1.1 + 0.15 * Math.sin(t * 2), c.z);
    g.rotation.y = t;
  }, v.root);

  // lá bay khi gió
  const pos = v.leaves.geometry.attributes.position;
  const windOn = sim.wind.active || sim.wind.warning;
  for (let i = 0; i < pos.count; i++) {
    if (!windOn) { pos.setY(i, -50); continue; }
    const a = ((sim.wind.dir) * Math.PI) / 180;
    const k = (t * 6 + i * 3.7) % 40;
    pos.setXYZ(i, p.x + Math.cos(a) * (k - 20) + Math.sin(i * 12.9) * 12, p.y + 1 + ((i * 7) % 6), p.z + Math.sin(a) * (k - 20) + Math.cos(i * 7.7) * 12);
  }
  pos.needsUpdate = true;

  // camera
  const th = (yaw * Math.PI) / 180;
  const fx = Math.sin(th);
  const fz = Math.cos(th);
  camera.position.set(p.x - fx * 10, p.y + 6, p.z - fz * 10);
  camera.lookAt(p.x + fx * 4, p.y + 1, p.z + fz * 4);

  updateHud(t);
}

function updateHud(t) {
  const p = sim.player;
  $('flames').textContent = '🔥'.repeat(Math.max(0, p.flames));
  const left = Math.ceil(sim.timeLeftS);
  const clock = $('clock');
  clock.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  clock.classList.toggle('low', left <= 30);
  clock.textContent = (loadSettings().colorblind && left <= 30 ? '⚠ ' : '') + clock.textContent;
  if (left <= 10 && left !== lastSecond && sim.state === 'playing') sfx.tick();
  lastSecond = left;
  const need = Math.ceil(TUNING.win_ratio * sim.lanterns.length - 1e-9);
  $('lampcount').textContent = `🏮 ${sim.lanterns.filter((l) => l.lit).length}/${sim.lanterns.length} (cần ${need})`;
  $('score').textContent = `★ ${sim.score}`;
  const bar = $('motes');
  if (bar.childElementCount !== TUNING.capacity_max) bar.innerHTML = '<i></i>'.repeat(TUNING.capacity_max);
  const cap = sim.capacity;
  [...bar.children].forEach((el, i) => {
    el.classList.toggle('on', i < p.carried);
    el.classList.toggle('off', i >= cap);
  });
  $('capacity').textContent = `${p.carried}/${cap}`;
  const fill = (id, cur, max) => { $(id).querySelector('.fill').style.height = `${max > 0 ? Math.min(100, (cur / max) * 100) : 0}%`; };
  fill('cdDash', p.dashCd, Math.round(TUNING.dash_cooldown_s * HZ));
  fill('cdPulse', p.pulseCd, Math.round(TUNING.pulse_cooldown_s * HZ));
  $('charm').textContent = p.charm > 0 ? `🧧 Bùa Gió ${Math.ceil(p.charm / HZ)}s` : '';
  $('windwarn').style.display = sim.wind.warning ? 'block' : 'none';

  // nhắc nạp đèn + mũi tên chỉ đèn chưa sáng gần nhất
  let prompt = null;
  let nearest = null;
  let nd = Infinity;
  for (const l of sim.lanterns) {
    const d = Math.hypot(l.x - p.x, l.z - p.z);
    if (!l.lit && d < nd) { nd = d; nearest = l; }
    if (d > TUNING.interact_radius || (l.lit && l.fuel >= TUNING.fuel_max * HZ)) continue;
    prompt = l.lit
      ? `E — Châm dầu (${Math.round(l.fuel / HZ)}/${TUNING.fuel_max})`
      : `E — Nạp ánh sáng (${l.deposited}/${l.everLit ? TUNING.relight_cost : TUNING.lantern_cost})`;
  }
  const pr = $('prompt');
  pr.style.display = prompt ? 'block' : 'none';
  if (prompt) pr.textContent = prompt;
  const arrow = $('arrow');
  arrow.style.display = 'none';
  if (nearest) {
    tmp.set(nearest.x, nearest.y + 3.4, nearest.z).project(camera);
    const behind = tmp.z > 1;
    const off = behind || Math.abs(tmp.x) > 0.95 || Math.abs(tmp.y) > 0.9;
    if (off) {
      let ax = tmp.x;
      let ay = tmp.y;
      if (behind) { ax = -ax; ay = -ay; }
      const m = Math.max(Math.abs(ax), Math.abs(ay), 1e-6);
      ax = (ax / m) * 0.9;
      ay = (ay / m) * 0.8;
      const sx = (ax * 0.5 + 0.5) * innerWidth;
      const sy = (-ay * 0.5 + 0.5) * innerHeight;
      arrow.style.display = 'block';
      arrow.style.left = `${sx - 12}px`;
      arrow.style.top = `${sy - 13}px`;
      arrow.style.transform = `rotate(${Math.atan2(sx - innerWidth / 2, -(sy - innerHeight / 2))}rad)`;
    }
  }
}

requestAnimationFrame(frame);
