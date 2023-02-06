import { ClientPackets } from '@airbattle/protocol';
import { LIMITS_SAY_WEIGHT } from '../../constants';
import { CHAT_SAY, RESPONSE_COMMAND_REPLY, ROUTE_SAY } from '../../events';
import { CHANNEL_CHAT } from '../../events/channels';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class SayMessageHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ROUTE_SAY]: this.onMessageReceived,
    };
  }

  /**
   * Handle `Say` request
   *
   * @param connectionId player connection id
   * @param msg player packet
   */
  onMessageReceived(connectionId: MainConnectionId, msg: ClientPackets.Say): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    /**
     * Skip spam messages.
     */
    if (connection.limits.say > this.config.connections.packetLimits.say) {
      this.emit(
        RESPONSE_COMMAND_REPLY,
        connectionId,
        'Too frequent /say usage. Message discarded.'
      );

      return;
    }

    connection.limits.say += LIMITS_SAY_WEIGHT;

    if (!this.helpers.isPlayerMuted(connection.playerId)) {
      this.channel(CHANNEL_CHAT).delay(CHAT_SAY, connection.playerId, msg.text);
    }
  }
}
