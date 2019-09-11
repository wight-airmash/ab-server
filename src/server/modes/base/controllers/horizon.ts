import { ClientPackets } from '@airbattle/protocol';
import { CHANNEL_UPDATE_HORIZON } from '@/server/channels';
import { PLAYERS_SET_NEW_HORIZON, ROUTE_HORIZON } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

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
      connection.meta.playerId,
      msg.horizonX,
      msg.horizonY
    );
  }
}
