import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { RESPONSE_VOTEMUTE_PASSED, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId, PlayerId } from '@/types';

export default class VotemutePassedResponse extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_VOTEMUTE_PASSED]: this.onVotemutePassed,
    };
  }

  /**
   * The player was successfully muted.
   *
   * @param connectionId
   * @param votedPlayerId
   */
  onVotemutePassed(connectionId: MainConnectionId, votedPlayerId: PlayerId): void {
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.CHAT_VOTEMUTEPASSED,
        id: votedPlayerId,
      } as ServerPackets.ChatVotemutepassed,
      connectionId
    );
  }
}
