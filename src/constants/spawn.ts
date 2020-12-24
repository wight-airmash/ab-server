import { GAME_TYPES } from '@airbattle/protocol';
import { SpawnZonesTemplate } from '../types';
import { BTR_SPAWN_MATCH_START, BTR_SPAWN_WAITING } from './btr';
import { FFA_SPAWN_EUROPE, FFA_SPAWN_CANADA, FFA_SPAWN_LATAM, FFA_SPAWN_RUSSIA } from './ffa';

/**
 * CTF has a custom spawn system. See `CTF_PLAYERS_SPAWN_ZONES`.
 */
export const PLAYERS_SPAWN_ZONES: SpawnZonesTemplate = {
  [GAME_TYPES.FFA]: [FFA_SPAWN_EUROPE, FFA_SPAWN_CANADA, FFA_SPAWN_LATAM, FFA_SPAWN_RUSSIA],
  [GAME_TYPES.BTR]: [BTR_SPAWN_WAITING, BTR_SPAWN_MATCH_START],
};
