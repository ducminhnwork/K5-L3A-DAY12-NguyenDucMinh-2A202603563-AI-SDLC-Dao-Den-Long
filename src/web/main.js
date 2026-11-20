import * as THREE from 'three';
import { Sim, defaultInput } from '../sim/sim.js';
import { TUNING, WORLD } from '../sim/config.js';

const HZ = 60;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0716);
scene.fog = new THREE.Fog(0x0b0716, 30, 110);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

scene.add(new THREE.HemisphereLight(0x6a5acd, 0x1a0f2e, 0.7));
const moon = new THREE.DirectionalLight(0xbfc8ff, 0.5);
moon.position.set(-20, 40, 10);
scene.add(moon);

// đảo + biển
const island = new THREE.Mesh(
  new THREE.CylinderGeometry(WORLD.island_radius, WORLD.island_radius + 2, 2, 48),
  new THREE.MeshStandardMaterial({ color: 0x3b2f4a, roughness: 1 })
);
island.position.y = -1;
scene.add(island);
const sea = new THREE.Mesh(
  new THREE.CircleGeometry(300, 48),
  new THREE.MeshBasicMaterial({ color: 0x07041a })
);
sea.rotation.x = -Math.PI / 2;
sea.position.y = -2.5;
scene.add(sea);

// Mây: thân + nón lá + đèn nhỏ
const mayGroup = new THREE.Group();
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 4, 10), new THREE.MeshStandardMaterial({ color: 0xe8b86d }));
body.position.y = 0.8;
const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0xf2d9a0 }));
hat.position.y = 1.7;
const miniLamp = new THREE.PointLight(0xffb347, 1.2, 9);
miniLamp.position.set(0.5, 1.2, 0.3);
const miniBulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffc766 }));
miniBulb.position.copy(miniLamp.position);
mayGroup.add(body, hat, miniLamp, miniBulb);
scene.add(mayGroup);

// đèn lồng lớn
const lanternViews = new Map();
function makeLantern(l) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3, 8), new THREE.MeshStandardMaterial({ color: 0x4a3a2a }));
  pole.position.y = 1.5;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 16), new THREE.MeshStandardMaterial({ color: 0x332244, emissive: 0x000000 }));
  lamp.position.y = 3.4;
  const light = new THREE.PointLight(0xff9a3c, 0, 18);
  light.position.y = 3.4;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(TUNING.safe_radius - 0.1, TUNING.safe_radius, 48),
    new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  g.add(pole, lamp, light, ring);
  g.position.set(l.x, 0, l.z);
  scene.add(g);
  lanternViews.set(l.id, { g, lamp, light, ring });
}

const moteViews = new Map();
const shadeViews = new Map();
const moteGeo = new THREE.SphereGeometry(0.18, 8, 8);
const moteMat = new THREE.MeshBasicMaterial({ color: 0xffd45c });
const shadeGeo = new THREE.IcosahedronGeometry(0.9, 1);
const shadeMat = new THREE.MeshStandardMaterial({ color: 0x1a0b2e, emissive: 0x3a1166 });
const stunMat = new THREE.MeshStandardMaterial({ color: 0x5a4a7a, emissive: 0x221133 });

// --- sáng tạo (chỉ web, không ảnh hưởng headless): mây trôi + sao lấp lánh
const clouds = [];
for (let i = 0; i < 8; i++) {
  const c = new THREE.Mesh(new THREE.SphereGeometry(4 + (i % 3), 10, 8), new THREE.MeshBasicMaterial({ color: 0x1d1236, transparent: true, opacity: 0.55 }));
  c.scale.y = 0.35;
  c.userData = { a: (i / 8) * Math.PI * 2, r: 70 + (i % 4) * 12, h: 30 + (i % 3) * 6, s: 0.01 + (i % 3) * 0.004 };
  scene.add(c);
  clouds.push(c);
}
const stars = new THREE.Points(
  new THREE.BufferGeometry().setFromPoints(Array.from({ length: 300 }, (_, i) => {
    const a = i * 2.399, r = 120 + (i % 7) * 10, y = 40 + ((i * 37) % 80);
    return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  })),
  new THREE.PointsMaterial({ color: 0xfff1c9, size: 0.8, sizeAttenuation: true })
);
scene.add(stars);

// --- trạng thái chơi
let sim;
let yaw = 0; // độ
const keys = new Set();
let pressed = { jump: false, interact: false, pulse: false };
const hud = document.getElementById('hud');
const msg = document.getElementById('msg');

