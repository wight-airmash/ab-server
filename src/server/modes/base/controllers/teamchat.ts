import { ClientPackets } from '@airbattle/protocol';
import { CHAT_CHECK_LIMITS, CHAT_TEAM, ROUTE_TEAMCHAT } from '@/events';
import { CHANNEL_CHAT } from '@/server/channels';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class TeamchatMessageHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ROUTE_TEAMCHAT]: this.onMessageReceived,
    };
  }

  /**
   * Handle `Teamchat` request
   *
   * @param connectionId player connection id
   * @param msg player packet
   */
  onMessageReceived(connectionId: MainConnectionId, msg: ClientPackets.Teamchat): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    this.log.debug(`Player id${connection.meta.playerId} requested chat team '${msg.text}'.`);

    if (connection.meta.limits.chat > this.app.config.packetsLimit.chat) {
      this.log.debug(
        `Player id${connection.meta.playerId} team chat request was skipped due to chat limits.`
      );

      return;
    }

    this.emit(CHAT_CHECK_LIMITS, connection);

    if (!this.helpers.isPlayerMuted(connection.meta.playerId)) {
      this.channel(CHANNEL_CHAT).delay(CHAT_TEAM, connection.meta.playerId, msg.text);
    }
  }
}
