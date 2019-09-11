import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { BROADCAST_EVENT_BOOST, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

export default class EventBoostBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_EVENT_BOOST]: this.onEventBoost,
    };
  }

  /**
   * Sent on:
   * 1. Player starts boost.
   * 2. Player stops boost (manually or energy is out).
   *
   * Broadcast to all players who sees the player.
   *
   * @param playerId
   */
  onEventBoost(playerId: PlayerId): void {
    if (!this.helpers.isPlayerConnected(playerId) || !this.storage.broadcast.has(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);
    const recipients = [...this.storage.broadcast.get(playerId)];

    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.EVENT_BOOST,
        clock: this.helpers.clock(),
        id: playerId,
        boost: player.planestate.boost,
        posX: player.position.x,
        posY: player.position.y,
        rot: player.rotation.current,
        speedX: player.velocity.x,
        speedY: player.velocity.y,
        energy: player.energy.current,
        energyRegen: player.energy.regen,
      } as ServerPackets.EventBoost,
      recipients
    );

    player.delayed.BROADCAST_EVENT_BOOST = false;
  }
}
