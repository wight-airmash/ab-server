import { SERVER_PACKETS, ServerPackets, PLAYER_LEVEL_UPDATE_TYPES } from '@airbattle/protocol';
import { RESPONSE_PLAYER_LEVEL, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class PlayerLevelResponse extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_PLAYER_LEVEL]: this.onPlayerLevel,
    };
  }

  /**
   * Sent on:
   * 1. Player logged in with an account session.
   * 2. Player gets a new level.
   *
   * Guests don't need to receive this packet.
   *
   * @param connectionId
   * @param type
   */
  onPlayerLevel(connectionId: MainConnectionId, type: PLAYER_LEVEL_UPDATE_TYPES): void {
    const connection = this.storage.connectionList.get(connectionId);
    const player = this.storage.playerList.get(connection.meta.playerId);

    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.PLAYER_LEVEL,
        id: player.id.current,
        type,
        level: player.level.current,
      } as ServerPackets.PlayerLevel,
      connectionId
    );
  }
}
