// Chạy Sim theo Test Contract v1.1: trả về các dòng JSONL (chuỗi).
import { Sim, defaultInput } from './sim.js';
import { parseInputs, parseScenario } from './parse.js';

export function runSim({ seed, night = 1, scenario = {}, inputs = { frames: [] }, ticks, snapshotEvery = 10 }) {
  const frames = parseInputs(inputs);
  parseScenario(scenario);
  const sim = new Sim({ seed, night, scenario });
  const lines = [];
  const push = (o) => lines.push(JSON.stringify(o));

  const input = defaultInput();
  let fi = 0;
  push(sim.snapshot()); // tick 0: sau khi dựng scenario, trước input

  for (let k = 0; k < ticks && !sim.over; k++) {
    while (fi < frames.length && frames[fi].tick <= k) {
      const f = frames[fi++];
      if (f.move) input.move = [f.move[0], f.move[1]];
      if ('cam_yaw_deg' in f) input.yawDeg = f.cam_yaw_deg;
      for (const b of ['jump', 'interact', 'pulse', 'dash', 'pause']) if (b in f) input[b] = f[b];
    }
    for (const ev of sim.step(input)) push(ev);
    if (sim.tick % snapshotEvery === 0) push(sim.snapshot());
  }
  push(sim.end());
  return lines;
}
