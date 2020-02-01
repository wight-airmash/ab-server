import { SERVER_PACKETS, SERVER_ERRORS } from '@airbattle/protocol';
import { COMMAND_RESPAWN, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class BTRRespawnCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_RESPAWN]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: MainConnectionId): void {
    /**
     * Displays "Cannot respawn or change aircraft in a Battle Royale game" error in client
     */
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.ERROR,
        error: SERVER_ERRORS.FORBIDDEN_TO_CHANGE_PLANE_IN_BTR,
      },
      connectionId
    );
  }
}
