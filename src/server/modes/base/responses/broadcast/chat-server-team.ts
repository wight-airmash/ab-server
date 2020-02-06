import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_CHAT_SERVER_TEAM, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { TeamId, MainConnectionId } from '@/types';

export default class ChatServerTeamBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_CHAT_SERVER_TEAM]: this.onChatServerTeam,
    };
  }

  /**
   * Team chat message by server bot.
   *
   * @param teamId
   * @param text
   */
  onChatServerTeam(teamId: TeamId, text: string): void {
    const recipients: MainConnectionId[] = [];

    if (this.storage.connectionIdByTeam.has(teamId) === true) {
      this.storage.connectionIdByTeam.get(teamId).forEach(connectionId => {
        if (this.storage.humanConnectionIdList.has(connectionId) === true) {
          recipients.push(connectionId);
        }
      });
    }

    if (recipients.length === 0) {
      return;
    }

    let offset = 0;

    while (offset < text.length) {
      this.emit(
        CONNECTIONS_SEND_PACKET,
        {
          c: SERVER_PACKETS.CHAT_TEAM,
          id: this.storage.serverPlayerId,
          text: text.substring(offset, offset + 255),
        } as ServerPackets.ChatTeam,
        recipients
      );

      offset += 255;
    }
  }
}
