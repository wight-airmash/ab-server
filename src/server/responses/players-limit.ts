import { ServerPackets, SERVER_ERRORS, SERVER_PACKETS } from '@airbattle/protocol';
import {
  CONNECTIONS_DISCONNECT,
  CONNECTIONS_SEND_PACKETS,
  PLAYERS_LIMIT_REACHED,
} from '../../events';
import { ConnectionId } from '../../types';
import { System } from '../system';

export default class PlayersLimitResponse extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_LIMIT_REACHED]: this.onReachedPlayersLimit,
    };
  }

  /**
   * The number of active players has reached the limit.
   * Show an error and disconnect the new player.
   *
   * @param connectionId
   */
  onReachedPlayersLimit(connectionId: ConnectionId): void {
    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.ERROR,
        error: SERVER_ERRORS.UNKNOWN_ERROR,
      } as ServerPackets.Error,
      connectionId
    );

    this.emit(CONNECTIONS_DISCONNECT, connectionId);
  }
}
