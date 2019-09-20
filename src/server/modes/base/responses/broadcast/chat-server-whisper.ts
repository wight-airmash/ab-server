import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { BROADCAST_CHAT_SERVER_WHISPER, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

export default class ChatServerWhisperBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_CHAT_SERVER_WHISPER]: this.onChatServerWhisper,
    };
  }

  /**
   * Private message by server bot.
   *
   * @param recipientId
   * @param text
   */
  onChatServerWhisper(recipientId: PlayerId, text: string): void {
    if (this.storage.playerMainConnectionList.has(recipientId)) {
      const recipientConnectionId = this.storage.playerMainConnectionList.get(recipientId);

      if (!this.storage.humanConnectionIdList.has(recipientConnectionId)) {
        return;
      }

      let offset = 0;

      while (offset < text.length) {
        this.emit(
          CONNECTIONS_SEND_PACKET,
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
  }
}
