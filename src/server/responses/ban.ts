import { ServerPackets, SERVER_ERRORS, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, RESPONSE_PLAYER_BAN } from '../../events';
import { ConnectionId } from '../../types';
import { System } from '../system';

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
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.ERROR,
        error: isPacketFloodingBan ? SERVER_ERRORS.PACKET_FLOODING_BAN : SERVER_ERRORS.GLOBAL_BAN,
      } as ServerPackets.Error,
      connectionId
    );
  }
}
