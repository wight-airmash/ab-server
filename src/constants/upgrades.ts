import { GAME_TYPES } from '@airbattle/protocol';
import { MS_PER_SEC } from '@/constants';

export const UPGRADES_DEFAULT_MIN_CHANCE = 0.3;

export const UPGRADES_DEFAULT_MAX_CHANCE = 0.8;

export const UPGRADES_MIN_VICTIM_SCORE_TO_DROP = 26;

export const UPGRADES_TYPES = {
  1: 'SPEED',
  2: 'DEFENSE',
  3: 'ENERGY',
  4: 'MISSILE',
};

export const UPGRADES_START_AMOUNT = 0;

export const UPGRADES_SPECS = {
  SPEED: {
    cost: [0, 1, 1, 1, 1, 1],
    factor: [1, 1.05, 1.1, 1.15, 1.2, 1.25],
  },
  DEFENSE: {
    cost: [0, 1, 1, 1, 1, 1],
    factor: [1, 1.05, 1.1, 1.15, 1.2, 1.25],
  },
  ENERGY: {
    cost: [0, 1, 1, 1, 1, 1],
    factor: [1, 1.05, 1.1, 1.15, 1.2, 1.25],
  },
  MISSILE: {
    cost: [0, 1, 1, 1, 1, 1],
    factor: [1, 1.05, 1.1, 1.15, 1.2, 1.25],
  },
};

export const UPGRADES_ACTION_TYPE = {
  LOST: 0,
  SPEED: 1,
  DEFENSE: 2,
  ENERGY: 3,
  MISSILE: 4,
};

/**
 * Inactivity after /upgrades drop
 */
export const UPGRADES_OWNER_INACTIVITY_TIMEOUT_MS = 3 * MS_PER_SEC;

export const UPGRADES_DEFAULT_DROP_CHANCE = {
  [GAME_TYPES.FFA]: {
    min: 0.35,
    max: 0.65,
  },
  [GAME_TYPES.CTF]: {
    min: 0.5,
    max: 0.8,
  },
  [GAME_TYPES.BTR]: {
    min: 1.0,
    max: 1.0,
  },
};
