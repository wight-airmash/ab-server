import { SERVER_PACKETS, ServerPackets, SERVER_MESSAGE_TYPES } from '@airbattle/protocol';
import { RESPONSE_SERVER_MESSAGE, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class ServerMessage extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_SERVER_MESSAGE]: this.onServerMessage,
    };
  }

  /**
   * Show custom message on the player screen.
   *
   * @param connectionId
   * @param text text or html content
   * @param type
   * @param duration time on the screen, ms
   */
  onServerMessage(
    connectionId: MainConnectionId,
    text: string,
    type: SERVER_MESSAGE_TYPES,
    duration: number
  ): void {
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.SERVER_MESSAGE,
        type,
        duration,
        text,
      } as ServerPackets.ServerMessage,
      connectionId
    );
  }
}
