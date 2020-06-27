import { PLAYERS_KICK, TIMEOUT_BACKUP } from '../../events';
import { ConnectionId } from '../../types';
import { System } from '../system';

export default class BackupTimeoutHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMEOUT_BACKUP]: this.onBackupTimeout,
    };
  }

  onBackupTimeout(connectionId: ConnectionId): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    if (!connection.isBot && this.config.connections.invalidProtocolAutoKick.backup) {
      this.log.info('No Backup request. Kick the player: %o', {
        playerId: connection.playerId,
      });

      this.emit(PLAYERS_KICK, connection.playerId);
    }
  }
}
