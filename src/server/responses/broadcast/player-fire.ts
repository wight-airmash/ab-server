import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_PLAYER_FIRE, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { ConnectionId, MobId, PlayerId, Projectile } from '../../../types';
import { System } from '../../system';

export default class PlayerFireBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_PLAYER_FIRE]: this.onPlayerFire,
    };
  }

  /**
   * Broadcast to all players who sees the event owner.
   *
   * @param playerId
   * @param projectileIds
   */
  onPlayerFire(playerId: PlayerId, projectileIds: MobId[]): void {
    if (!this.storage.playerList.has(playerId) || !this.storage.broadcast.has(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);
    const broadcast = [...this.storage.broadcast.get(playerId)];
    const projectiles = [];
    let recipients: ConnectionId[];

    for (let index = 0; index < projectileIds.length; index += 1) {
      if (this.storage.mobList.has(projectileIds[index])) {
        const projectile = this.storage.mobList.get(projectileIds[index]) as Projectile;

        projectiles.push({
          id: projectile.id.current,
          type: projectile.mobtype.current,
          posX: projectile.position.x,
          posY: projectile.position.y,
          speedX: projectile.velocity.x,
          speedY: projectile.velocity.y,
          accelX: projectile.acceleration.x,
          accelY: projectile.acceleration.y,
          maxSpeed: projectile.velocity.max,
        } as ServerPackets.PlayerFireProjectile);
      }
    }

    if (this.storage.playerBackupConnectionList.has(playerId)) {
      const mainConnectionId = this.storage.playerMainConnectionList.get(playerId);
      const backupConnectionId = this.storage.playerBackupConnectionList.get(playerId);

      recipients = [];

      for (let connectionIndex = 0; connectionIndex < broadcast.length; connectionIndex += 1) {
        recipients.push(broadcast[connectionIndex]);

        if (broadcast[connectionIndex] === mainConnectionId) {
          recipients.push(backupConnectionId);
        }
      }
    } else {
      recipients = broadcast;
    }

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.PLAYER_FIRE,
        clock: this.helpers.clock(),
        id: playerId,
        energy: player.energy.current,
        energyRegen: player.energy.regen,
        projectiles,
      } as ServerPackets.PlayerFire,
      recipients
    );
  }
}
