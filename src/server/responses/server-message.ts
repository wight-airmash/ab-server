import { ServerPackets, SERVER_MESSAGE_TYPES, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, RESPONSE_SERVER_MESSAGE } from '../../events';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class ServerMessageResponse extends System {
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
      CONNECTIONS_SEND_PACKETS,
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
