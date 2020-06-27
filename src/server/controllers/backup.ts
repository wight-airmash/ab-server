import { ClientPackets } from '@airbattle/protocol';
import { CONNECTIONS_PACKET_ACK_TIMEOUT_MS } from '../../constants';
import { CONNECTIONS_KICK, RESPONSE_BACKUP, ROUTE_BACKUP, TIMEOUT_ACK } from '../../events';
import { BackupConnectionId } from '../../types';
import { System } from '../system';

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

    clearTimeout(backupConnection.timeouts.login);
    clearTimeout(backupConnection.timeouts.backup);

    if (backupConnection.isMain || !this.storage.backupTokenList.has(msg.token)) {
      this.emit(CONNECTIONS_KICK, connectionId);

      return;
    }

    const playerId = this.storage.backupTokenList.get(msg.token);

    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    const mainConnection = this.storage.connectionList.get(
      this.storage.playerMainConnectionList.get(playerId)
    );

    clearTimeout(mainConnection.timeouts.backup);
    this.storage.backupTokenList.delete(msg.token);

    backupConnection.isBackup = true;
    backupConnection.playerId = playerId;
    this.storage.playerBackupConnectionList.set(playerId, connectionId);

    this.emit(RESPONSE_BACKUP, connectionId);

    this.log.debug('Player established backup connection: %o', {
      playerId,
      connectionId,
    });

    backupConnection.timeouts.ack = setTimeout(() => {
      this.emit(TIMEOUT_ACK, connectionId);
    }, CONNECTIONS_PACKET_ACK_TIMEOUT_MS);
  }
}
