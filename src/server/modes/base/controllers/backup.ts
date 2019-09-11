import { ClientPackets } from '@airbattle/protocol';
import { CONNECTIONS_PACKET_ACK_TIMEOUT_MS } from '@/constants';
import { CONNECTIONS_KICK, RESPONSE_BACKUP, ROUTE_BACKUP, TIMEOUT_ACK } from '@/events';
import { System } from '@/server/system';
import { BackupConnectionId } from '@/types';

export default class BackupMessageHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ROUTE_BACKUP]: this.onBackupMessageReceived,
    };
  }

  /**
   * Handle `Backup` request
   *
   * @param connectionId player connection id
   * @param msg player packet
   */
  onBackupMessageReceived(connectionId: BackupConnectionId, msg: ClientPackets.Backup): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const backupConnection = this.storage.connectionList.get(connectionId);

    clearTimeout(backupConnection.meta.timeouts.login);
    clearTimeout(backupConnection.meta.timeouts.backup);

    if (backupConnection.meta.isMain === true || !this.storage.backupTokenList.has(msg.token)) {
      this.emit(CONNECTIONS_KICK, connectionId);

      return;
    }

    const playerId = this.storage.backupTokenList.get(msg.token);
    const mainConnection = this.storage.connectionList.get(
      this.storage.playerMainConnectionList.get(playerId)
    );

    clearTimeout(mainConnection.meta.timeouts.backup);
    this.storage.backupTokenList.delete(msg.token);

    backupConnection.meta.isBackup = true;
    backupConnection.meta.playerId = playerId;
    this.storage.playerBackupConnectionList.set(playerId, connectionId);

    this.emit(RESPONSE_BACKUP, connectionId);
    this.log.debug(`Player id${playerId} established backup connection id${connectionId}.`);

    backupConnection.meta.timeouts.ack = setTimeout(() => {
      this.emit(TIMEOUT_ACK, connectionId);
    }, CONNECTIONS_PACKET_ACK_TIMEOUT_MS);
  }
}
