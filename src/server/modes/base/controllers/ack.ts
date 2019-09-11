import { CONNECTIONS_PACKET_ACK_TIMEOUT_MS } from '@/constants';
import { ROUTE_ACK, TIMEOUT_ACK } from '@/events';
import { System } from '@/server/system';
import { ConnectionId } from '@/types';

export default class AckMessageHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ROUTE_ACK]: this.onAckMessageReceived,
    };
  }

  /**
   * Handle `Ack` request
   *
   * @param connectionId player connection id
   */
  onAckMessageReceived(connectionId: ConnectionId): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    clearTimeout(connection.meta.timeouts.ack);

    connection.meta.timeouts.ack = setTimeout(() => {
      this.emit(TIMEOUT_ACK, connectionId);
    }, CONNECTIONS_PACKET_ACK_TIMEOUT_MS);
  }
}
