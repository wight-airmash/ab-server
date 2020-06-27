import { COMMAND_ELECTIONS, CTF_START_ELECTIONS } from '../../../events';
import { System } from '../../../server/system';
import { ConnectionId } from '../../../types';

export default class ElectionsCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_ELECTIONS]: this.onCommandReceived,
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

    this.emit(CTF_START_ELECTIONS, connection.playerId);
  }
}
