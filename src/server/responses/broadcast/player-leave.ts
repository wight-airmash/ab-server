import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_PLAYER_LEAVE, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { PlayerId } from '../../../types';
import { System } from '../../system';

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
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.PLAYER_LEAVE,
        id: playerId,
      } as ServerPackets.PlayerLeave,
      [...this.storage.mainConnectionIdList]
    );
  }
}
