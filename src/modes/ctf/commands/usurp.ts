import { COMMAND_USURP, CTF_USURP_LEADER_POSITION } from '../../../events';
import { System } from '../../../server/system';
import { ConnectionId } from '../../../types';

export default class UsurpCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_USURP]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: ConnectionId): void {
    const connection = this.storage.connectionList.get(connectionId);

    if (
      !this.storage.connectionList.has(connectionId) ||
      !this.helpers.isPlayerConnected(connection.playerId)
    ) {
      return;
    }

    this.emit(CTF_USURP_LEADER_POSITION, connection.playerId);
  }
}
