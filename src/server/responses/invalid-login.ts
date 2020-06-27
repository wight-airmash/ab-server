import { ServerPackets, SERVER_ERRORS, SERVER_PACKETS } from '@airbattle/protocol';
import {
  CONNECTIONS_DISCONNECT,
  CONNECTIONS_SEND_PACKETS,
  ERRORS_INVALID_LOGIN_DATA,
} from '../../events';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class InvalidLoginResponse extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ERRORS_INVALID_LOGIN_DATA]: this.onInvalidLogin,
    };
  }

  /**
   * Show an error message.
   *
   * @param connectionId
   */
  onInvalidLogin(connectionId: MainConnectionId): void {
    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.ERROR,
        error: SERVER_ERRORS.INVALID_LOGIN_DATA,
      } as ServerPackets.Error,
      connectionId
    );

    /**
     * There must be a delay between the message and the connection break,
     * otherwise the frontend doens't have time to process the message and to show it.
     */
    setTimeout(() => {
      this.emit(CONNECTIONS_DISCONNECT, connectionId);
    }, 100);
  }
}
