import { MIN_SAFE_TICKER_INTERVAL_NS, NS_PER_MS, NS_PER_SEC, SERVER_FPS } from '@/constants';
import GameServer from '@/core/server';
import { LoopParams } from '@/types/loop-params';

/**
 * The game ticker for running game loop.
 */
export default class GameTicker {
  /**
   * When the ticker started to work.
   */
  protected startTime: [number, number] | null;

  /**
   * Ticker interval in nanoseconds. 60 frames per second by default.
   */
  protected intervalNs: number;

  /**
   * Interval value when setTimeout is possible to use instead of setImmediate.
   */
  protected minSafeIntervalNs: number;

  /**
   * Current interval for setTimeout.
   */
  protected timeOutIntervalMs: number;

  /**
   * Number of ticker iterations from the start ticking or last reset.
   */
  protected counter: number;

  /**
   * The time when the last execution of the loop function was completed.
   */
  protected lastTickMs: number;

  /**
   * Max value of the counter before reset.
   * In theory it's Number.MAX_SAFE_INTEGER.
   */
  protected counterLimit: number;

  /**
   * Reference to the immediate tick running.
   */
  protected immediateRef: NodeJS.Immediate | null;

  /**
   * Reference to the timeout tick running.
   */
  protected timeoutRef: NodeJS.Timeout | null;

  /**
   * Reference to the app.
   */
  protected app: GameServer;

  /**
   * Total frames skipped from the start.
   */
  public skippedFrames: number;

  constructor({ app, interval }) {
    this.app = app;
    this.updateInterval(interval);

    // 60 frames * 60 seconds * 60 minutes * 24 hours * 100 days.
    this.counterLimit = SERVER_FPS * 60 * 60 * 24 * 100;
    this.immediateRef = null;
    this.startTime = null;
    this.skippedFrames = 0;
    this.lastTickMs = 0;
  }

  updateInterval(interval: number): void {
    this.intervalNs = interval;
    this.minSafeIntervalNs = MIN_SAFE_TICKER_INTERVAL_NS;
    this.timeOutIntervalMs = 1;
    this.startTime = process.hrtime();
    this.counter = 1;
  }

  /**
   * Start endless game ticker.
   *
   * @param loop game loop function
   */
  tick(loop: (x: LoopParams) => void): void {
    if (this.startTime === null) {
      this.startTime = process.hrtime();
    }

    if (this.counter > this.counterLimit) {
      this.app.log.info('Reset ticker counter & startTime.');
      this.startTime = process.hrtime();
      this.counter = 1;
    }

    const [s, ns] = process.hrtime(this.startTime);
    const diffTime = s * NS_PER_SEC + ns;

    if (diffTime < this.intervalNs * this.counter) {
      if (this.intervalNs * this.counter - diffTime > this.minSafeIntervalNs) {
        this.timeoutRef = setTimeout((): void => {
          this.tick(loop);
        }, this.timeOutIntervalMs);
      } else {
        this.immediateRef = setImmediate((): void => {
          this.tick(loop);
        });
      }
    } else {
      this.immediateRef = null;
      this.timeoutRef = null;

      /**
       * Skip frame if since last frame past more than 2×frames time.
       */
      if (diffTime < this.intervalNs * (this.counter + 1)) {
        const startTimeMs = Date.now();

        loop({
          frame: this.counter,
          frameFactor: this.skippedFrames + diffTime / (this.intervalNs * this.counter),
          timeFromStart: diffTime,
          skippedFrames: this.skippedFrames,
        });

        this.lastTickMs = Date.now() - startTimeMs;
        this.app.metrics.ticksTimeMs += this.lastTickMs;
        this.skippedFrames = 0;

        if (this.lastTickMs * NS_PER_MS > this.intervalNs) {
          this.app.log.warn('Frame is longer than 16.6ms.', {
            counter: this.counter,
            lastTick: this.lastTickMs,
          });
        }
      } else {
        this.app.log.warn('Frame skipped.', {
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
        this.tick(loop);
      });
    }
  }

  /**
   * Start game ticker.
   *
   * @param loop function to run every tick
   */
  start(loop: (x: LoopParams) => void): void {
    this.tick(loop);
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

    this.startTime = null;
    this.counter = 1;
  }
}
