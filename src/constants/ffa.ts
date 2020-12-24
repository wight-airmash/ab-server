import { SpawnZone } from '../types';


export const FFA_SPAWN_EUROPE: SpawnZone = {
  MIN_X: -512 * 2,
  MAX_X: 512 * 6,
  MIN_Y: -512 * 9,
  MAX_Y: -512,
};

export const FFA_SPAWN_CANADA: SpawnZone = {
  MIN_X: -512 * 22,
  MAX_X: -512 * 16,
  MIN_Y: -512 * 11,
  MAX_Y: -512 * 3,
}

export const FFA_SPAWN_LATAM: SpawnZone = {
  MIN_X: -512 * 16,
  MAX_X: -512 * 8,
  MIN_Y: -512 * -5,
  MAX_Y: -512 * -13,
}

export const FFA_SPAWN_RUSSIA: SpawnZone = {
  MIN_X: -512 * -8,
  MAX_X: -512 * -16,
  MIN_Y: -512 * 6,
  MAX_Y: -512 * -2,
}

/**
 * These are indexes mapping a semantic name to the spawn zone positions 
 * To add a new spawn zone, create a box above, reference the box in spawn.ts,
 * and give it a name and index below.
 * 
 * Be sure to keep the spawn zone size constant. 8 x 8
 */
export const FFA_VALID_SPAWN_ZONES: Object = {
  "europe": 0,
  "canada": 1,
  "latam": 2,
  "asia": 3,
}