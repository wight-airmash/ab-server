import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import {
  BROADCAST_CHAT_SAY,
  BROADCAST_CHAT_SAY_REPEAT,
  CONNECTIONS_SEND_PACKETS,
} from '../../../events';
import { MainConnectionId, PlayerId } from '../../../types';
import { System } from '../../system';

export default class ChatSayBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_CHAT_SAY_REPEAT]: this.onChatSayRepeat,
      [BROADCAST_CHAT_SAY]: this.onChatSay,
    };
  }

  /**
   * Send recently broadcasted /say message to the player,
   * who appeared in the author viewport.
   *
   * @param senderId
   * @param recipientId
   */
  onChatSayRepeat(senderId: PlayerId, recipientId: PlayerId): void {
    const sender = this.storage.playerList.get(senderId);

    this.onChatSay(senderId, sender.say.text, recipientId);
  }

  /**
   * Broadcast to all player who sees the sender.
   *
   * @param senderId
   * @param text
   */
  onChatSay(senderId: PlayerId, text: string, recipientId?: PlayerId): void {
    this.log.chatSay(senderId, text);

    let recipients: MainConnectionId | MainConnectionId[] = null;

    if (recipientId) {
      if (this.storage.playerMainConnectionList.has(recipientId)) {
        recipients = this.storage.playerMainConnectionList.get(recipientId);
      } else {
        return;
      }
    } else {
      recipients = [...this.storage.broadcast.get(senderId)];
    }

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.CHAT_SAY,
        id: senderId,
        text,
      } as ServerPackets.ChatSay,
      recipients
    );
  }
}
