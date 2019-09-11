import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { BROADCAST_CHAT_SAY, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

export default class ChatSayBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_CHAT_SAY]: this.onChatSay,
    };
  }

  /**
   * Broadcast to all players.
   *
   * @param senderId
   * @param text
   */
  onChatSay(senderId: PlayerId, text: string): void {
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.CHAT_SAY,
        id: senderId,
        text,
      } as ServerPackets.ChatSay,
      [...this.storage.mainConnectionIdList]
    );
  }
}
