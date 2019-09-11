import { BROADCAST_CHAT_PUBLIC, BROADCAST_CHAT_SERVER_PUBLIC } from '@/events';
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
    let offset = 0;

    while (offset < text.length) {
      this.emit(
        BROADCAST_CHAT_PUBLIC,
        this.storage.serverPlayerId,
        text.substring(offset, offset + 255)
      );

      offset += 255;
    }
  }
}
