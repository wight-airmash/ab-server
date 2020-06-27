import { NS_PER_MS } from '../../constants';
import {
  TIMELINE_CLOCK_DAY,
  TIMELINE_CLOCK_HALFSECOND,
  TIMELINE_CLOCK_HOUR,
  TIMELINE_CLOCK_MINUTE,
  TIMELINE_CLOCK_SECOND,
  TIMELINE_LOOP_TICK,
} from '../../events';
import { System } from '../system';

export default class GameClock extends System {
  private days = 0;

  private hours = 0;

  private minutes = 0;

  private seconds = 0;

  private milliseconds = 0;

  private lastTickTime = 0;

  private emitHalfsecondEvent = true;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_CLOCK_MINUTE]: this.updateHumanUptime,
      [TIMELINE_LOOP_TICK]: this.onTick,
    };
  }

  onTick(frame: number, frameFactor: number, timeFromStart: number): void {
    let diffTime = 0;

    if (timeFromStart < this.lastTickTime) {
      // There was ticker counter reset.
      this.helpers.resetClock();
      diffTime = timeFromStart;
    } else {
      diffTime = timeFromStart - this.lastTickTime;
    }

    this.lastTickTime = timeFromStart;

    const ms = ~~((diffTime / NS_PER_MS) * 1000) / 1000;

    this.milliseconds += ms;

    if (this.milliseconds >= 500) {
      if (this.emitHalfsecondEvent) {
        this.emit(TIMELINE_CLOCK_HALFSECOND, this.milliseconds / 500, frame);
        this.emitHalfsecondEvent = false;
      }

      if (this.milliseconds >= 1000) {
        this.seconds += 1;
        this.app.metrics.uptime.seconds += 1;
        this.milliseconds -= 1000;

        if (this.seconds >= 60) {
          this.minutes += 1;
          this.seconds -= 60;

          if (this.minutes >= 60) {
            this.hours += 1;
            this.minutes -= 60;

            if (this.hours >= 24) {
              this.days += 1;
              this.hours -= 24;

              this.emit(TIMELINE_CLOCK_DAY, this.days, frame);
            }

            this.emit(TIMELINE_CLOCK_HOUR, this.hours, frame);
          }

          this.emit(TIMELINE_CLOCK_MINUTE, this.minutes, frame);
        }

        this.emit(TIMELINE_CLOCK_SECOND, this.seconds, frame);
        this.emit(TIMELINE_CLOCK_HALFSECOND, this.milliseconds, frame);
        this.emitHalfsecondEvent = true;
      }
    }
  }

  updateHumanUptime(): void {
    this.app.metrics.uptime.human = `${this.days}d ${this.hours}h ${this.minutes}m`;
  }
}
