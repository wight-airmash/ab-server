import { SERVER_ERRORS, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_BREAK, ERRORS_INCORRECT_PROTOCOL, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class IncorrectProtocol extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ERRORS_INCORRECT_PROTOCOL]: this.onIncorrectProtocol,
    };
  }

  /**
   * Show an error message.
   *
   * @param connectionId
   */
  onIncorrectProtocol(connectionId: MainConnectionId): void {
    /**
     * TODO: there must be a delay between the message and the connection break,
     * otherwise the frontend doens't have time to process the message and to show it.
     */
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.ERROR,
        error: SERVER_ERRORS.INCORRECT_PROTOCOL,
      },
      connectionId
    );

    this.emit(CONNECTIONS_BREAK, connectionId);
  }
}
