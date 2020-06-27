import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_MOB_UPDATE_STATIONARY, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { MobId, PlayerId, Powerup } from '../../../types';
import { System } from '../../system';

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
    const box = this.storage.mobList.get(mobId) as Powerup;

    if (!box || !this.storage.broadcast.has(mobId)) {
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
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.MOB_UPDATE_STATIONARY,
        id: mobId,
        type: box.mobtype.current,
        posX: box.position.x,
        posY: box.position.y,
      } as ServerPackets.MobUpdateStationary,
      recipients
    );
  }
}
