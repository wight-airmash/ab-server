import { CONNECTIONS_PACKET_ACK_TIMEOUT_MS } from '@/constants';
import { PLAYERS_KICK, TIMEOUT_ACK } from '@/events';
import { System } from '@/server/system';
import { ConnectionId } from '@/types';

export default class AckTimeoutHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMEOUT_ACK]: this.onAckTimeout,
    };
  }

  onAckTimeout(connectionId: ConnectionId): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    if (connection.meta.isBot === false && this.app.config.invalidProtocolAutoKick.ack === true) {
      const now = Date.now();

      if (
        !connection.meta.lagging &&
        connection.meta.lastMessageMs > now - CONNECTIONS_PACKET_ACK_TIMEOUT_MS
      ) {
        this.log.info(`No Ack request. Kick player id${connection.meta.playerId}.`);
        this.emit(PLAYERS_KICK, connection.meta.playerId);
      } else {
        connection.meta.timeouts.ack = setTimeout(() => {
          this.emit(TIMEOUT_ACK, connectionId);
        }, CONNECTIONS_PACKET_ACK_TIMEOUT_MS);
      }
    }
  }
}
