import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { System } from '@/server/system';
import { CONNECTIONS_SEND_PACKET, BROADCAST_CHAT_TEAM } from '@/events';
import { PlayerId } from '@/types';

export default class ChatTeamBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_CHAT_TEAM]: this.onChatTeam,
    };
  }

  /**
   * Broadcast to all teammates.
   *
   * @param senderId
   * @param text
   */
  onChatTeam(senderId: PlayerId, text: string): void {
    const player = this.storage.playerList.get(senderId);

    const recipients = [...this.storage.connectionIdByTeam.get(player.team.current)];

    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.CHAT_TEAM,
        id: senderId,
        text,
      } as ServerPackets.ChatTeam,
      recipients
    );
  }
}
