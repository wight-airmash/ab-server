import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { System } from '@/server/system';
import { CONNECTIONS_SEND_PACKET, BROADCAST_PLAYER_KILL } from '@/events';
import { PlayerId } from '@/types';

export default class PlayerKillBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_PLAYER_KILL]: this.onPlayerKill,
    };
  }

  /**
   * Broadcast to all players.
   *
   * @param victimId
   * @param killerId
   * @param x
   * @param y
   */
  onPlayerKill(victimId: PlayerId, killerId: PlayerId, x: number, y: number): void {
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.PLAYER_KILL,
        id: victimId,
        killer: killerId,
        posX: x,
        posY: y,
      } as ServerPackets.PlayerKill,
      [...this.storage.mainConnectionIdList]
    );
  }
}
