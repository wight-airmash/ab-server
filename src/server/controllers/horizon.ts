import { ClientPackets } from '@airbattle/protocol';
import { PLAYERS_SET_NEW_HORIZON, ROUTE_HORIZON } from '../../events';
import { CHANNEL_UPDATE_HORIZON } from '../../events/channels';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class HorizonMessageHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ROUTE_HORIZON]: this.onMessageReceived,
    };
  }

  /**
   * Handle `Horizon` request
   *
   * @param connectionId player connection id
   * @param msg player packet
   */
  onMessageReceived(connectionId: MainConnectionId, msg: ClientPackets.Horizon): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    this.channel(CHANNEL_UPDATE_HORIZON).delay(
      PLAYERS_SET_NEW_HORIZON,
      connection.playerId,
      msg.horizonX,
      msg.horizonY
    );
  }
}
