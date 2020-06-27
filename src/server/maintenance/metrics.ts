import os from 'os';
import { GAME_TYPES } from '@airbattle/protocol';
import {
  BYTES_PER_MB,
  LOGS_LOOP_LATENCY_ALERT_VALUE_MS,
  LOGS_PERFORMANCE_ALERT_DELAY_MS,
  LOGS_SKIPPED_FRAMES_ALERT_DELAY_MS,
  MB_PER_GB,
  SERVER_MAX_PLAYERS_LIMIT,
} from '../../constants';
import {
  BROADCAST_CHAT_SERVER_PUBLIC,
  PLAYERS_CREATED,
  SERVER_FRAMES_SKIPPED,
  TIMELINE_BEFORE_GAME_START,
  TIMELINE_CLOCK_HOUR,
  TIMELINE_CLOCK_MINUTE,
  TIMELINE_CLOCK_SECOND,
  TIMELINE_GAME_MATCH_START,
} from '../../events';
import { median } from '../../support/numbers';
import { System } from '../system';

export default class GameMetrics extends System {
  private seconds = 0;

  private ticks = 0;

  private cpuIdle = 0;

  private cpuTotal = 0;

  private lastAlert = 0;

  private lastSkippedFramesAlert = 0;

  private totalSkippedFrames = 0;

  private lastHourSkippedFrames = 0;

  private lastHourMaxPlayers = 0;

