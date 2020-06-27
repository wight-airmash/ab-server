import { MS_PER_SEC } from './units';

export const PLAYERS_ID_CACHE_LIFETIME_MS = 24 * 60 * 60 * MS_PER_SEC;

export const PLAYERS_DEFAULT_FLAG = 'COMMUNIST';

export const PLAYERS_ALLOW_NON_ASCII_USERNAMES = false;

export const PLAYERS_ALIVE_STATUSES = {
  ALIVE: 0,
  DEAD: 1,
  SPECTATE: 1,
  DEFAULT: 0,
};

export const PLAYERS_HEALTH = {
  MIN: 0,
  MAX: 1,
  DEFAULT: 1,
};

export const PLAYERS_ENERGY = {
  MIN: 0,
  MAX: 1,
  DEFAULT: 1,
};

export const PLAYERS_ROTATION = {
  MIN: 0,
  MAX: Math.PI * 2,
};

export const PLAYERS_POSITION = {
  MIN_X: -16352,
  MIN_Y: -8160,

  MAX_X: 16352,
  MAX_Y: 8160,
};

export const PLAYERS_SPAWN_SHIELD_DURATION_MS = 2 * MS_PER_SEC;

export const PLAYERS_RESPAWN_INACTIVITY_MS = 2 * MS_PER_SEC;

export const PLAYERS_SPECTATE_INACTIVITY_MS = 2 * MS_PER_SEC;

export const PLAYERS_DEATH_INACTIVITY_MS = 3 * MS_PER_SEC;

export const PLAYERS_TIME_TO_RESTORE_PLAYER_MS = 60 * MS_PER_SEC;

/**
 * By default the client waits for PLAYER_UPDATE packet
 * for a max timeout of 3s, then render turns off.
 */
export const PLAYERS_BROADCAST_UPDATE_INTERVAL_MS = 2.9 * MS_PER_SEC;

/**
 * Minimum module value for one of the velocity vector coordinates
 * after which the player is considered inactive.
 */
export const PLAYERS_INACTIVITY_VELOCITY_COORD_VALUE = 0.5;
