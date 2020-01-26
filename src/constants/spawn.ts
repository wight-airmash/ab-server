import { GAME_TYPES } from '@airbattle/protocol';
import { FFA_SPAWN_EUROPE } from './ffa';
import { BTR_SPAWN_WAITING, BTR_SPAWN_MATCH_START } from './btr';

export const PLAYERS_SPAWN_ZONES = {
  [GAME_TYPES.FFA]: [FFA_SPAWN_EUROPE],
  [GAME_TYPES.BTR]: [BTR_SPAWN_WAITING, BTR_SPAWN_MATCH_START],
};
