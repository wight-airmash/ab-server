import { CONNECTIONS_KICK, TIMEOUT_LOGIN } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class LoginTimeoutHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMEOUT_LOGIN]: this.onLoginTimeout,
    };
  }

  onLoginTimeout(connectionId: MainConnectionId): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    this.log.info(`No Login request. Kick by connection id${connectionId}.`);
    this.emit(CONNECTIONS_KICK, connectionId);
  }
}
