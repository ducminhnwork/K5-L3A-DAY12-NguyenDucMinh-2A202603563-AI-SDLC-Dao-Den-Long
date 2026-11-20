import { runSim } from '../src/sim/run.js';

export const run = (opts) => runSim({ snapshotEvery: 1, inputs: { frames: [] }, ...opts }).map((l) => JSON.parse(l));
export const events = (rows, name) => rows.filter((r) => r.type === 'event' && (!name || r.name === name));
export const snaps = (rows) => rows.filter((r) => r.type === 'snapshot');
export const last = (rows) => rows[rows.length - 1];
export const quiet = { random_motes: false, random_shades: false };
