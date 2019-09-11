import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { BROADCAST_PLAYER_TYPE, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

export default class PlayerTypeBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_PLAYER_TYPE]: this.onPlayerType,
    };
  }

  /**
   * Broadcast to all players.
   *
   * @param id
   * @param type new airplane type
   */
  onPlayerType(id: PlayerId, type: number): void {
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.PLAYER_TYPE,
        id,
        type,
      } as ServerPackets.PlayerType,
      [...this.storage.mainConnectionIdList]
    );
  }
}
