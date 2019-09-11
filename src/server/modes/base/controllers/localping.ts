import { System } from '@/server/system';
import { ROUTE_LOCALPING } from '@/events';

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
  onMessageReceived(): void {
    this.log.debug('Localping packet');
  }
}
