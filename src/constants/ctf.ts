import { CTF_TEAMS } from '@airbattle/protocol';
import { MS_PER_SEC } from '@/constants/units';

export const CTF_NEW_GAME_ALERT_DURATION_MS = 15 * MS_PER_SEC;

export const CTF_ALERT_DURATION_SEC = 2;

export const CTF_COUNTDOWN_DURATION_MS = 1 * MS_PER_SEC;

export const CTF_WIN_ALERT_DURATION_SEC = 7;

export const CTF_PLAYER_SWITCH_TIMEOUT_MS = 30 * MS_PER_SEC;

export const CTF_FLAGS_STATE_TO_NEW_PLAYER_BROADCAST_DELAY_MS = 100;

/**
 * x, y, radius.
 */
export const CTF_PLAYERS_SPAWN_ZONES = {
  [CTF_TEAMS.BLUE]: [-8880, -2970, 50],
  [CTF_TEAMS.RED]: [7820, -2930, 50],
};

export const CTF_FLAGS_POSITIONS = {
  [CTF_TEAMS.BLUE]: [-9670, -1470],
  [CTF_TEAMS.RED]: [8600, -940],
};

/**
 * offsetX, offsetY, radius.
 */
export const CTF_FLAG_COLLISIONS = [[0, 0, 46]];

/**
 * x, y, width, height.
 */
export const CTF_FLAGS_SPAWN_ZONE_COLLISIONS = {
  [CTF_TEAMS.BLUE]: [-9670, -1470, 126, 126],
  [CTF_TEAMS.RED]: [8600, -940, 126, 126],
};

/**
 * Incativity time to capture by last owner after /drop.
 */
export const CTF_FLAG_OWNER_INACTIVITY_TIMEOUT_MS = 3 * MS_PER_SEC;

export const CTF_RETURNED_FLAG_INACTIVITY_TIMEOUT_MS = 5 * MS_PER_SEC;
