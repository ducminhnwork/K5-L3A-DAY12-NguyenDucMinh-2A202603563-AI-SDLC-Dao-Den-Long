// Nguồn sự thật duy nhất cho các con số của game.
// game.contract.json phải khớp object TUNING này (có test kiểm tra).
export const TUNING = Object.freeze({
  player_speed: 6,
  carry_capacity: 5,
  lantern_cost: 4,
  lantern_count_night1: 5,
  pickup_radius: 1.5,
  interact_radius: 3,
  pulse_cost: 1,
  pulse_radius: 8,
  night1_duration_s: 300,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 3,
  pulse_push_m: 4,
  pulse_cooldown_s: 1.5,
  safe_radius: 5,
  shade_speed: 3.5,
  shade_hit_radius: 1.2,
  fall_enabled: false,
  score: Object.freeze({
    per_mote: 10,
    per_lantern: 100,
    per_stun: 25,
    per_second_left: 1,
    per_flame_left: 50,
  }),
});

// Hằng số thế giới không nằm trong contract.
export const WORLD = Object.freeze({
  tick_hz: 60,
  island_radius: 50,
  lantern_ring_radius: 25,
  jump_velocity: 7,
  gravity: 20,
  shade_y: 1.0,
  random_motes: 28,
  initial_shades: 2,
  max_shades: 4,
  shade_spawn_interval_s: 20,
  shade_spawn_radius: 42,
});
