import { COMMAND_DROP_FLAG, CTF_PLAYER_DROP_FLAG } from '@/events';
import { System } from '@/server/system';
import { ConnectionId } from '@/types';

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
      !this.helpers.isPlayerConnected(connection.meta.playerId)
    ) {
      return;
    }

    const player = this.storage.playerList.get(connection.meta.playerId);

    if (player.planestate.flagspeed === true) {
      this.emit(CTF_PLAYER_DROP_FLAG, connection.meta.playerId);
    }
  }
}
