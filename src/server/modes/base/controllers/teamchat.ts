import { ClientPackets } from '@airbattle/protocol';
import { CHAT_TEAM, ROUTE_TEAMCHAT, CHAT_CHECK_LIMITS } from '@/events';
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

    this.emit(CHAT_CHECK_LIMITS, connection);

    if (!this.helpers.isPlayerMuted(connection.meta.playerId)) {
      this.channel(CHANNEL_CHAT).delay(CHAT_TEAM, connection.meta.playerId, msg.text);
      this.log.debug(`Player id${connection.meta.playerId} requested chat team '${msg.text}'.`);
    }
  }
}
