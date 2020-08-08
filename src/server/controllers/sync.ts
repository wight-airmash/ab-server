import { ROUTE_SYNC_START } from '../../events';
import { ConnectionId, ConnectionMeta } from '../../types';
import { System } from '../system';

export default class SyncMessageHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ROUTE_SYNC_START]: this.onSyncStart,
    };
  }

  /**
   * Validate and return sync connection.
   */
  validateConnection(connectionId: ConnectionId): ConnectionMeta {
    if (!this.storage.connectionList.has(connectionId)) {
      return null;
    }

    const connection = this.storage.connectionList.get(connectionId);

    /**
     * Disregard connection if it was already identified as a player connection via LOGIN or BACKUP.
     */
    if (connection.isMain || connection.isBackup) {
      return null;
    }

    return connection;
  }

  /**
   * SYNC_START packet handler.
   */
  onSyncStart(connectionId: ConnectionId): void {
    /**
     * Validate and get connection object.
     */
    const connection = this.validateConnection(connectionId);
    if (connection == null) {
      return;
    }

    this.log.debug('Sync start received.');

    /**
     * Identifies this as a sync server connection.
     */
    connection.isSync = true;

    /**
     * These timeouts for player connections no longer apply.
     */
    clearTimeout(connection.timeouts.login);
    clearTimeout(connection.timeouts.backup);
    clearTimeout(connection.timeouts.ack);

    // TODO: response
  }
}
