import { CONNECTIONS_PACKET_ACK_TIMEOUT_MS } from '../../constants';
import { PLAYERS_KICK, TIMEOUT_ACK } from '../../events';
import { ConnectionId } from '../../types';
import { System } from '../system';

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

    if (!connection.isBot && this.config.connections.invalidProtocolAutoKick.ack) {
      const now = Date.now();

      if (
        !connection.lagging.isActive &&
        connection.lastPacketAt > now - CONNECTIONS_PACKET_ACK_TIMEOUT_MS
      ) {
        this.log.info('No Ack request. Kick the player: %o', {
          playerId: connection.playerId,
        });

        this.emit(PLAYERS_KICK, connection.playerId);
      } else {
        connection.timeouts.ack = setTimeout(() => {
          this.emit(TIMEOUT_ACK, connectionId);
        }, CONNECTIONS_PACKET_ACK_TIMEOUT_MS);
      }
    }
  }
}
