import os from 'os';
import {
  LOGS_LOOP_LATENCY_ALERT_VALUE_MS,
  LOGS_PERFORMANCE_ALERT_DELAY_MS,
  LOGS_SKIPPED_FRAMES_ALERT_DELAY_MS,
} from '@/constants';
import {
  BROADCAST_CHAT_SERVER_PUBLIC,
  SERVER_FRAMES_SKIPPED,
  TIMELINE_CLOCK_SECOND,
} from '@/events';
import { System } from '@/server/system';

export default class GameMetrics extends System {
  private seconds = 0;

  private ticks = 0;

  private cpuIdle = 0;

  private cpuTotal = 0;

  private lastAlert = 0;

  private lastSkippedFramesAlert = 0;

  private skippedFrames = 0;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_CLOCK_SECOND]: this.onSecond,
      [SERVER_FRAMES_SKIPPED]: this.onFramesSkipped,
    };
  }

  onFramesSkipped(
    frame: number,
    frameFactor: number,
    timeFromStart: number,
    skippedFrames: number
  ): void {
    const now = Date.now();

    this.skippedFrames += skippedFrames;

    this.log.warn(`Frames (${skippedFrames}) was skipped.`);

    if (this.lastSkippedFramesAlert < now - LOGS_SKIPPED_FRAMES_ALERT_DELAY_MS) {
      this.lastSkippedFramesAlert = now;

      // this.emit(BROADCAST_CHAT_SERVER_PUBLIC, `Warning: frames (${skippedFrames}) were skipped.`);

      // this.log.debug('Frames skipped chat alert.');
    }
  }

  onSecond(seconds: number, ticks: number): void {
    this.seconds += 1;

    /**
     * TODO: move sample stats collecting code into `Metrics`.
     */
    if (this.app.metrics.collect === true) {
      const now = Date.now();

      this.app.metrics.sample.sf = this.skippedFrames;
      this.app.metrics.sample.ll =
        ~~((this.app.metrics.ticksTimeMs / (ticks - this.ticks)) * 100) / 100;

      const cores = os.cpus();

      for (let index = 0; index < cores.length; index += 1) {
        this.cpuIdle -= cores[index].times.idle;
        this.cpuTotal -= cores[index].times.idle + cores[index].times.user + cores[index].times.sys;
      }

      this.app.metrics.sample.cpu = 100 - ~~((this.cpuIdle * 100) / this.cpuTotal);

      this.app.metrics.collect = false;
      this.seconds = 0;

      if (
        this.app.metrics.sample.ll >= LOGS_LOOP_LATENCY_ALERT_VALUE_MS &&
        this.lastAlert < now - LOGS_PERFORMANCE_ALERT_DELAY_MS
      ) {
        this.lastAlert = now;

        this.emit(
          BROADCAST_CHAT_SERVER_PUBLIC,
          `Game loop latency looks bad (${this.app.metrics.sample.ll} ms). Fasten your seat belts!`
        );

        this.log.debug('Game loop latency chat alert.');
        this.log.warn('High game loop latency value.', this.app.metrics.sample.ll);
      }

      this.app.metrics.lastSample.online = this.app.metrics.sample.online;
      this.app.metrics.lastSample.ram = this.app.metrics.sample.ram;
      this.app.metrics.lastSample.cpu = this.app.metrics.sample.cpu;
      this.app.metrics.lastSample.ll = this.app.metrics.sample.ll;
      this.app.metrics.lastSample.ppsIn = this.app.metrics.sample.ppsIn;
      this.app.metrics.lastSample.ppsOut = this.app.metrics.sample.ppsOut;
      this.app.metrics.lastSample.sf = this.app.metrics.sample.sf;

      if (this.app.config.logs.samples === true) {
        this.log.info('Stats:', this.app.metrics.sample);
      }
    } else if (this.seconds >= this.app.config.metricsInterval) {
      this.ticks = ticks;
      this.app.metrics.ticksTimeMs = 0;
      this.cpuIdle = 0;
      this.cpuTotal = 0;
      this.app.metrics.collect = true;

      this.app.metrics.sample.online = this.storage.playerList.size;
      this.app.metrics.sample.ram = Math.ceil(
        Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100
      );
      this.app.metrics.sample.ll = 0;
      this.app.metrics.sample.ppsIn = 0;
      this.app.metrics.sample.ppsOut = 0;

      const cores = os.cpus();

      for (let index = 0; index < cores.length; index += 1) {
        this.cpuIdle += cores[index].times.idle;
        this.cpuTotal += cores[index].times.idle + cores[index].times.user + cores[index].times.sys;
      }
    }
  }
}
