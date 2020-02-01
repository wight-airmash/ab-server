import { GAME_TYPES } from '@airbattle/protocol';
import { BTR_SPAWN_MATCH_START, BTR_SPAWN_WAITING } from '@/constants/btr';
import { FFA_SPAWN_EUROPE } from '@/constants/ffa';

export const PLAYERS_SPAWN_ZONES = {
  [GAME_TYPES.FFA]: [FFA_SPAWN_EUROPE],
  [GAME_TYPES.BTR]: [BTR_SPAWN_WAITING, BTR_SPAWN_MATCH_START],
};
