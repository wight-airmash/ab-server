import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { CHAT_FIRST_MESSAGE_SAFE_DELAY_MS } from '../../../constants';
import { BROADCAST_CHAT_SERVER_WHISPER, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { MainConnectionId, PlayerId } from '../../../types';
import { System } from '../../system';

export default class ChatServerWhisperBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_CHAT_SERVER_WHISPER]: this.onChatServerWhisper,
    };
  }

  protected sendMessage(
    recipientConnectionId: MainConnectionId,
    recipientId: PlayerId,
    text: string
  ): void {
    let offset = 0;

    while (offset < text.length) {
      this.emit(
        CONNECTIONS_SEND_PACKETS,
        {
          c: SERVER_PACKETS.CHAT_WHISPER,
          from: this.storage.serverPlayerId,
          to: recipientId,
          text: text.substring(offset, offset + 255),
        } as ServerPackets.ChatWhisper,
        recipientConnectionId
      );

      offset += 255;
    }
  }

  /**
   * Private message by server bot.
   *
   * @param recipientId
   * @param text
   */
  onChatServerWhisper(recipientId: PlayerId, text: string): void {
    if (!this.helpers.isPlayerConnected(recipientId)) {
      return;
    }

    const recipientConnectionId = this.storage.playerMainConnectionList.get(recipientId);

    if (!this.storage.humanConnectionIdList.has(recipientConnectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(recipientConnectionId);
    const now = Date.now();
    const connectionDurationMs = now - connection.createdAt;

    /**
     * The logic of the frontend's anti-spam is taken into account.
     */
    if (connectionDurationMs < CHAT_FIRST_MESSAGE_SAFE_DELAY_MS) {
      setTimeout(() => {
        this.sendMessage(recipientConnectionId, recipientId, text);
      }, CHAT_FIRST_MESSAGE_SAFE_DELAY_MS - connectionDurationMs);
    } else {
      this.sendMessage(recipientConnectionId, recipientId, text);
    }
  }
}
