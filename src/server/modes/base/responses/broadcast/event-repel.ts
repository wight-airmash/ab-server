/* eslint-disable no-continue */
import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { BROADCAST_EVENT_REPEL, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { PlayerId, MobId } from '@/types';

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
          const p = this.storage.playerList.get(victimIds[playerIndex]);

          if (p.repel.current === false) {
            continue;
          }

          players.push({
            id: p.id.current,
            posX: p.position.x,
            posY: p.position.y,
            rot: p.rotation.current,
            speedX: p.velocity.x,
            speedY: p.velocity.y,
            energy: p.energy.current,
            energyRegen: p.energy.regen,
            playerHealth: p.health.current,
            playerHealthRegen: p.health.regen,
          } as ServerPackets.EventRepelPlayer);
        }
      }

      for (let mobIndex = 0; mobIndex < projectileIds.length; mobIndex += 1) {
        if (
          this.storage.mobList.has(projectileIds[mobIndex]) &&
          this.storage.broadcast.get(projectileIds[mobIndex]).has(connectionId)
        ) {
          const projectile = this.storage.mobList.get(projectileIds[mobIndex]);

          if (projectile.repel.current === false) {
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
        CONNECTIONS_SEND_PACKET,
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
