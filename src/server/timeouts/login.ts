import { CONNECTIONS_KICK, TIMEOUT_LOGIN } from '../../events';
import { MainConnectionId } from '../../types';
import { System } from '../system';

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

    this.log.info('No Login request. Close connection: %o', {
      connectionId,
    });

    this.emit(CONNECTIONS_KICK, connectionId);
  }
}
