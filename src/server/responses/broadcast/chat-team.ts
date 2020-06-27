import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_CHAT_TEAM, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { PlayerId } from '../../../types';
import { System } from '../../system';

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

    this.log.chatTeam(senderId, player.team.current, text);

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.CHAT_TEAM,
        id: senderId,
        text,
      } as ServerPackets.ChatTeam,
      recipients
    );
  }
}
