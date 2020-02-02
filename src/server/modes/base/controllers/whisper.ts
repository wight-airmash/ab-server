import { ClientPackets } from '@airbattle/protocol';
import { CHAT_CHECK_LIMITS, CHAT_WHISPER, ROUTE_WHISPER } from '@/events';
import { CHANNEL_CHAT } from '@/server/channels';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class WhisperMessageHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ROUTE_WHISPER]: this.onMessageReceived,
    };
  }

  /**
   * Handle `Whisper` request
   *
   * @param connectionId player connection id
   * @param msg player packet
   */
  onMessageReceived(connectionId: MainConnectionId, msg: ClientPackets.Whisper): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    this.log.debug(`Player id${connection.meta.playerId} requested chat whisper.`);

    if (connection.meta.limits.chat > this.app.config.packetsLimit.chat) {
      this.log.debug(
        `Player id${connection.meta.playerId} whisper chat request was skipped due to chat limits.`
      );

      return;
    }

    this.emit(CHAT_CHECK_LIMITS, connection);

    if (!this.helpers.isPlayerMuted(connection.meta.playerId)) {
      this.channel(CHANNEL_CHAT).delay(CHAT_WHISPER, connection.meta.playerId, msg.id, msg.text);
    }
  }
}
