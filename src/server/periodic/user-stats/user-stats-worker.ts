import { writeFile } from 'fs';
import { workerData } from 'worker_threads';
import { GameServerConfigInterface } from '../../../config';
import {
  USERS_WORKER_SAVE_STATS,
  USERS_WORKER_SAVE_STATS_RESPONSE,
  USERS_WORKER_STOP,
} from '../../../events';
import { hub, Hub } from '../../../workers/events-hub';
import Log from '../../../workers/logger';
import {
  stringifyUserStats,
  stringifySyncState,
  GAME_DATA_FILE_FORMAT,
} from './user-stats-serialize';

class UserAccountsWorker {
  private config: GameServerConfigInterface;

  private saveInProgress = false;

  constructor() {
    this.config = workerData.config;

    /**
     * Event handlers.
     */
    hub.events.on(USERS_WORKER_SAVE_STATS, this.save, this);

    hub.events.on(USERS_WORKER_STOP, () => {
      process.exit();
    });
  }

  save(type: GAME_DATA_FILE_FORMAT, data): void {
    let resultStatus = true;

    if (!this.saveInProgress) {
      this.saveInProgress = true;

      let json: string;

      try {
        switch (type) {
          case GAME_DATA_FILE_FORMAT.USER_STATS:
            json = stringifyUserStats({ type, data });
            break;
          case GAME_DATA_FILE_FORMAT.SYNC_STATE:
            json = stringifySyncState({ type, data });
            break;
          default:
            Log.error('Unknown format for stringify: %o', type);
            this.saveInProgress = false;
            resultStatus = false;
        }
      } catch (err) {
        Log.error('Error while serialising user stats: %o', { error: err.stack });
        this.saveInProgress = false;
        resultStatus = false;
      }

      if (resultStatus) {
        writeFile(this.config.accounts.userStats.path, json, err => {
          if (err) {
            Log.error('Error while saving user stats: %o', { error: err.stack });
            resultStatus = false;
          }

          this.saveInProgress = false;
        });
      }

      Hub.emitToMain(USERS_WORKER_SAVE_STATS_RESPONSE, resultStatus);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const worker = new UserAccountsWorker();
