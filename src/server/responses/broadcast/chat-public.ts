import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_CHAT_PUBLIC, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { PlayerId } from '../../../types';
import { System } from '../../system';

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
    this.log.chatPublic(senderId, text);

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.CHAT_PUBLIC,
        id: senderId,
        text,
      } as ServerPackets.ChatPublic,
      [...this.storage.mainConnectionIdList]
    );
  }
}
