import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_PLAYER_FLAG, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { PlayerId } from '../../../types';
import { System } from '../../system';

export default class PlayerFlagBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_PLAYER_FLAG]: this.onPlayerFlag,
    };
  }

  /**
   * Broadcast to all players.
   *
   * @param playerId
   */
  onPlayerFlag(playerId: PlayerId): void {
    const player = this.storage.playerList.get(playerId);

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.PLAYER_FLAG,
        id: player.id.current,
        flag: player.flag.code,
      } as ServerPackets.PlayerFlag,
      [...this.storage.mainConnectionIdList]
    );
  }
}
