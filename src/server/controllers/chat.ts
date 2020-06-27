import { ClientPackets } from '@airbattle/protocol';
import { CHAT_CHECK_LIMITS, CHAT_PUBLIC, ROUTE_CHAT } from '../../events';
import { CHANNEL_CHAT } from '../../events/channels';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class ChatMessageHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ROUTE_CHAT]: this.onMessageReceived,
    };
  }

  /**
   * Handle `Chat` request
   *
   * @param connectionId player connection id
   * @param msg player packet
   */
  onMessageReceived(connectionId: MainConnectionId, msg: ClientPackets.Chat): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    /**
     * Skip spam messages.
     */
    if (connection.limits.chat > this.config.connections.packetLimits.chat) {
      return;
    }

    this.emit(CHAT_CHECK_LIMITS, connection);

    if (!this.helpers.isPlayerMuted(connection.playerId)) {
      this.channel(CHANNEL_CHAT).delay(CHAT_PUBLIC, connection.playerId, msg.text);
    }
  }
}
