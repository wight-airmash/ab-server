import { SERVER_ERRORS, SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { CONNECTIONS_BREAK, PLAYERS_LIMIT_REACHED, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { ConnectionId } from '@/types';

export default class PlayersLimit extends System {
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
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.ERROR,
        error: SERVER_ERRORS.UNKNOWN_ERROR,
      } as ServerPackets.Error,
      connectionId
    );

    this.emit(CONNECTIONS_BREAK, connectionId);
  }
}
