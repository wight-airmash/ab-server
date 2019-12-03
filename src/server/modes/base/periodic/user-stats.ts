import fs from 'fs';
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
    this.load();
  }

  onSecondTick(): void {
    this.seconds += 1;

    if (this.seconds >= USER_STATS_SAVE_INTERVAL_SEC) {
      this.save();
    }
  }

  load(): void {
    try {
      const data = fs.readFileSync(this.app.config.userStats.path);

      this.storage.userList = new Map(JSON.parse(data.toString()));
    } catch (e) {
      this.log.error(`Error while loading user stats: ${e}`);
    }
  }

  save(): void {
    let data: string;

    this.saveInProgress = true;

    try {
      data = JSON.stringify(Array.from(this.storage.userList.entries()));
    } catch (e) {
      this.log.error(`Error while serialising user stats: ${e}`);
      this.saveInProgress = false;

      return;
    }

    fs.writeFile(this.app.config.userStats.path, data, e => {
      if (e) {
        this.log.error(`Error while saving user stats: ${e}`);
      }

      this.saveInProgress = false;
    });
  }
}
