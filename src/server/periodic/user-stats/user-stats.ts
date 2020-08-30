import { existsSync, readFileSync, renameSync } from 'fs';
import { Worker } from 'worker_threads';
import { USER_STATS_SAVE_INTERVAL_SEC } from '../../../constants';
import {
  TIMELINE_BEFORE_GAME_START,
  TIMELINE_CLOCK_SECOND,
  USERS_WORKER_SAVE_STATS,
  USERS_WORKER_SAVE_STATS_RESPONSE,
} from '../../../events';
import { System } from '../../system';
import { SyncDataUpdate } from '../../../types';
import { GAME_DATA_FILE_FORMAT } from './user-stats-serialize';

export default class UserStatsPeriodic extends System {
  private worker: Worker;

  private seconds = 0;

  private saveInProgress = false;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_BEFORE_GAME_START]: this.onBeforeGameStart,
      [TIMELINE_CLOCK_SECOND]: this.onSecondTick,
      [USERS_WORKER_SAVE_STATS_RESPONSE]: this.updateSavingStatus,
    };
  }

  onBeforeGameStart(): void {
    this.runWorker();

    if (existsSync(this.config.accounts.userStats.path)) {
      this.load();
    } else {
      this.save();
    }
  }

  onSecondTick(): void {
    this.seconds += 1;

    if (this.seconds >= USER_STATS_SAVE_INTERVAL_SEC) {
      const hasChanges = this.config.accounts.userStats.synchronize
        ? this.storage.sync.hasChanges
        : this.storage.users.hasChanges;

      if (hasChanges && !this.saveInProgress) {
        this.save();
      }

      this.seconds = 0;
    }
  }

  renameFileOnError(reason: string): void {
    /**
     * This is to avoid data loss in the next save, when we have a file format we can't process.
     */
    const renamePath = `${this.config.accounts.userStats.path}.${reason}-${Date.now()}`;

    this.log.info(
      'Renaming user stats file "%s" to "%s"',
      this.config.accounts.userStats.path,
      renamePath
    );
    renameSync(this.config.accounts.userStats.path, renamePath);
  }

  load(): void {
    const { sync, users } = this.storage;

    try {
      const json = readFileSync(this.config.accounts.userStats.path);
      const loadedData = JSON.parse(json.toString());

      let loadedDataFormat = GAME_DATA_FILE_FORMAT.UNKNOWN;
      let loadedUserStats: any[] = null;
      let save = false;

      if (Array.isArray(loadedData)) {
        /**
         * Old format: storage.users.list serialized as an array of key-value tuples.
         */
        loadedDataFormat = GAME_DATA_FILE_FORMAT.USER_STATS;
        loadedUserStats = loadedData;
        save = true;
      } else {
        /**
         * New format: object with type and data fields.
         */
        loadedDataFormat = loadedData.type;

        if (loadedDataFormat === GAME_DATA_FILE_FORMAT.USER_STATS) {
          loadedUserStats = loadedData.data;
        }
      }

      switch (loadedDataFormat) {
        case GAME_DATA_FILE_FORMAT.USER_STATS:
          if (this.config.accounts.userStats.synchronize) {
            /**
             * Configured to synchronize but this is a user stats file, so migrate the data to sync storage.
             *
             * Then the user stats will be uploaded to the sync service at the next available opportunity.
             */
            this.log.info('Migrating user stats for synchronization');

            const now = Date.now();

            loadedUserStats.forEach(user => {
              const id = user[0];
              const data = user[1].lifetimestats;

              const update: SyncDataUpdate = {
                meta: {
                  stateChangeTime: now,
                  lastAckResult: null,
                  sendCount: 0,
                },
                type: 'user',
                id,
                data: JSON.stringify(data),
                timestamp: now,
                event: JSON.stringify(['user-stats-migration']),
              };

              sync.updatesAwaitingSequenceId.push(update);
              save = true;
            });

            this.log.info('Successfully migrated %d users', sync.updatesAwaitingSequenceId.length);
          }

          /**
           * Load the user stats file to users storage.
           */
          this.log.info('Loading user stats: %d users', loadedUserStats.length);
          users.list = new Map(loadedUserStats);

          break;
        case GAME_DATA_FILE_FORMAT.SYNC_STATE:
          if (this.config.accounts.userStats.synchronize) {
            const loadedSyncState = loadedData.data;

            /**
             * Configured to synchronize and read a sync state file as expected, so load it in to sync storage.
             */
            this.log.info(
              'Loading sync state: next sequence id %d, updates %d/%d/%d/%d',
              loadedSyncState.nextSequenceId,
              loadedSyncState.updatesAwaitingSequenceId.length,
              loadedSyncState.updatesAwaitingSend.length,
              loadedSyncState.updatesAwaitingAck.length,
              loadedSyncState.updatesAwaitingResend.length
            );

            sync.nextSequenceId = loadedSyncState.nextSequenceId;
            sync.thisServerId = loadedSyncState.thisServerId;
            sync.thisServerEndpoint = loadedSyncState.thisServerEndpoint;
            sync.updatesAwaitingSequenceId = loadedSyncState.updatesAwaitingSequenceId;
            sync.updatesAwaitingSend = new Map(loadedSyncState.updatesAwaitingSend);
            sync.updatesAwaitingAck = new Map(loadedSyncState.updatesAwaitingAck);
            sync.updatesAwaitingResend = new Map(loadedSyncState.updatesAwaitingResend);
          } else {
            /**
             * Not configured to synchronize and unexpectedly read a sync state file.
             *
             * Load nothing, but rename the file to avoid data loss on the next save.
             */
            this.log.error(
              'This is a standalone game server, but user stats file contains sync state'
            );
            this.renameFileOnError('unexpected-sync-state');
          }

          break;
        default:
          /**
           * File format is unknown or invalid.
           */
          this.log.error('Unknown data format for user stats file');
          this.renameFileOnError('unknown-data-format');
          break;
      }

      /**
       * Save if the file format has changed.
       */
      if (save) {
        this.save();
      }
    } catch (err) {
      this.log.error('Error while loading user stats: %o', { error: err.stack });
      this.renameFileOnError('error-while-loading');
    }
  }

  /**
   * Initiate data saving task.
   */
  save(): void {
    const { sync, users } = this.storage;
    let args: [GAME_DATA_FILE_FORMAT, any];

    this.saveInProgress = true;

    if (this.config.accounts.userStats.synchronize) {
      /**
       * Save sync state.
       */
      args = [
        GAME_DATA_FILE_FORMAT.SYNC_STATE,
        {
          nextSequenceId: sync.nextSequenceId,
          thisServerId: sync.thisServerId,
          thisServerEndpoint: sync.thisServerEndpoint,
          updatesAwaitingSequenceId: sync.updatesAwaitingSequenceId,
          updatesAwaitingSend: [...sync.updatesAwaitingSend.entries()],
          updatesAwaitingAck: [...sync.updatesAwaitingAck.entries()],
          updatesAwaitingResend: [...sync.updatesAwaitingResend.entries()],
        },
      ];
      sync.hasChanges = false;
    } else {
      /**
       * Save user stats.
       */
      args = [GAME_DATA_FILE_FORMAT.USER_STATS, [...users.list.entries()]];
      users.hasChanges = false;
    }

    this.worker.postMessage({ event: USERS_WORKER_SAVE_STATS, args });
  }

  updateSavingStatus(saved: boolean): void {
    this.saveInProgress = !saved;
  }

  private runWorker(): void {
    this.worker = new Worker('./dist/server/periodic/user-stats/user-stats-worker.js', {
      workerData: {
        config: this.config,
      },
    });

    this.worker.on('exit', exitCode => {
      if (exitCode !== 0) {
        this.log.fatal('Accounts worker is down: %o', { exitCode });
        process.exit(exitCode);
      }
    });

    /**
     * Re-emit events from the worker.
     */
    this.worker.on('message', msg => {
      try {
        this.events.emit(msg.event, ...msg.args);
      } catch (err) {
        this.log.error('Error re-emitting event from the accounts worker: %o', {
          event: msg.event,
        });
      }
    });

    this.worker.on('online', () => {
      this.log.debug('Accounts worker started.');
    });

    this.worker.on('error', () => {
      this.log.error('Error starting accounts worker.');
    });
  }
}
