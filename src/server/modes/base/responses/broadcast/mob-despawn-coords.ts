import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { System } from '@/server/system';
import { CONNECTIONS_SEND_PACKET, BROADCAST_MOB_DESPAWN_COORDS } from '@/events';
import { MobId } from '@/types';

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

    const projectile = this.storage.mobList.get(id);
    const recipients = [...this.storage.broadcast.get(id)];

    this.emit(
      CONNECTIONS_SEND_PACKET,
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
