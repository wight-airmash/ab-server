import {
  HOURS_PER_DAY,
  MINUTES_PER_HOUR,
  MS_PER_SEC,
  MS_PER_WEEK,
  SECONDS_PER_MINUTE,
} from '../constants/units';
import { Timestamp, TimeTriggerScheduleItem } from '../types';

/**
 * Event trigger by schedule in time.
 *
 * It has no built-in timer and triggered at the moment of check.
 * The schedule must not contain any intersections (there are no validators!).
 * Permanently turned off (false) if no schedule passed.
 */
export class TimeTrigger {
  /**
   * Sorted event state trigger timestamps.
   * [start, end, start, end...]
   */
  private timeline: Timestamp[] = [];

  private timelineIndex = 0;

  private isActive = false;

  constructor(template: TimeTriggerScheduleItem[] = []) {
    if (template.length === 0) {
      this.timeline.push(0);

      return;
    }

    const date = new Date();
    const now = date.getTime();
    const hours = date.getDay() * HOURS_PER_DAY + date.getHours();
    const minutes = hours * MINUTES_PER_HOUR + date.getMinutes();
    const seconds = minutes * SECONDS_PER_MINUTE + date.getSeconds();
    const weekStart = now - date.getMilliseconds() - seconds * MS_PER_SEC;

    template.forEach(r => {
      const start = (((r.weekDay * 24 + r.hour) * 60 + r.minute) * 60 + r.second) * MS_PER_SEC;
      const end = start + r.duration * MS_PER_SEC;

      this.timeline.push(weekStart + start, weekStart + end);

      if (weekStart + start <= now && now <= weekStart + end) {
        this.isActive = true;
      }
    });

    this.timeline.sort((a, b) => a - b);

    while (this.timeline[this.timelineIndex] < now) {
      this.update();
    }
  }

  public get next(): Timestamp {
    return this.timeline[this.timelineIndex];
  }

  state(now: Timestamp): boolean {
    while (this.next !== 0 && now >= this.next) {
      this.update();
      this.isActive = !this.isActive;
    }

    return this.isActive;
  }

  private update(): void {
    this.timelineIndex += 1;

    if (this.timelineIndex >= this.timeline.length) {
      for (let index = 0; index < this.timeline.length; index += 1) {
        this.timeline[index] += MS_PER_WEEK;
      }

      this.timelineIndex = 0;
    }
  }
}
