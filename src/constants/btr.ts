import { SpawnZone } from '../types';
import { SHIPS_TYPES } from './ships';

export const BTR_WIN_ALERT_DURATION_SEC = 13;

export const BTR_FIREWALL_POSITION = {
  MIN_X: 0,
  MIN_Y: -2800,
  MAX_X: 1200,
  MAX_Y: -1800,
};

export const BTR_FIREWALL_INITIAL_RADIUS = 17000;

export const BTR_FIREWALL_SPEED = -70;

export const BTR_SHIPS_TYPES_ORDER = [
  SHIPS_TYPES.PREDATOR,
  SHIPS_TYPES.GOLIATH,
  SHIPS_TYPES.COPTER,
  SHIPS_TYPES.TORNADO,
];

export const BTR_SPAWN_WAITING: SpawnZone = {
  MIN_X: -120,
  MIN_Y: -4500,
  MAX_X: 2960,
  MAX_Y: -960,
};

export const BTR_SPAWN_MATCH_START: SpawnZone = {
  MIN_X: -13384,
  MIN_Y: -6192,
  MAX_X: 13384,
  MAX_Y: 6192,
};
