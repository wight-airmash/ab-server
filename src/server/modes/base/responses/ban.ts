import { ServerPackets, SERVER_PACKETS, SERVER_ERRORS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKET, RESPONSE_PLAYER_BAN } from '@/events';
import { System } from '@/server/system';
import { ConnectionId } from '@/types';

export default class PlayerBanResponse extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_PLAYER_BAN]: this.onPlayerLevel,
    };
  }

  /**
   *
   * @param connectionId
   * @param type
   */
  onPlayerLevel(connectionId: ConnectionId): void {
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.ERROR,
        error: SERVER_ERRORS.GLOBAL_BAN,
      } as ServerPackets.Error,
      connectionId
    );
  }
}
