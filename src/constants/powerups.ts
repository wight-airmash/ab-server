import { GAME_TYPES, MOB_TYPES } from '@airbattle/protocol';
import { MS_PER_SEC, SECONDS_PER_MINUTE } from '@/constants/units';

export const POWERUPS_DEFAULT_DURATION_MS = 10 * MS_PER_SEC;

export const POWERUPS_DEFAULT_DESPAWN_MS = 5 * SECONDS_PER_MINUTE * MS_PER_SEC;

export const POWERUPS_RESPAWN_TIMEOUT_MS = 5 * SECONDS_PER_MINUTE * MS_PER_SEC;

export const POWERUPS_SPAWN_GUARANTEED_SEC = 30 * SECONDS_PER_MINUTE;

export const POWERUPS_SPAWN_CHANCE = 0.02;

export const POWERUPS_DEFAULT_SPAWN_CHANCE = {
  [GAME_TYPES.FFA]: 0.5,
  [GAME_TYPES.CTF]: 0.03,
  [GAME_TYPES.BTR]: 0.5,
};

export const POWERUPS_COLLISIONS = {
  [MOB_TYPES.UPGRADE]: [[0, 0, 24]],
  [MOB_TYPES.INFERNO]: [[0, 0, 24]],
  [MOB_TYPES.SHIELD]: [[0, 0, 24]],
};

/**
 * Random spawn coords hashing constants.
 */
export const POWERUPS_GRID_POW = 12;
export const POWERUPS_GRID_ROWS = 4;
export const POWERUPS_GRID_COLS = 8;
