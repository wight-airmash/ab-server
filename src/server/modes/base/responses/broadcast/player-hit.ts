import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { System } from '@/server/system';
import { CONNECTIONS_SEND_PACKET, BROADCAST_PLAYER_HIT } from '@/events';
import { SHIPS_SPECS } from '@/constants';
import { PlayerId, MobId } from '@/types';

export default class PlayerHitBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_PLAYER_HIT]: this.onPlayerHit,
    };
  }

  /**
   * Sent on:
   * 1. Projectile hits the player.
   * 2. BTR firewall hits the player.
   *
   * Broadcast to all player who sees the victims.
   * Currently `victimIds` always contains only one victim.
   *
   * @param projectileId
   * @param victimIds
   */
  onPlayerHit(projectileId: MobId, victimIds: PlayerId[]): void {
    if (projectileId !== 0) {
      /**
       * Projectile hit
       */
      if (!this.storage.mobList.has(projectileId) || !this.storage.broadcast.has(projectileId)) {
        return;
      }

      const projectile = this.storage.mobList.get(projectileId);
      const recipients = [...this.storage.broadcast.get(projectileId)];
      const players = [];

      for (let playerIndex = 0; playerIndex < victimIds.length; playerIndex += 1) {
        if (this.storage.playerList.has(victimIds[playerIndex])) {
          const player = this.storage.playerList.get(victimIds[playerIndex]);

          players.push({
            id: player.id.current,
            health: player.health.current,
            healthRegen: SHIPS_SPECS[player.planetype.current].healthRegen,
          } as ServerPackets.PlayerHitPlayer);
        }
      }

      if (players.length === 0) {
        return;
      }

      this.emit(
        CONNECTIONS_SEND_PACKET,
        {
          c: SERVER_PACKETS.PLAYER_HIT,
          id: projectileId,
          type: projectile.mobtype.current,
          posX: projectile.position.x,
          posY: projectile.position.y,
          owner: projectile.owner.current,
          players,
        } as ServerPackets.PlayerHit,
        recipients
      );
    } else {
      /**
       * BTR firewall hit; assume victimIds only has one entry
       */
      const player = this.storage.playerList.get(victimIds[0]);

      const players = [
        {
          id: player.id.current,
          health: player.health.current,
          healthRegen: SHIPS_SPECS[player.planetype.current].healthRegen,
        } as ServerPackets.PlayerHitPlayer,
      ];

      const recipients = [...this.storage.broadcast.get(player.id.current)];

      this.emit(
        CONNECTIONS_SEND_PACKET,
        {
          c: SERVER_PACKETS.PLAYER_HIT,
          id: projectileId,
          type: 200,
          posX: player.position.x,
          posY: player.position.y,
          owner: 0,
          players,
        } as ServerPackets.PlayerHit,
        recipients
      );
    }
  }
}
