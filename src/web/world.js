// Dựng cảnh 3D theo bản đồ chuẩn. Chỉ hiển thị: không đổi đầu ra headless.
import * as THREE from 'three';
import { buildMap } from '../sim/maps.js';

export const PAL = {
  sky: 0x0e1430, mist: 0x1b2350, grass: 0x2f5d50, sand: 0xc9b48a, wood: 0x6b4a2f, sea: 0x12384a,
  lampOn: 0xffb347, lampCore: 0xffe9b0, lampOff: 0x5b5f6e,
  moteCore: 0xfff6c2, moteHalo: 0xffe58a,
  shade: 0x120a1a, shadeRim: 0x7a3cff, shadeStun: 0x3a3450,
  coat: 0xe8e2d0, scarf: 0xc8102e, gold: 0xf2c14e, drifter: 0x8fa3b8,
};

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });

/** Chế độ mù màu: viền và mắt Bóng Mực #7A3CFF -> #00B3FF. */
export function setColorblind(on) {
  PAL.shadeRim = on ? 0x00b3ff : 0x7a3cff;
}

export function buildWorld(night) {
  const map = buildMap(night);
  const g = new THREE.Group();
  const cyl = (r, h, y, color, x = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), std(color));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const rim = (r, y, x = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.35, 8, 64), std(PAL.sand));
    m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z);
    g.add(m);
  };

  if (night === 1) {
    cyl(40, 4, -2, PAL.grass);
    rim(40, 0);
  } else if (night === 2) {
    for (const cx of [0, 70]) {
      cyl(28, 4, -2, PAL.grass, cx, 0);
      rim(28, 0, cx, 0);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 4), std(PAL.wood));
    bridge.position.set(35, -0.2, 0);
    g.add(bridge);
    for (const p of map.pads) pad(g, p);
  } else {
    cyl(45, 4, -2, PAL.grass);
    rim(45, 0);
    // tầng 1: vành khăn nửa z>0 (dựng bằng RingGeometry nối khối)
    const t1 = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 3, 48, 1, false, 0, Math.PI), std(PAL.sand));
    t1.rotation.y = -Math.PI / 2; // nửa đĩa nằm ở z>0
    t1.position.y = 1.5;
    g.add(t1);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 3.02, 48, 1, false, 0, Math.PI), std(PAL.grass));
    hole.rotation.y = -Math.PI / 2;
    hole.position.y = 1.5;
    g.add(hole);
    cyl(8, 6, 3, PAL.sand);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 24), std(PAL.wood));
    tower.position.y = 10;
    g.add(tower);
    for (const a of [30, 150]) {
      const r = (a * Math.PI) / 180;
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.3, 3), std(PAL.wood));
      ramp.position.set(27 * Math.cos(r), 1.5, 27 * Math.sin(r));
      ramp.rotation.y = -r;
      ramp.rotation.z = Math.atan2(3, 6);
      g.add(ramp);
    }
    for (const p of map.pads) pad(g, p);
  }
  return g;
}

function pad(g, p) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, 0.15, 24), std(PAL.gold, { emissive: PAL.gold, emissiveIntensity: 0.4 }));
  m.position.set(p.x, p.y + 0.08, p.z);
  g.add(m);
}

export function makeMay() {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 4, 10), std(PAL.coat, { emissive: PAL.coat, emissiveIntensity: 0.35 }));
  body.position.y = 0.8;
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.1, 8, 16), std(PAL.scarf, { emissive: PAL.scarf, emissiveIntensity: 0.3 }));
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.35;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.6, 16), std(PAL.sand));
  hat.position.y = 1.85;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: PAL.lampCore }));
  bulb.position.set(0.5, 1.2, 0.3);
  const light = new THREE.PointLight(PAL.lampOn, 1.2, 9);
  light.position.copy(bulb.position);
  grp.add(body, scarf, hat, bulb, light);
  return { grp, light };
}

export function makeLantern(l) {
  const grp = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3, 8), std(PAL.wood));
  pole.position.y = 1.5;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 16), std(PAL.lampOff, { emissive: 0x000000 }));
  lamp.position.y = 3.4;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), new THREE.MeshBasicMaterial({ color: PAL.lampCore, transparent: true, opacity: 0 }));
  core.position.y = 3.4;
  const light = new THREE.PointLight(PAL.lampOn, 0, 18);
  light.position.y = 3.4;
  const ring = new THREE.Mesh(new THREE.RingGeometry(5.85, 6, 64), new THREE.MeshBasicMaterial({ color: PAL.lampOn, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  // giấy rách (đèn tắt phân biệt không cần màu) + thanh dầu (đèn sáng)
  const tear = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.05), new THREE.MeshBasicMaterial({ color: PAL.sky }));
  tear.position.set(0.55, 3.2, 0.7);
  tear.rotation.z = 0.5;
  const bar = new THREE.Group();
  const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.22), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 }));
  const barFill = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.14), new THREE.MeshBasicMaterial({ color: PAL.gold, transparent: true }));
  barFill.position.z = 0.01;
  bar.add(barBg, barFill);
  bar.position.y = 4.9;
  grp.add(pole, lamp, core, light, ring, tear, bar);
  grp.position.set(l.x, l.y, l.z);
  return { grp, lamp, core, light, ring, tear, bar, barFill };
}

export function makeMote() {
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: PAL.moteCore })));
  grp.add(new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 8), new THREE.MeshBasicMaterial({ color: PAL.moteHalo, transparent: true, opacity: 0.3 })));
  return grp;
}

export function makeShade() {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), std(PAL.shade, { emissive: PAL.shadeRim, emissiveIntensity: 0.25 }));
  const edge = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 1), new THREE.MeshBasicMaterial({ color: PAL.shadeRim, wireframe: true, transparent: true, opacity: 0.55 }));
  const eyes = [-0.3, 0.3].map((x) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: PAL.shadeRim }));
    e.position.set(x, 0.2, 0.8);
    grp.add(e);
    return e;
  });
  grp.add(body, edge);
  return { grp, body, edge, eyes };
}

export function makeDrifter() {
  const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.5), new THREE.MeshBasicMaterial({ color: PAL.drifter, transparent: true, opacity: 0.85 }));
  const grp = new THREE.Group();
  grp.add(m);
  return grp;
}

export function makeCharm() {
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.06), std(PAL.gold, { emissive: PAL.gold, emissiveIntensity: 0.3 })));
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.86, 0.08), std(PAL.scarf, { emissive: PAL.scarf, emissiveIntensity: 0.3 }));
  grp.add(card);
  return grp;
}
