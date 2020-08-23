import { ClientPackets, SERVER_PACKETS, SERVER_ERRORS } from '@airbattle/protocol';
import {
  CONNECTIONS_DISCONNECT,
  CONNECTIONS_SEND_PACKETS,
  ROUTE_SYNC_START,
  ROUTE_SYNC_AUTH,
  ROUTE_SYNC_INIT,
} from '../../events';
import { ConnectionId, ConnectionMeta } from '../../types';
import { System } from '../system';
import { generateRandomString } from '../../support/strings';

type SyncAuthTokenData = {
  nonce: string;
  for: string;
};

export default class SyncMessageHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ROUTE_SYNC_START]: this.onSyncStart,
      [ROUTE_SYNC_AUTH]: this.onSyncAuth,
      [ROUTE_SYNC_INIT]: this.onSyncInit,
    };
  }

  /**
   * Helper function for disconnecting on error.
   */
  sendErrorAndDisconnect(connectionId: ConnectionId, error: SERVER_ERRORS): void {
    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.ERROR,
        error,
      },
      connectionId
    );

    setTimeout(() => {
      this.emit(CONNECTIONS_DISCONNECT, connectionId);
    }, 100);
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
     * Reject if we are not configured to synchronize.
     *
     * As this cannot be marked as a sync connection, this means all other sync packet types will be ignored as well.
     */
    if (!this.config.accounts.userStats.synchronize) {
      this.log.warn('Sync start received but server is not configured for this feature.');
      this.sendErrorAndDisconnect(connectionId, SERVER_ERRORS.SYNC_NOT_CONFIGURED);

      return;
    }

    /**
     * Reject if we are not ready to synchronize.
     */
    if (this.storage.loginPublicKey === null) {
      this.log.warn('Sync start received but we are not ready, still awaiting login key.');
      this.sendErrorAndDisconnect(connectionId, SERVER_ERRORS.SYNC_NOT_READY);

      return;
    }

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

    /**
     * Generate nonce and send it as authentication challenge to the sync service.
     */
    connection.sync.auth.nonce = generateRandomString(16);
    this.log.debug('Sending nonce for sync auth: %o', connection.sync.auth.nonce);
    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.SYNC_AUTH,
        challenge: connection.sync.auth.nonce,
      },
      connectionId
    );
  }

  /**
   * SYNC_AUTH packet handler.
   */
  onSyncAuth(connectionId: ConnectionId, msg: ClientPackets.SyncAuth): void {
    /**
     * Validate and get connection object.
     */
    const connection = this.validateConnection(connectionId);

    if (connection == null) {
      return;
    }

    /**
     * Ignore if sync connection has not been started.
     */
    if (!connection.isSync) {
      return;
    }

    this.log.debug('Sync auth received.');

    /**
     * Validate authentication response.
     */
    let failedAuth = true;
    const token = msg.response;

    try {
      /**
       * Call to verifyToken will return null if unverified.
       */

      const auth = this.helpers.verifyToken(token) as SyncAuthTokenData;

      if (auth === null) {
        this.log.debug('Sync token was not verified.');
      } else if (undefined === auth.nonce || undefined === auth.for) {
        this.log.debug('Required fields not present in sync auth token data.');
      } else if (auth.for !== 'sync') {
        this.log.debug('Sync auth token purpose is incorrect.');
      } else if (connection.sync.auth.nonce === null) {
        this.log.debug('Sync auth received but no nonce associated with connection.');
      } else if (auth.nonce !== connection.sync.auth.nonce) {
        this.log.debug('Sync auth nonce does not match that generated.');
      } else {
        /**
         * If we've reached here then authentication is successful.
         */
        connection.sync.auth.nonce = null;
        connection.sync.auth.complete = true;
        failedAuth = false;
      }
    } catch (err) {
      this.log.debug('Sync auth data parsing error: %o', { error: err.stack });
    }

    if (!failedAuth) {
      this.log.info('Sync auth successful.');

      /**
       * Send initialization data to sync service.
       */
      this.emit(
        CONNECTIONS_SEND_PACKETS,
        {
          c: SERVER_PACKETS.SYNC_INIT,
          sequence: this.storage.sync.nextSequenceId,
          timestamp: Date.now(),
        },
        connectionId
      );
    } else {
      this.log.warn('Sync auth failed, disconnecting');
      this.sendErrorAndDisconnect(connectionId, SERVER_ERRORS.SYNC_AUTH_INVALID);
    }
  }

  /**
   * SYNC_INIT packet handler.
   */
  onSyncInit(connectionId: ConnectionId, msg: ClientPackets.SyncInit): void {
    const { sync } = this.storage;

    /**
     * Validate and get connection object.
     */
    const connection = this.validateConnection(connectionId);

    if (connection == null) {
      return;
    }

    /**
     * Ignore if sync connection has not been started.
     */
    if (!connection.isSync) {
      return;
    }

    this.log.debug('Sync init received');
    let failedInit = false;

    /**
     * Reject if sync connection is not authenticated.
     */
    if (!connection.sync.auth.complete) {
      this.log.error('Sync connection not authenticated, rejecting initialization');
      failedInit = true;
    }

    /**
     * Validate and store sync init data.
     */
    if (!failedInit) {
      const tsdiff = Date.now() - msg.timestamp;

      this.log.debug('Sync time difference is %d ms', tsdiff);

      sync.nextSequenceId = Math.max(msg.sequence, sync.nextSequenceId);
      this.log.debug('Next sequence id: %d', sync.nextSequenceId);

      sync.thisServerId = msg.serverId;
      this.log.debug('Server id: %s', msg.serverId);

      sync.thisServerEndpoint = msg.wsEndpoint;
      this.log.debug('Public websocket endpoint: %s', msg.wsEndpoint);
    }

    if (!failedInit) {
      /**
       * Initialization succeeded.
       */
      const previousSyncConnectionId = sync.connectionId;

      connection.sync.init.complete = true;

      sync.connectionId = connectionId;
      sync.active = true;

      this.log.info('Sync init successful, new sync connection id: %d', sync.connectionId);

      if (previousSyncConnectionId !== null) {
        this.log.warn('Replaced existing sync connection id %d', previousSyncConnectionId);
        this.emit(CONNECTIONS_DISCONNECT, previousSyncConnectionId);
      }

      /**
       * Send object subscription requests.
       */
      sync.subscribedObjects.forEach(combinedObjectTypeId => {
        const [type, id] = combinedObjectTypeId.split(':');

        this.emit(
          CONNECTIONS_SEND_PACKETS,
          {
            c: SERVER_PACKETS.SYNC_SUBSCRIBE,
            active: true,
            type,
            id,
          },
          connectionId
        );
      });
    } else {
      /**
       * Initialization failed.
       */
      this.log.warn('Sync init failed, disconnecting');
      this.sendErrorAndDisconnect(connectionId, SERVER_ERRORS.SYNC_INIT_INVALID);
    }
  }
}
