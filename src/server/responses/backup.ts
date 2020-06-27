import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, RESPONSE_BACKUP } from '../../events';
import { BackupConnectionId } from '../../types';
import { System } from '../system';

export default class BackupResponse extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_BACKUP]: this.onBackupResponse,
    };
  }

  /**
   * Response on player's valid `Backup` request.
   * Backup connection was successfully established.
   *
   * @param connectionId
   */
  onBackupResponse(connectionId: BackupConnectionId): void {
    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.BACKUP,
      } as ServerPackets.Backup,
      connectionId
    );
  }
}
