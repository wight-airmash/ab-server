import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_MOB_DESPAWN_COORDS, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { MobId, Projectile } from '../../../types';
import { System } from '../../system';

export default class MobDespawnCoordsBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_MOB_DESPAWN_COORDS]: this.onMobDespawnCoords,
    };
  }

  /**
   * Sent on:
   * 1. Projectile collided with a mountain.
   *
   * Broadcast to all players who sees the projectile.
   *
   * @param id
   */
  onMobDespawnCoords(id: MobId): void {
    if (!this.storage.broadcast.has(id) || !this.storage.mobList.has(id)) {
      return;
    }

    const projectile = this.storage.mobList.get(id) as Projectile;
    const recipients = [...this.storage.broadcast.get(id)];

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.MOB_DESPAWN_COORDS,
        id,
        type: projectile.mobtype.current,
        posX: projectile.position.x,
        posY: projectile.position.y,
      } as ServerPackets.MobDespawnCoords,
      recipients
    );
  }
}
