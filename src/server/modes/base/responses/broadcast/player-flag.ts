import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { BROADCAST_PLAYER_FLAG, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

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
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.PLAYER_FLAG,
        id: player.id.current,
        flag: player.flag.code,
      } as ServerPackets.PlayerFlag,
      [...this.storage.mainConnectionIdList]
    );
  }
}
