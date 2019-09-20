import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_CHAT_SERVER_PUBLIC, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';

export default class ChatServerPublicBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_CHAT_SERVER_PUBLIC]: this.onChatServerPublic,
    };
  }

  /**
   * Public chat message by server bot.
   *
   * @param text
   */
  onChatServerPublic(text: string): void {
    const recipients = [...this.storage.humanConnectionIdList];
    let offset = 0;

    while (offset < text.length) {
      this.emit(
        CONNECTIONS_SEND_PACKET,
        {
          c: SERVER_PACKETS.CHAT_PUBLIC,
          id: this.storage.serverPlayerId,
          text: text.substring(offset, offset + 255),
        } as ServerPackets.ChatPublic,
        recipients
      );

      offset += 255;
    }
  }
}
