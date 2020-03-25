import { SERVER_ERRORS, SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import {
  CONNECTIONS_BREAK,
  CONNECTIONS_DISCONNECT_PLAYER,
  CONNECTIONS_KICK,
  PLAYERS_KICK,
  CONNECTIONS_SEND_PACKET,
} from '@/events';
import { System } from '@/server/system';
import { ConnectionId, PlayerId } from '@/types';

export default class KickPlayer extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_KICK]: this.onKickPlayer,
      [CONNECTIONS_KICK]: this.onKickConnection,
    };
  }

  /**
   * Kick by connection.
   * It is needed when the player hasn't been created yet.
   *
   * @param connectionId
   */
  onKickConnection(connectionId: ConnectionId): void {
    /**
     * TODO: there must be a delay between the message and the connection break,
     * otherwise the frontend doens't have time to process the message and to show it.
     */
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.ERROR,
        error: SERVER_ERRORS.PLAYER_KICKED,
      } as ServerPackets.Error,
      connectionId
    );

    this.emit(CONNECTIONS_BREAK, connectionId);
  }

  onKickPlayer(playerId: PlayerId): void {
    if (!this.storage.playerMainConnectionList.has(playerId)) {
      return;
    }

    const connectionId = this.storage.playerMainConnectionList.get(playerId);

    /**
     * TODO: there must be a delay between the message and the connection break,
     * otherwise the frontend doens't have time to process the message and to show it.
     */
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.ERROR,
        error: SERVER_ERRORS.PLAYER_KICKED,
      } as ServerPackets.Error,
      connectionId
    );

    this.emit(CONNECTIONS_DISCONNECT_PLAYER, playerId);
  }
}
