import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_PLAYER_KILL, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { PlayerId } from '../../../types';
import { System } from '../../system';

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
      CONNECTIONS_SEND_PACKETS,
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
