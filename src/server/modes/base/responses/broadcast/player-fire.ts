import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { BROADCAST_PLAYER_FIRE, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { PlayerId, MobId } from '@/types';

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

    const recipients = [...this.storage.broadcast.get(playerId)];
    const projectiles = [];

    for (let index = 0; index < projectileIds.length; index += 1) {
      if (this.storage.mobList.has(projectileIds[index])) {
        const projectile = this.storage.mobList.get(projectileIds[index]);

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

    this.emit(
      CONNECTIONS_SEND_PACKET,
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
