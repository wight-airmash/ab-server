import {
  MIN_SAFE_TICKER_INTERVAL_NS,
  NS_PER_MS,
  NS_PER_SEC,
  SERVER_FRAMES_COUNTER_LIMIT,
} from '../constants';
import { GameLoopCallback, GameServerBootstrapInterface } from '../types';
import GameServerBootstrap from './bootstrap';

/**
 * The game ticker for running game loop.
 */
export default class GameTicker {
  /**
   * When the ticker started to work.
   */
  private startTime: [number, number] | null;

  /**
   * Ticker interval in nanoseconds. 60 frames per second by default.
   */
  private intervalNs: number;

  /**
   * Interval value when setTimeout is possible to use instead of setImmediate.
   */
  private minSafeIntervalNs: number;

  /**
   * Current interval for setTimeout.
   */
  private timeoutIntervalMs: number;

  /**
   * Number of ticker iterations from the start ticking or last reset.
   */
  private counter: number;

  /**
   * The time when the last execution of the loop function was completed.
   */
  private lastTickMs: number;

  /**
   * Reference to the immediate tick running.
   */
  private immediateRef: NodeJS.Immediate | null;

  /**
   * Reference to the timeout tick running.
   */
  private timeoutRef: NodeJS.Timeout | null;

  /**
   * Reference to the app.
   */
  private app: GameServerBootstrap;

  /**
   * Total frames skipped from the start.
   */
  public skippedFrames: number;

  /**
   * Time at the start of loop function call.
   */
  public now: number;

  constructor({ app, interval }) {
    this.app = app;
    this.updateInterval(interval);

    this.immediateRef = null;
    this.startTime = null;
    this.skippedFrames = 0;
    this.lastTickMs = 0;
  }

  updateInterval(interval: number): void {
    this.intervalNs = interval;
    this.minSafeIntervalNs = MIN_SAFE_TICKER_INTERVAL_NS;
    this.timeoutIntervalMs = 1;
    this.startTime = process.hrtime();
    this.counter = 1;
  }

  resetCounter(value = 1): void {
    this.startTime = process.hrtime();
    this.counter = value;
  }

  /**
   * Start endless game ticker.
   *
   * @param loop game loop function
   */
  tick(loop: GameLoopCallback, context?: GameServerBootstrapInterface): void {
    const [s, ns] = process.hrtime(this.startTime);
    const diffTime = s * NS_PER_SEC + ns;

    if (diffTime < this.intervalNs * this.counter) {
      if (this.intervalNs * this.counter - diffTime > this.minSafeIntervalNs) {
        this.timeoutRef = setTimeout((): void => {
          this.tick(loop, context);
        }, this.timeoutIntervalMs);
      } else {
        this.immediateRef = setImmediate((): void => {
          this.tick(loop, context);
        });
      }
    } else {
      this.immediateRef = null;
      this.timeoutRef = null;

      /**
       * Skip frame if since last frame past more than 2×frames time.
       */
      if (diffTime < this.intervalNs * (this.counter + 1)) {
        this.now = Date.now();

        loop.call(
          context,
          this.counter,
          this.skippedFrames + diffTime / (this.intervalNs * this.counter),
          diffTime,
          this.skippedFrames
        );

        this.lastTickMs = Date.now() - this.now;
        this.app.metrics.ticksTimeMs += this.lastTickMs;
        this.skippedFrames = 0;

        if (this.lastTickMs * NS_PER_MS > this.intervalNs) {
          this.app.log.debug('Frame is longer than 16.6ms: %o', {
            counter: this.counter,
            lastTick: this.lastTickMs,
          });
        }

        if (this.counter > SERVER_FRAMES_COUNTER_LIMIT) {
          this.app.log.info('Reset ticker counter & startTime.');
          this.resetCounter(0);
        }
      } else {
        this.app.log.debug('Frame skipped: %o', {
          diffTime,
          interval: this.intervalNs,
          counter: this.counter,
          diff: diffTime - this.intervalNs * (this.counter + 1),
          lastTick: this.lastTickMs,
        });

        this.skippedFrames += 1;
      }

      this.counter += 1;

      this.immediateRef = setImmediate((): void => {
        this.tick(loop, context);
      });
    }
  }

  /**
   * Start game ticker.
   *
   * @param loop function to run every tick
   */
  start(loop: GameLoopCallback, context?: GameServerBootstrapInterface): void {
    this.resetCounter();
    this.tick(loop, context);
  }

  /**
   * Stop game ticker.
   */
  stop(): void {
    if (this.immediateRef) {
      clearImmediate(this.immediateRef);
    }

    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
    }
  }
}
