import { SERVER_ERRORS, SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { ERRORS_RESPAWN_INACTIVITY_HEALTH_REQUIRED, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class RespawnInactivityRequired extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ERRORS_RESPAWN_INACTIVITY_HEALTH_REQUIRED]: this.onInactivityRequired,
    };
  }

  /**
   * Show an error message.
   *
   * @param connectionId
   */
  onInactivityRequired(connectionId: MainConnectionId): void {
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.ERROR,
        error: SERVER_ERRORS.REQUIRED_INACTIVITY_AND_HEALTH_TO_RESPAWN,
      } as ServerPackets.Error,
      connectionId
    );
  }
}
