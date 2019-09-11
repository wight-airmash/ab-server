import { SERVER_ERRORS, SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { CONNECTIONS_BREAK, ERRORS_INVALID_LOGIN_DATA, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class InvalidLogin extends System {
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
    /**
     * TODO: there must be a delay between the message and the connection break,
     * otherwise the frontend doens't have time to process the message and to show it.
     */
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.ERROR,
        error: SERVER_ERRORS.INVALID_LOGIN_DATA,
      } as ServerPackets.Error,
      connectionId
    );

    this.emit(CONNECTIONS_BREAK, connectionId);
  }
}
