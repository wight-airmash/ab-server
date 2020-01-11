import { ServerPackets, SERVER_ERRORS, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKET, RESPONSE_PLAYER_BAN } from '@/events';
import { System } from '@/server/system';
import { ConnectionId } from '@/types';

export default class PlayerBanResponse extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_PLAYER_BAN]: this.onPlayerBan,
    };
  }

  /**
   *
   * @param connectionId
   * @param type
   */
  onPlayerBan(connectionId: ConnectionId, isPacketFloodingBan = false): void {
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.ERROR,
        error:
          isPacketFloodingBan === true
            ? SERVER_ERRORS.PACKET_FLOODING_BAN
            : SERVER_ERRORS.GLOBAL_BAN,
      } as ServerPackets.Error,
      connectionId
    );
  }
}
