import { TIMEOUT_ACK, PLAYERS_KICK } from '@/events';
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
      this.log.info(`No Ack request. Kick player id${connection.meta.playerId}.`);
      this.emit(PLAYERS_KICK, connection.meta.playerId);
    }
  }
}
