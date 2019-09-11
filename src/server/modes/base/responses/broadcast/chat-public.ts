import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { BROADCAST_CHAT_PUBLIC, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

export default class ChatPublicBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_CHAT_PUBLIC]: this.onChatPublic,
    };
  }

  /**
   * Broadcast to all players.
   *
   * @param senderId
   * @param text
   */
  onChatPublic(senderId: PlayerId, text: string): void {
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.CHAT_PUBLIC,
        id: senderId,
        text,
      } as ServerPackets.ChatPublic,
      [...this.storage.mainConnectionIdList]
    );
  }
}
