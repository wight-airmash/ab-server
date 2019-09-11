import { PLAYER_POWERUP_TYPES } from '@airbattle/protocol';
import {
  BROADCAST_PLAYER_UPDATE,
  PLAYERS_APPLY_INFERNO,
  PLAYERS_APPLY_SHIELD,
  RESPONSE_PLAYER_POWERUP,
} from '@/events';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

export default class GamePlayersPowerup extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_APPLY_INFERNO]: this.onApplyInferno,
      [PLAYERS_APPLY_SHIELD]: this.onApplyShield,
    };
  }

  protected applyPowerup(playerId: PlayerId, type: PLAYER_POWERUP_TYPES, duration: number): void {
    const player = this.storage.playerList.get(playerId);
    const playerConnectionId = this.storage.playerMainConnectionList.get(playerId);

    player.shield.current = false;
    player.shield.endTime = 0;
    player.inferno.current = false;
    player.inferno.endTime = 0;

    if (type === PLAYER_POWERUP_TYPES.SHIELD) {
      player.shield.current = true;
      player.shield.endTime = Date.now() + duration;
    } else {
      player.inferno.current = true;
      player.inferno.endTime = Date.now() + duration;
    }

    player.delayed.BROADCAST_PLAYER_UPDATE = true;

    this.emit(RESPONSE_PLAYER_POWERUP, playerConnectionId, type, duration);
    this.emit(BROADCAST_PLAYER_UPDATE, playerId);
  }

  onApplyInferno(playerId: PlayerId, duration: number): void {
    this.applyPowerup(playerId, PLAYER_POWERUP_TYPES.INFERNO, duration);
  }

  onApplyShield(playerId: PlayerId, duration: number): void {
    this.applyPowerup(playerId, PLAYER_POWERUP_TYPES.SHIELD, duration);
  }
}
