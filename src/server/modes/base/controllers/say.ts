import { ClientPackets } from '@airbattle/protocol';
import { LIMITS_CHAT } from '@/constants';
import { CHAT_CHECK_LIMITS, CHAT_SAY, ROUTE_SAY } from '@/events';
import { CHANNEL_CHAT } from '@/server/channels';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

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

    this.log.debug(`Player id${connection.meta.playerId} requested say public '${msg.text}'.`);

    if (connection.meta.limits.chat > LIMITS_CHAT) {
      this.log.debug(
        `Player id${connection.meta.playerId} say public request was skipped due to chat limits.`
      );

      return;
    }

    this.emit(CHAT_CHECK_LIMITS, connection);

    if (!this.helpers.isPlayerMuted(connection.meta.playerId)) {
      this.channel(CHANNEL_CHAT).delay(CHAT_SAY, connection.meta.playerId, msg.text);
    }
  }
}