function reset() {
  for (const v of lanternViews.values()) scene.remove(v.g);
  lanternViews.clear();
  for (const v of moteViews.values()) scene.remove(v);
  moteViews.clear();
  for (const v of shadeViews.values()) scene.remove(v);
  shadeViews.clear();
  sim = new Sim({ seed: (Date.now() & 0x7fffffff) >>> 0 });
  sim.lanterns.forEach(makeLantern);
  msg.style.display = 'none';
}
reset();

addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === 'r') reset();
  keys.add(k);
  if (k === ' ') e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function readInput(dt) {
  if (keys.has('arrowleft')) yaw += 90 * dt;
  if (keys.has('arrowright')) yaw -= 90 * dt;
  // Three.js hệ tay phải nhìn từ sau lưng: +X của sim hiển thị bên trái màn hình => A = +x
  const mx = (keys.has('a') ? 1 : 0) - (keys.has('d') ? 1 : 0);
  const mz = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0);
  return { move: [mx, mz], yawDeg: yaw, jump: keys.has(' '), interact: keys.has('e'), pulse: keys.has('f') };
}

let acc = 0;
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const input = readInput(dt);
  acc += dt;
  while (acc >= 1 / HZ) {
    acc -= 1 / HZ;
    if (sim.state === 'playing') sim.step(input);
  }
  draw(now / 1000);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function sync(map, items, make, update) {
  const seen = new Set();
  for (const it of items) {
    seen.add(it.id);
    let v = map.get(it.id);
    if (!v) {
      v = make();
      scene.add(v);
      map.set(it.id, v);
    }
    update(v, it);
  }
  for (const [id, v] of map) if (!seen.has(id)) { scene.remove(v); map.delete(id); }
}

function draw(t) {
  const p = sim.player;
  mayGroup.position.set(p.x, p.y, p.z);
  mayGroup.rotation.y = (yaw * Math.PI) / 180;
  mayGroup.visible = p.invuln % 10 < 7 || sim.state !== 'playing';
  miniLamp.intensity = 0.8 + 0.4 * Math.sin(t * 6);
  for (const l of sim.lanterns) {
    const v = lanternViews.get(l.id);
    v.light.intensity = l.lit ? 2.5 + 0.3 * Math.sin(t * 3 + l.x) : 0;
    v.lamp.material.emissive.setHex(l.lit ? 0xff9a3c : 0x120a1e);
    v.ring.material.opacity = l.lit ? 0.5 : 0;
    v.g.rotation.z = Math.sin(t * 1.2 + l.x) * 0.02; // đung đưa nhẹ (chỉ hiển thị)
  }
  sync(moteViews, sim.motes, () => new THREE.Mesh(moteGeo, moteMat), (v, m) => v.position.set(m.x, 0.7 + 0.2 * Math.sin(t * 3 + m.x), m.z));
  sync(shadeViews, sim.shades, () => new THREE.Mesh(shadeGeo, shadeMat.clone()), (v, s) => {
    v.position.set(s.x, s.y + 0.15 * Math.sin(t * 4 + s.z), s.z);
    v.material.color.setHex(s.state === 'stunned' ? 0x5a4a7a : 0x1a0b2e);
    v.material.emissive.setHex(s.state === 'stunned' ? 0x221133 : 0x3a1166);
  });
  clouds.forEach((c) => {
    const d = c.userData;
    d.a += d.s * 0.016;
    c.position.set(Math.cos(d.a) * d.r, d.h, Math.sin(d.a) * d.r);
  });

  // camera sau lưng, nhìn theo yaw
  const th = (yaw * Math.PI) / 180;
  const fx = Math.sin(th), fz = Math.cos(th);
  camera.position.set(p.x - fx * 10, p.y + 6, p.z - fz * 10);
  camera.lookAt(p.x + fx * 4, p.y + 1, p.z + fz * 4);

  const lit = sim.lanterns.filter((l) => l.lit).length;
  const left = Math.ceil(sim.timeLeftS);
  hud.innerHTML =
    `🔥 Ngọn lửa: ${'🔥'.repeat(Math.max(0, p.flames))}<br>✨ Đom đóm: ${p.carried}/${TUNING.carry_capacity}<br>` +
    `🏮 Đèn: ${lit}/${sim.lanterns.length}<br>⏳ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}<br>★ Điểm: ${sim.score}`;
  if (sim.state !== 'playing') {
    msg.style.display = 'flex';
    msg.innerHTML = sim.state === 'won'
      ? `Các đèn đã sáng! 🏮<small>Điểm: ${sim.score} · nhấn R để chơi lại</small>`
      : `Bình minh / hết lửa… 🌑<small>Điểm: ${sim.score} · nhấn R để chơi lại</small>`;
  }
}
requestAnimationFrame(frame);
