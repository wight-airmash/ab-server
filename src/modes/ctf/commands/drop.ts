import { COMMAND_DROP_FLAG, CTF_PLAYER_DROP_FLAG } from '../../../events';
import { System } from '../../../server/system';
import { ConnectionId } from '../../../types';

export default class DropCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_DROP_FLAG]: this.onCommandReceived,
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

    const player = this.storage.playerList.get(connection.playerId);

    if (player.planestate.flagspeed) {
      this.emit(CTF_PLAYER_DROP_FLAG, connection.playerId);
    }
  }
}
