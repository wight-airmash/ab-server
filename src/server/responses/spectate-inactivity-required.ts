import { ServerPackets, SERVER_ERRORS, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, ERRORS_SPECTATE_INACTIVITY_HEALTH_REQUIRED } from '../../events';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class SpectateInactivityRequiredResponse extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ERRORS_SPECTATE_INACTIVITY_HEALTH_REQUIRED]: this.onInactivityRequired,
    };
  }

  /**
   * Show an error message.
   *
   * @param connectionId
   */
  onInactivityRequired(connectionId: MainConnectionId): void {
    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.ERROR,
        error: SERVER_ERRORS.REQUIRED_INACTIVITY_AND_HEALTH_TO_SPECTATE,
      } as ServerPackets.Error,
      connectionId
    );
  }
}
