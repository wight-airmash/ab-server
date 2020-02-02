import { PLAYERS_KICK, TIMEOUT_BACKUP } from '@/events';
import { System } from '@/server/system';
import { ConnectionId } from '@/types';

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

    if (
      connection.meta.isBot === false &&
      this.app.config.invalidProtocolAutoKick.backup === true
    ) {
      this.log.info(`No Backup request. Kick player id${connection.meta.playerId}.`);
      this.emit(PLAYERS_KICK, connection.meta.playerId);
    }
  }
}
