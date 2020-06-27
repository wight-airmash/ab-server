import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_EVENT_BOOST, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { ConnectionId, PlayerId } from '../../../types';
import { System } from '../../system';

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
    const broadcast = [...this.storage.broadcast.get(playerId)];
    let recipients: ConnectionId[];

    if (this.storage.playerBackupConnectionList.has(playerId)) {
      const mainConnectionId = this.storage.playerMainConnectionList.get(playerId);
      const backupConnectionId = this.storage.playerBackupConnectionList.get(playerId);

      recipients = [];

      for (let connectionIndex = 0; connectionIndex < broadcast.length; connectionIndex += 1) {
        recipients.push(broadcast[connectionIndex]);

        if (broadcast[connectionIndex] === mainConnectionId) {
          recipients.push(backupConnectionId);
        }
      }
    } else {
      recipients = broadcast;
    }

    this.emit(
      CONNECTIONS_SEND_PACKETS,
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
