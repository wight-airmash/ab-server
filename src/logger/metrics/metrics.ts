interface PerformanceSample {
  /**
   * Average game loop latency per second of performance measure. In ms/1s.
   *
   */
  ll: number;

  /**
   * RAM used by server instance. In MB.
   */
  ram: number;

  /**
   * Overall CPU load. In %.
   * Among all server OS apps, not only this game server instance.
   */
  cpu: number;

  /**
   * Incoming packets per second of performance measure.
   */
  ppsIn: number;

  /**
   * Outgoing packets per second of performance measure.
   */
  ppsOut: number;

  /**
   * Players online.
   */
  online: number;

  /**
   * Total frames skipped since the server started.
   */
  sf: number;
}

interface Uptime {
  human: string;
  seconds: number;
}

export class Metrics {
  /**
   * Is performance metrics collecting right now.
   */
  public collect: boolean;

  /**
   * The sum of ticks time during collecting active.
   */
  public ticksTimeMs: number;

  /**
   * Finished performance sample.
   */
  public lastSample: PerformanceSample;

  /**
   * Used to measure current performance.
   * After the end of the measurement, the values are copied into the `lastSample`.
   */
  public sample: PerformanceSample;

  /**
   * Server uptime.
   */
  public uptime: Uptime;

  constructor() {
    this.ticksTimeMs = 0;
    this.collect = false;
    this.lastSample = {
      ll: 0,
      ppsIn: 0,
      ppsOut: 0,
      cpu: 0,
      ram: 0,
      online: 0,
      sf: 0,
    };

    this.sample = {
      ll: 0,
      ppsIn: 0,
      ppsOut: 0,
      cpu: 0,
      ram: 0,
      online: 0,
      sf: 0,
    };

    this.uptime = {
      human: '0d 0h 0m',
      seconds: 0,
    };
  }
}

const metrics = new Metrics();

export default metrics;
