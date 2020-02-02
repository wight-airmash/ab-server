import { ClientPackets } from '@airbattle/protocol';
import { CHAT_CHECK_LIMITS, CHAT_PUBLIC, ROUTE_CHAT } from '@/events';
import { CHANNEL_CHAT } from '@/server/channels';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

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

    this.log.debug(`Player id${connection.meta.playerId} requested chat public '${msg.text}'.`);

    if (connection.meta.limits.chat > this.app.config.packetsLimit.chat) {
      this.log.debug(
        `Player id${connection.meta.playerId} public chat request was skipped due to chat limits.`
      );

      return;
    }

    this.emit(CHAT_CHECK_LIMITS, connection);

    if (!this.helpers.isPlayerMuted(connection.meta.playerId)) {
      this.channel(CHANNEL_CHAT).delay(CHAT_PUBLIC, connection.meta.playerId, msg.text);
    }
  }
}
