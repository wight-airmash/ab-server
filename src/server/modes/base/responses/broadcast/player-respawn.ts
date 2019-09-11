import { encodeUpgrades, SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { BROADCAST_PLAYER_RESPAWN, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

export default class PlayerRespawnBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_PLAYER_RESPAWN]: this.onPlayerRespawn,
    };
  }

  /**
   * Broadcast to all players.
   *
   * @param playerId
   */
  onPlayerRespawn(playerId: PlayerId): void {
    const player = this.storage.playerList.get(playerId);

    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.PLAYER_RESPAWN,
        id: player.id.current,
        posX: player.position.x,
        posY: player.position.y,
        rot: player.rotation.current,
        upgrades: encodeUpgrades(
          player.upgrades.speed,
          ~~player.shield.current,
          ~~player.inferno.current
        ),
      } as ServerPackets.PlayerRespawn,
      [...this.storage.mainConnectionIdList]
    );
  }
}
