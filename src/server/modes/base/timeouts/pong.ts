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

    if (connection.meta.isBot === false) {
      this.log.debug(`No Pong response. Kick player id${connection.meta.playerId}.`);
      this.emit(PLAYERS_KICK, connection.meta.playerId);
    }
  }
}
