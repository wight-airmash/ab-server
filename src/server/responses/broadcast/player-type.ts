import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_PLAYER_TYPE, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { PlayerId } from '../../../types';
import { System } from '../../system';

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
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.PLAYER_TYPE,
        id,
        type,
      } as ServerPackets.PlayerType,
      [...this.storage.mainConnectionIdList]
    );
  }
}
