import { MOB_DESPAWN_TYPES, ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_MOB_DESPAWN, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { MobId, PlayerId } from '../../../types';
import { System } from '../../system';

export default class MobDespawnBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_MOB_DESPAWN]: this.onMobDespawn,
    };
  }

  /**
   * Sent on:
   * 1. Mob despawned.
   * 2. Box picked up.
   *
   * Exception is used when the player picked up the box.
   * In this case, we have to send only one event with type `PICKUP`.
   * Other players get `EXPIRED`.
   *
   * Broadcast to all players who sees the mob.
   *
   * @param mobId
   * @param despawnType
   * @param recipientId
   */
  onMobDespawn(mobId: MobId, despawnType: MOB_DESPAWN_TYPES, recipientId?: PlayerId): void {
    if (!this.storage.broadcast.has(mobId)) {
      return;
    }

    let recipients = null;
    let exceptions = null;

    if (recipientId) {
      if (despawnType === MOB_DESPAWN_TYPES.PICKUP) {
        if (this.storage.playerMainConnectionList.has(recipientId)) {
          recipients = this.storage.playerMainConnectionList.get(recipientId);
        } else {
          return;
        }
      } else {
        recipients = [...this.storage.broadcast.get(mobId)];
        exceptions = [this.storage.playerMainConnectionList.get(recipientId)];
      }
    } else {
      recipients = [...this.storage.broadcast.get(mobId)];
    }

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.MOB_DESPAWN,
        id: mobId,
        type: despawnType,
      } as ServerPackets.MobDespawn,
      recipients,
      exceptions
    );
  }
}
