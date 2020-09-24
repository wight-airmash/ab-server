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
import { stringifyUserStats, stringifySyncState, FILE_FORMAT } from './user-stats-serialize';

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

  save(type: FILE_FORMAT, data): void {
    let resultStatus = true;

    if (!this.saveInProgress) {
      this.saveInProgress = true;

      let stringify;
      let path: string;

      switch (type) {
        case FILE_FORMAT.USER_STATS:
          stringify = stringifyUserStats;
          path = this.config.accounts.userStats.path;
          break;
        case FILE_FORMAT.SYNC_STATE:
          stringify = stringifySyncState;
          path = this.config.sync.state.path;
          break;
        default:
          Log.error('Unknown format for stringify: %o', type);
          this.saveInProgress = false;
          resultStatus = false;
      }

      let json: string;

      if (resultStatus) {
        try {
          json = stringify(data);
        } catch (err) {
          Log.error('Error while serialising %s: %o', type, { error: err.stack });
          this.saveInProgress = false;
          resultStatus = false;
        }
      }

      if (resultStatus) {
        writeFile(path, json, err => {
          if (err) {
            Log.error('Error while saving %s: %o', type, { error: err.stack });
            resultStatus = false;
          }

          this.saveInProgress = false;

          Hub.emitToMain(USERS_WORKER_SAVE_STATS_RESPONSE, resultStatus);
        });
      } else {
        Hub.emitToMain(USERS_WORKER_SAVE_STATS_RESPONSE, false);
      }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const worker = new UserAccountsWorker();
