import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_EVENT_REPEL, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { MobId, PlayerId, Projectile } from '../../../types';
import { System } from '../../system';

export default class EventRepelBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_EVENT_REPEL]: this.onEventRepel,
    };
  }

  /**
   * Sent on:
   * 1. Player uses repel special.
   *
   * Broadcast to all players who sees the repel owner.
   * The content of response is different for each recipient:
   * 1. Only victims who sees by recipient are added to response.
   * 2. Only projectiles which sees by recipient are added to response.
   *
   * @param playerId
   * @param victimIds
   * @param projectileIds
   */
  onEventRepel(playerId: PlayerId, victimIds: PlayerId[], projectileIds: MobId[]): void {
    if (!this.helpers.isPlayerConnected(playerId) || !this.storage.broadcast.has(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);

    /**
     * TODO: refactoring needed.
     */
    this.storage.broadcast.get(playerId).forEach(connectionId => {
      const players = [];
      const projectiles = [];

      for (let playerIndex = 0; playerIndex < victimIds.length; playerIndex += 1) {
        if (
          this.storage.playerList.has(victimIds[playerIndex]) &&
          this.storage.broadcast.get(victimIds[playerIndex]).has(connectionId)
        ) {
          const victim = this.storage.playerList.get(victimIds[playerIndex]);

          if (!victim.repel.current) {
            continue;
          }

          players.push({
            id: victim.id.current,
            posX: victim.position.x,
            posY: victim.position.y,
            rot: victim.rotation.current,
            speedX: victim.velocity.x,
            speedY: victim.velocity.y,
            energy: victim.energy.current,
            energyRegen: victim.energy.regen,
            playerHealth: victim.health.current,
            playerHealthRegen: victim.health.regen,
          } as ServerPackets.EventRepelPlayer);
        }
      }

      for (let mobIndex = 0; mobIndex < projectileIds.length; mobIndex += 1) {
        if (
          this.storage.mobList.has(projectileIds[mobIndex]) &&
          this.storage.broadcast.get(projectileIds[mobIndex]).has(connectionId)
        ) {
          const projectile = this.storage.mobList.get(projectileIds[mobIndex]) as Projectile;

          if (!projectile.repel.current) {
            continue;
          }

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
          } as ServerPackets.EventRepelMob);
        }
      }

      this.emit(
        CONNECTIONS_SEND_PACKETS,
        {
          c: SERVER_PACKETS.EVENT_REPEL,
          clock: this.helpers.clock(),
          id: playerId,
          posX: player.position.x,
          posY: player.position.y,
          rot: player.rotation.current,
          speedX: player.velocity.x,
          speedY: player.velocity.y,
          energy: player.energy.current,
          energyRegen: player.energy.regen,
          players,
          mobs: projectiles,
        } as ServerPackets.EventRepel,
        connectionId
      );
    });
  }
}
