import { SERVER_ERRORS, SERVER_PACKETS } from '@airbattle/protocol';
import {
  CONNECTIONS_DISCONNECT,
  CONNECTIONS_SEND_PACKETS,
  ERRORS_INCORRECT_PROTOCOL,
} from '../../events';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class IncorrectProtocolResponse extends System {
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
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.ERROR,
        error: SERVER_ERRORS.INCORRECT_PROTOCOL,
      },
      connectionId
    );

    this.emit(CONNECTIONS_DISCONNECT, connectionId);
  }
}
