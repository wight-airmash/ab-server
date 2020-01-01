import { existsSync, readFileSync, writeFile } from 'fs';
import { USER_STATS_SAVE_INTERVAL_SEC } from '@/constants';
import { TIMELINE_BEFORE_GAME_START, TIMELINE_CLOCK_SECOND } from '@/events';
import { System } from '@/server/system';

export default class UserStatsPeriodic extends System {
  protected seconds = 0;

  protected saveInProgress = false;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_BEFORE_GAME_START]: this.onBeforeGameStart,
      [TIMELINE_CLOCK_SECOND]: this.onSecondTick,
    };
  }

  onBeforeGameStart(): void {
    if (existsSync(this.app.config.userStats.path) === true) {
      this.load();
    } else {
      this.save();
    }
  }

  onSecondTick(): void {
    this.seconds += 1;

    if (this.seconds >= USER_STATS_SAVE_INTERVAL_SEC) {
      this.save();
      this.seconds = 0;
    }
  }

  load(): void {
    try {
      const data = readFileSync(this.app.config.userStats.path);

      this.storage.userList = new Map(JSON.parse(data.toString()));
    } catch (e) {
      this.log.error(`Error while loading user stats: ${e.stack}`);
    }
  }

  save(): void {
    if (this.saveInProgress === false) {
      let data: string;

      this.saveInProgress = true;

      try {
        data = JSON.stringify([...this.storage.userList.entries()], (key, value) => {
          if (key === 'destroyed' || key === 'key') {
            return undefined;
          }

          return value;
        });
      } catch (e) {
        this.log.error(`Error while serialising user stats: ${e.stack}`);
        this.saveInProgress = false;

        return;
      }

      writeFile(this.app.config.userStats.path, data, e => {
        if (e) {
          this.log.error(`Error while saving user stats: ${e.stack}`);
        }

        this.saveInProgress = false;
      });
    }
  }
}
