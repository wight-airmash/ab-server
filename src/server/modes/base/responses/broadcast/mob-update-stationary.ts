import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { System } from '@/server/system';
import { CONNECTIONS_SEND_PACKET, BROADCAST_MOB_UPDATE_STATIONARY } from '@/events';
import { MobId, PlayerId } from '@/types';

export default class MobUpdateStationaryBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_MOB_UPDATE_STATIONARY]: this.onMobUpdateStationary,
    };
  }

  /**
   * Sent on:
   * 1. Box spawned.
   * 2. Box intersects with player's viewport (only once,
   * at the moment of intersection).
   *
   * Broadcast to all players who sees the mob or one player.
   *
   * @param mobId
   * @param recipientId
   */
  onMobUpdateStationary(mobId: MobId, recipientId?: PlayerId): void {
    const mob = this.storage.mobList.get(mobId);

    if (!mob || !this.storage.broadcast.has(mobId)) {
      return;
    }

    let recipients = null;

    if (recipientId) {
      if (this.storage.playerMainConnectionList.has(recipientId)) {
        recipients = this.storage.playerMainConnectionList.get(recipientId);
      } else {
        return;
      }
    } else {
      recipients = [...this.storage.broadcast.get(mobId)];
    }

    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.MOB_UPDATE_STATIONARY,
        id: mobId,
        type: mob.mobtype.current,
        posX: mob.position.x,
        posY: mob.position.y,
      } as ServerPackets.MobUpdateStationary,
      recipients
    );
  }
}