  private lastHourPlayersSamples: number[] = [];

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_CREATED]: this.onPlayerCreated,
      [SERVER_FRAMES_SKIPPED]: this.onFramesSkipped,
      [TIMELINE_BEFORE_GAME_START]: this.onBeforeGameStart,
      [TIMELINE_CLOCK_HOUR]: this.onHour,
      [TIMELINE_CLOCK_MINUTE]: this.onMinute,
      [TIMELINE_CLOCK_SECOND]: this.onSecond,
      [TIMELINE_GAME_MATCH_START]: this.onMatchStart,
    };
  }

  onBeforeGameStart(): void {
    for (let online = 0; online < SERVER_MAX_PLAYERS_LIMIT; online += 1) {
      this.app.metrics.frames.skips[online] = 0;
      this.app.metrics.online[online] = 1;
    }
  }

  onMatchStart(): void {
    this.app.metrics.frames.skippedDuringMatch = 0;
  }

  onFramesSkipped(
    frame: number,
    frameFactor: number,
    timeFromStart: number,
    skippedFrames: number
  ): void {
    const now = Date.now();

    this.app.metrics.frames.skippedAt = now;

    if (this.config.server.typeId !== GAME_TYPES.FFA) {
      this.app.metrics.frames.skippedDuringMatch += skippedFrames;
    }

    this.totalSkippedFrames += skippedFrames;
    this.lastHourSkippedFrames += skippedFrames;
    this.app.metrics.frames.skips[this.storage.playerList.size] += skippedFrames;

    if (this.lastSkippedFramesAlert < now - LOGS_SKIPPED_FRAMES_ALERT_DELAY_MS) {
      this.lastSkippedFramesAlert = now;
    }
  }

  convertPacketsAmount(): void {
    if (this.app.metrics.packets.in >= 1e6) {
      const lm = this.app.metrics.packets.in % 1e6;
      const m = (this.app.metrics.packets.in - lm) / 1e6;

      this.app.metrics.packets.inM += m;
      this.app.metrics.packets.in -= m * 1e6;

      if (this.app.metrics.packets.inM >= 1000) {
        this.app.metrics.packets.inB += 1;
        this.app.metrics.packets.inM -= 1000;
      }
    }

    if (this.app.metrics.packets.out >= 1e6) {
      const lm = this.app.metrics.packets.out % 1e6;
      const m = (this.app.metrics.packets.out - lm) / 1e6;

      this.app.metrics.packets.outM += m;
      this.app.metrics.packets.out -= m * 1e6;

      if (this.app.metrics.packets.outM >= 1000) {
        this.app.metrics.packets.outB += 1;
        this.app.metrics.packets.outM -= 1000;
      }
    }
  }

  convertTransfer(): void {
    if (this.app.metrics.transfer.inB >= BYTES_PER_MB) {
      const lB = this.app.metrics.transfer.inB % BYTES_PER_MB;
      const mb = (this.app.metrics.transfer.inB - lB) / BYTES_PER_MB;

      this.app.metrics.transfer.inMB += mb;
      this.app.metrics.transfer.inB -= mb * BYTES_PER_MB;

      if (this.app.metrics.transfer.inMB >= MB_PER_GB) {
        this.app.metrics.transfer.inGB += 1;
        this.app.metrics.transfer.inMB -= MB_PER_GB;
      }
    }

    if (this.app.metrics.transfer.outB >= BYTES_PER_MB) {
      const lB = this.app.metrics.transfer.outB % BYTES_PER_MB;
      const mb = (this.app.metrics.transfer.outB - lB) / BYTES_PER_MB;

      this.app.metrics.transfer.outMB += mb;
      this.app.metrics.transfer.outB -= mb * BYTES_PER_MB;

      if (this.app.metrics.transfer.outMB >= MB_PER_GB) {
        this.app.metrics.transfer.outGB += 1;
        this.app.metrics.transfer.outMB -= MB_PER_GB;
      }
    }
  }

  onPlayerCreated(): void {
    if (this.storage.playerList.size >= this.app.metrics.players.max) {
      this.app.metrics.players.max = this.storage.playerList.size;
      this.app.metrics.players.updatedAt = this.app.ticker.now;
    }

    if (this.storage.playerList.size > this.lastHourMaxPlayers) {
      this.lastHourMaxPlayers = this.storage.playerList.size;
    }
  }

  onMinute(): void {
    this.lastHourPlayersSamples.push(this.storage.playerList.size);
  }

  onHour(): void {
    this.log.info('Packets stats: %o', this.app.metrics.packets);
    this.log.info('Online players in the last hour: %o', {
      max: this.lastHourMaxPlayers,
      avg: median(this.lastHourPlayersSamples),
    });

    this.lastHourMaxPlayers = this.storage.playerList.size;
    this.lastHourPlayersSamples = [];

    if (this.lastHourSkippedFrames !== 0 && !this.config.logs.samples) {
      this.log.warn('Frames were skipped in the last hour: %d', this.lastHourSkippedFrames);
      this.lastHourSkippedFrames = 0;
    }
  }

  onSecond(seconds: number, ticks: number): void {
    this.seconds += 1;
    this.app.metrics.online[this.storage.playerList.size] += 1;

    /**
     * TODO: move sample stats collecting code into `Metrics`.
     */
    if (this.app.metrics.collect) {
      const now = Date.now();

      this.app.metrics.sample.sf = this.totalSkippedFrames - this.app.metrics.sample.sft;
      this.app.metrics.sample.sft = this.totalSkippedFrames;
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
        this.app.metrics.sample.ll > LOGS_LOOP_LATENCY_ALERT_VALUE_MS &&
        this.lastAlert < now - LOGS_PERFORMANCE_ALERT_DELAY_MS
      ) {
        this.lastAlert = now;

        this.emit(
          BROADCAST_CHAT_SERVER_PUBLIC,
          `Game loop latency looks bad (${this.app.metrics.sample.ll} ms)!`
        );

        this.log.warn('High game loop latency value: %d', this.app.metrics.sample.ll);
      }

      this.app.metrics.lastSample.online = this.app.metrics.sample.online;
      this.app.metrics.lastSample.ram = this.app.metrics.sample.ram;
      this.app.metrics.lastSample.cpu = this.app.metrics.sample.cpu;
      this.app.metrics.lastSample.ll = this.app.metrics.sample.ll;
      this.app.metrics.lastSample.ppsIn = this.app.metrics.sample.ppsIn;
      this.app.metrics.lastSample.ppsOut = this.app.metrics.sample.ppsOut;
      this.app.metrics.lastSample.sf = this.app.metrics.sample.sf;
      this.app.metrics.lastSample.sft = this.app.metrics.sample.sft;
      this.app.metrics.lastSample.tIn = this.app.metrics.sample.tIn;
      this.app.metrics.lastSample.tOut = this.app.metrics.sample.tOut;

      if (this.config.logs.samples) {
        this.log.info('Stats: %o', this.app.metrics.sample);
      }
    } else if (this.seconds >= this.config.metricsInterval) {
      this.convertPacketsAmount();
      this.convertTransfer();

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
      this.app.metrics.sample.tIn = 0;
      this.app.metrics.sample.tOut = 0;

      const cores = os.cpus();

      for (let index = 0; index < cores.length; index += 1) {
        this.cpuIdle += cores[index].times.idle;
        this.cpuTotal += cores[index].times.idle + cores[index].times.user + cores[index].times.sys;
      }
    }
  }
}
