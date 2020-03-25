import { CONNECTIONS_PACKET_PONG_TIMEOUT_MS } from '@/constants';
import { PLAYERS_KICK, TIMEOUT_PONG } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class PongTimeoutHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMEOUT_PONG]: this.onPongTimeout,
    };
  }

  onPongTimeout(connectionId: MainConnectionId): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    if (connection.meta.isBot === false && this.app.config.invalidProtocolAutoKick.pong === true) {
      const now = Date.now();

      if (connection.meta.lastMessageMs > now - CONNECTIONS_PACKET_PONG_TIMEOUT_MS) {
        this.log.info(`No Pong response. Kick player id${connection.meta.playerId}.`);
        this.emit(PLAYERS_KICK, connection.meta.playerId);
      } else {
        connection.meta.timeouts.pong = setTimeout(() => {
          this.emit(TIMEOUT_PONG, connectionId);
        }, CONNECTIONS_PACKET_PONG_TIMEOUT_MS);
      }
    }
  }
}
