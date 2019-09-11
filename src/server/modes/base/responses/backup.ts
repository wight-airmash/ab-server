import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { RESPONSE_BACKUP, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { BackupConnectionId } from '@/types';

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
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.BACKUP,
      } as ServerPackets.Backup,
      connectionId
    );
  }
}
