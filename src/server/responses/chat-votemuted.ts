import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, RESPONSE_VOTEMUTED } from '../../events';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class VotemutedResponse extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_VOTEMUTED]: this.onVotemuted,
    };
  }

  /**
   * Unlucky for you.
   *
   * @param connectionId
   */
  onVotemuted(connectionId: MainConnectionId): void {
    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.CHAT_VOTEMUTED,
      } as ServerPackets.ChatVotemuted,
      connectionId
    );
  }
}
