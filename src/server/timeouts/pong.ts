import { CONNECTIONS_PACKET_PONG_TIMEOUT_MS } from '../../constants';
import { PLAYERS_KICK, TIMEOUT_PONG } from '../../events';
import { MainConnectionId } from '../../types';
import { System } from '../system';

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

    if (!connection.isBot && this.config.connections.invalidProtocolAutoKick.pong) {
      const now = Date.now();

      if (
        !connection.lagging.isActive &&
        connection.lastPacketAt > now - CONNECTIONS_PACKET_PONG_TIMEOUT_MS
      ) {
        this.log.info('No Pong response. Kick the player: %o', {
          playerId: connection.playerId,
        });

        this.emit(PLAYERS_KICK, connection.playerId);
      } else {
        connection.timeouts.pong = setTimeout(() => {
          this.emit(TIMEOUT_PONG, connectionId);
        }, CONNECTIONS_PACKET_PONG_TIMEOUT_MS);
      }
    }
  }
}
