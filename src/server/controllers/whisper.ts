import { ClientPackets } from '@airbattle/protocol';
import { CHAT_CHECK_LIMITS, CHAT_WHISPER, ROUTE_WHISPER } from '../../events';
import { CHANNEL_CHAT } from '../../events/channels';
import { MainConnectionId } from '../../types';
import { System } from '../system';

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

    /**
     * Skip spam.
     */
    if (connection.limits.chat > this.config.connections.packetLimits.chat) {
      return;
    }

    this.emit(CHAT_CHECK_LIMITS, connection);

    if (!this.helpers.isPlayerMuted(connection.playerId)) {
      this.channel(CHANNEL_CHAT).delay(CHAT_WHISPER, connection.playerId, msg.id, msg.text);
    }
  }
}
