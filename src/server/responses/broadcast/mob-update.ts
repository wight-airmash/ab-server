import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_MOB_UPDATE, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { MobId, PlayerId, Projectile } from '../../../types';
import { System } from '../../system';

export default class MobUpdateBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_MOB_UPDATE]: this.onMobUpdate,
    };
  }

  /**
   * Sent on:
   * 1. Projectile intersects with player's viewport (only once,
   * at the moment of intersection).
   *
   * Broadcast to all players who sees the projectile or one player.
   *
   * @param projectileId
   * @param recipientId
   */
  onMobUpdate(projectileId: MobId, recipientId?: PlayerId): void {
    if (!this.storage.mobList.has(projectileId) || !this.storage.broadcast.has(projectileId)) {
      return;
    }

    const projectile = this.storage.mobList.get(projectileId) as Projectile;
    let recipients = null;

    if (recipientId) {
      if (this.storage.playerMainConnectionList.has(recipientId)) {
        recipients = this.storage.playerMainConnectionList.get(recipientId);
      } else {
        return;
      }
    } else {
      recipients = [...this.storage.broadcast.get(projectileId)];
    }

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.MOB_UPDATE,
        clock: this.helpers.clock(),
        id: projectileId,
        type: projectile.mobtype.current,
        posX: projectile.position.x,
        posY: projectile.position.y,
        speedX: projectile.velocity.x,
        speedY: projectile.velocity.y,
        accelX: projectile.acceleration.x,
        accelY: projectile.acceleration.y,
        maxSpeed: projectile.velocity.max,
      } as ServerPackets.MobUpdate,
      recipients
    );
  }
}
