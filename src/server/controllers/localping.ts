import { ROUTE_LOCALPING } from '../../events';
import { ConnectionId } from '../../types';
import { System } from '../system';

export default class LocalpingMessageHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ROUTE_LOCALPING]: this.onMessageReceived,
    };
  }

  /**
   * Currently `Localping` isn't used by server and client.
   */
  onMessageReceived(connectionId: ConnectionId): void {
    this.log.debug('Localping packet: %o', {
      connectionId,
    });
  }
}
