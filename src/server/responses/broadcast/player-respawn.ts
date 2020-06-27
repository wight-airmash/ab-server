import { encodeUpgrades, ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_PLAYER_RESPAWN, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { PlayerId } from '../../../types';
import { System } from '../../system';

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
      CONNECTIONS_SEND_PACKETS,
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
