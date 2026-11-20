// Chạy Sim theo Test Contract: trả về các dòng JSONL (chuỗi).
import { Sim, defaultInput, round3 } from './sim.js';
import { parseInputs, parseScenario } from './parse.js';

export function runSim({ seed, scenario = {}, inputs = { frames: [] }, ticks, snapshotEvery = 10 }) {
  const frames = parseInputs(inputs);
  parseScenario(scenario);
  const sim = new Sim({ seed, scenario });
  const lines = [];
  const push = (o) => lines.push(JSON.stringify(o));

  const input = defaultInput();
  let fi = 0;
  push(sim.snapshot()); // tick 0: sau khi dựng scenario, trước khi áp dụng input

  for (let k = 0; k < ticks && sim.state === 'playing'; k++) {
    while (fi < frames.length && frames[fi].tick <= k) {
      const f = frames[fi++];
      if (f.move) input.move = [f.move[0], f.move[1]];
      if ('cam_yaw_deg' in f) input.yawDeg = f.cam_yaw_deg;
      if ('jump' in f) input.jump = f.jump;
      if ('interact' in f) input.interact = f.interact;
      if ('pulse' in f) input.pulse = f.pulse;
    }
    for (const ev of sim.step(input)) push(ev);
    if (sim.tick % snapshotEvery === 0) push(sim.snapshot());
  }
  push(sim.end());
  return lines;
}

export { round3 };
