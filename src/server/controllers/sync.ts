import { ClientPackets, SERVER_PACKETS, SERVER_ERRORS } from '@airbattle/protocol';
import {
  CONNECTIONS_DISCONNECT,
  CONNECTIONS_SEND_PACKETS,
  ROUTE_SYNC_START,
  ROUTE_SYNC_AUTH,
  ROUTE_SYNC_INIT,
  ROUTE_SYNC_UPDATE,
  ROUTE_SYNC_ACK,
  RESPONSE_SCORE_UPDATE,
} from '../../events';
import { ConnectionId, ConnectionMeta } from '../../types';
import { System } from '../system';
import { generateRandomString } from '../../support/strings';
import Entity from '../entity';
import Id from '../components/mob-id';
import LifetimeStats from '../components/lifetime-stats';
import { OBJECT_TYPE_ID_FIELD_SEPARATOR } from '../../constants';

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
      [ROUTE_SYNC_UPDATE]: this.onSyncUpdate,
      [ROUTE_SYNC_ACK]: this.onSyncAck,
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
   * Helper function for sending error details to sync service.
   *
   * SERVER_CUSTOM is used here because ERROR packet type only has an error code field.
   */
  sendErrorCustom(connectionId: ConnectionId, error: SERVER_ERRORS, data: any): void {
    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.SERVER_CUSTOM,
        type: error,
        data: JSON.stringify(data),
      },
      connectionId
    );

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.ERROR,
        error,
      },
      connectionId
    );
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
        const [type, id] = combinedObjectTypeId.split(OBJECT_TYPE_ID_FIELD_SEPARATOR);

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

  /**
   * SYNC_UPDATE packet handler.
   */
  onSyncUpdate(connectionId: ConnectionId, msg: ClientPackets.SyncUpdate): void {
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

    this.log.debug('Sync update received: %o', msg);
    let failedUpdate = false;

    /**
     * Reject if sync connection is not authenticated and initialized.
     */
    if (!(connection.sync.auth.complete && connection.sync.init.complete)) {
      this.log.error('Sync connection not authenticated and initialized, rejecting update');
      failedUpdate = true;
    }

    /**
     * Validate object data JSON.
     */
    let data;

    if (!failedUpdate) {
      try {
        data = JSON.parse(msg.data);
      } catch (err) {
        this.log.error('Cannot parse incoming sync update data as JSON: %o', { error: err.stack });
        failedUpdate = true;
      }
    }

    /**
     * Apply update.
     */
    if (!failedUpdate) {
      switch (msg.type) {
        case 'user':
          {
            let user: Entity;

            if (this.storage.users.list.has(msg.id)) {
              user = this.storage.users.list.get(msg.id);
            } else {
              user = new Entity().attach(new Id(<any>msg.id), new LifetimeStats());
              this.storage.users.list.set(msg.id, user);

              if (!msg.complete) {
                this.log.warn(
                  'Received incomplete sync update for object %s:%s but it did not already exist',
                  msg.type,
                  msg.id
                );
              }
            }

            if (msg.complete) {
              user.lifetimestats.earnings = data.earnings || 0;
              user.lifetimestats.totalkills = data.totalkills || 0;
              user.lifetimestats.totaldeaths = data.totaldeaths || 0;
            } else {
              user.lifetimestats.earnings += data.earnings;
              user.lifetimestats.totalkills += data.totalkills;
              user.lifetimestats.totaldeaths += data.totaldeaths;
            }

            const playerId = this.storage.users.online.get(msg.id);

            if (playerId) {
              this.emit(RESPONSE_SCORE_UPDATE, playerId, true);
            }
          }

          break;
        default:
          this.log.error('Received incoming sync update for unsupported object type: %o', msg.type);
          failedUpdate = true;
          break;
      }
    }

    /**
     * If update failed, report this to sync service.
     */
    if (failedUpdate) {
      this.sendErrorCustom(sync.connectionId, SERVER_ERRORS.SYNC_UPDATE_INVALID, msg);
    }
  }

  /**
   * SYNC_ACK packet handler.
   */
  onSyncAck(connectionId: ConnectionId, msg: ClientPackets.SyncAck): void {
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

    this.log.debug('Sync ack received: %o', msg);
    let failedAck = false;

    /**
     * Reject if sync connection is not authenticated and initialized.
     */
    if (!(connection.sync.auth.complete && connection.sync.init.complete)) {
      this.log.error('Sync connection not authenticated and initialized, rejecting ack');
      failedAck = true;
    }

    /**
     * Validate existence of update with this sequence id.
     */
    if (!failedAck) {
      failedAck = !sync.updatesAwaitingAck.has(msg.sequence);
    }

    /**
     * Result codes (after converting to signed int8):
     *    0   update applied successfully
     *   +ve  update not applied due to temporary failure, retry
     *   -ve  update not applied due to permanent failure, discard
     */
    if (!failedAck) {
      const result = (msg.result << 24) >> 24;

      if (result === 0) {
        this.log.debug('Sync update %d applied successfully', msg.sequence);
        sync.updatesAwaitingAck.delete(msg.sequence);
      } else {
        this.log.warn(
          'Sync update %d failed with ack result %d (%s failure)',
          msg.sequence,
          result,
          result < 0 ? 'permanent' : 'transient'
        );

        const update = sync.updatesAwaitingAck.get(msg.sequence);

        if (result > 0) {
          /**
           * Add to update resend list.
           */
          update.meta.lastAckResult = msg.result;
          update.meta.stateChangeTime = Date.now();
          sync.updatesAwaitingResend.set(msg.sequence, update);
        } else {
          /**
           * Log and discard
           */
          this.log.error(
            'Discarding failed sync update %d (result %d): %o',
            msg.sequence,
            result,
            update
          );
        }

        /**
         * Remove from updates awaiting acknowledgement.
         */
        sync.updatesAwaitingAck.delete(msg.sequence);
      }
    }

    /**
     * If processing of acknowledgement message failed, report this to sync service.
     */
    if (failedAck) {
      this.sendErrorCustom(sync.connectionId, SERVER_ERRORS.SYNC_ACK_INVALID, msg);
    }
  }
}
