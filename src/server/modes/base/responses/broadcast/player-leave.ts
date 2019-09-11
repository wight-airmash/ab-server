import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { System } from '@/server/system';
import { CONNECTIONS_SEND_PACKET, BROADCAST_PLAYER_LEAVE } from '@/events';
import { PlayerId } from '@/types';

export default class PlayerLeaveBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_PLAYER_LEAVE]: this.onPlayerLeave,
    };
  }

  /**
   * Broadcast to all players.
   *
   * @param playerId
   */
  onPlayerLeave(playerId: PlayerId): void {
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.PLAYER_LEAVE,
        id: playerId,
      } as ServerPackets.PlayerLeave,
      [...this.storage.mainConnectionIdList]
    );
  }
}
