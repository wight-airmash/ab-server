import { writeFile } from 'fs';
import { workerData } from 'worker_threads';
import { GameServerConfigInterface } from '../../../config';
import {
  USERS_WORKER_SAVE_STATS,
  USERS_WORKER_SAVE_STATS_RESPONSE,
  USERS_WORKER_STOP,
} from '../../../events';
import { User, UserId } from '../../../types';
import { hub, Hub } from '../../../workers/events-hub';
import Log from '../../../workers/logger';
import { stringifyUserStats } from './user-stats-serialize';

class UserAccountsWorker {
  private config: GameServerConfigInterface;

  private saveInProgress = false;

  constructor() {
    this.config = workerData.config;

    /**
     * Event handlers.
     */
    hub.events.on(USERS_WORKER_SAVE_STATS, this.stringify, this);

    hub.events.on(USERS_WORKER_STOP, () => {
      process.exit();
    });
  }

  stringify(users: Map<UserId, User>): void {
    let resultStatus = true;

    if (!this.saveInProgress) {
      this.saveInProgress = true;

      let data: string;

      try {
        data = stringifyUserStats([...users.entries()]);
      } catch (err) {
        Log.error('Error while serialising user stats: %o', { error: err.stack });
        this.saveInProgress = false;
        resultStatus = false;
      }

      if (resultStatus) {
        writeFile(this.config.accounts.userStats.path, data, err => {
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
