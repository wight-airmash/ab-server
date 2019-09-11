import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { BROADCAST_CHAT_WHISPER, RESPONSE_COMMAND_REPLY, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

export default class ChatWhisperBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_CHAT_WHISPER]: this.onChatWhisper,
    };
  }

  /**
   * Broadcast to sender and recipient.
   *
   * @param senderId
   * @param recipientId
   * @param text
   */
  onChatWhisper(senderId: PlayerId, recipientId: PlayerId, text: string): void {
    const senderConnectionId = this.storage.playerMainConnectionList.get(senderId);

    if (this.storage.playerMainConnectionList.has(recipientId)) {
      const recipientConnectionId = this.storage.playerMainConnectionList.get(recipientId);
      const recipients = [senderConnectionId];

      if (recipientConnectionId !== senderConnectionId) {
        recipients.push(recipientConnectionId);
      }

      this.emit(
        CONNECTIONS_SEND_PACKET,
        {
          c: SERVER_PACKETS.CHAT_WHISPER,
          from: senderId,
          to: recipientId,
          text,
        } as ServerPackets.ChatWhisper,
        recipients
      );
    } else {
      this.emit(RESPONSE_COMMAND_REPLY, senderConnectionId, 'Unknown player.');
    }
  }
}
