import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { RESPONSE_VOTEMUTED, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

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
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.CHAT_VOTEMUTED,
      } as ServerPackets.ChatVotemuted,
      connectionId
    );
  }
}
