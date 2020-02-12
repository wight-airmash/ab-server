import { ServerPackets, SERVER_ERRORS, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_BREAK, CONNECTIONS_SEND_PACKET, ERRORS_AFK_DISCONNECT } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';
import { CONNECTIONS_STATUS } from '@/constants';

export default class AfkDisconnectResponse extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ERRORS_AFK_DISCONNECT]: this.onAfkDisconnect,
    };
  }

  /**
   * Show an error message.
   *
   * @param connectionId
   */
  onAfkDisconnect(connectionId: MainConnectionId): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    if (connection.meta.status !== CONNECTIONS_STATUS.PENDING_TO_CLOSE) {
      this.emit(
        CONNECTIONS_SEND_PACKET,
        {
          c: SERVER_PACKETS.ERROR,
          error: SERVER_ERRORS.AFK_DISCONNECT,
        } as ServerPackets.Error,
        connectionId
      );

      /**
       * There must be a delay between the message and the connection break,
       * otherwise the frontend doesn't have time to process the message and to show it.
       */
      setTimeout(() => {
        this.emit(CONNECTIONS_BREAK, connectionId);
      }, 100);

      connection.meta.status = CONNECTIONS_STATUS.PENDING_TO_CLOSE;
    }
  }
}
