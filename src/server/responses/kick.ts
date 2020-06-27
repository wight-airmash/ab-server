import { ServerPackets, SERVER_ERRORS, SERVER_PACKETS } from '@airbattle/protocol';
import {
  CONNECTIONS_DISCONNECT,
  CONNECTIONS_DISCONNECT_PLAYER,
  CONNECTIONS_KICK,
  CONNECTIONS_SEND_PACKETS,
  PLAYERS_KICK,
} from '../../events';
import { ConnectionId, PlayerId } from '../../types';
import { System } from '../system';

export default class KickPlayerResponse extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CONNECTIONS_KICK]: this.onKickConnection,
      [PLAYERS_KICK]: this.onKickPlayer,
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
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.ERROR,
        error: SERVER_ERRORS.PLAYER_KICKED,
      } as ServerPackets.Error,
      connectionId
    );

    this.emit(CONNECTIONS_DISCONNECT, connectionId);
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
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.ERROR,
        error: SERVER_ERRORS.PLAYER_KICKED,
      } as ServerPackets.Error,
      connectionId
    );

    this.emit(CONNECTIONS_DISCONNECT_PLAYER, playerId);
  }
}
