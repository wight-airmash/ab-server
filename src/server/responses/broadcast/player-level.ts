import { PLAYER_LEVEL_UPDATE_TYPES, ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_PLAYER_LEVEL, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { PlayerId } from '../../../types';
import { System } from '../../system';

export default class PlayerLevelBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_PLAYER_LEVEL]: this.onPlayerLevel,
    };
  }

  /**
   * Sent on:
   * 1. Player logged in with an account session.
   * 2. Player gets a new level.
   *
   * @param connectionId
   * @param type
   */
  onPlayerLevel(playerId: PlayerId, type: PLAYER_LEVEL_UPDATE_TYPES): void {
    const player = this.storage.playerList.get(playerId);

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.PLAYER_LEVEL,
        id: player.id.current,
        type,
        level: player.level.current,
      } as ServerPackets.PlayerLevel,
      [...this.storage.mainConnectionIdList]
    );
  }
}
