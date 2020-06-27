import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, RESPONSE_VOTEMUTE_PASSED } from '../../events';
import { MainConnectionId, PlayerId } from '../../types';
import { System } from '../system';

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
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.CHAT_VOTEMUTEPASSED,
        id: votedPlayerId,
      } as ServerPackets.ChatVotemutepassed,
      connectionId
    );
  }
}
