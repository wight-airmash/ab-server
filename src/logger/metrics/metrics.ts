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
  sft: number;

  /**
   * Skipped frames since last performance measurement.
   */
  sf: number;

  /**
   * Transfer, bytes.
   */
  tIn: number;
  tOut: number;
}

interface Uptime {
  human: string;
  seconds: number;
}

type FramesSkipped = number;
type SkipsHistory = FramesSkipped[];

interface Frames {
  /**
   * Last skipped frame time, ms.
   */
  skippedAt: number;
  skippedDuringMatch: number;
  skips: SkipsHistory;
}

type Duration = number;

interface Online {
  [playersOnline: number]: Duration;
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

  public frames: Frames = {
    /**
     * Last skipped frame time, ms.
     */
    skippedAt: 0,

    skippedDuringMatch: 0,

    /**
     * Skips per players online.
     */
    skips: [],
  };

  public online: Online = [];

  /**
   * Packets amount.
   */
  public packets = {
    // Converted into million from time to time.
    in: 0,
    out: 0,

    /**
     * Million.
     */
    inM: 0,
    /**
     * Million.
     */
    outM: 0,

    /**
     * Billion.
     */
    inB: 0,
    /**
     * Billion.
     */
    outB: 0,
  };

  public players = {
    max: 0,
    updatedAt: 0,
  };

  public transfer = {
    /**
     * Bytes.
     */
    inB: 0,
    /**
     * Bytes.
     */
    outB: 0,

    inMB: 0,
    outMB: 0,

    inGB: 0,
    outGB: 0,
  };

  /**
   * Packets amount, that was received, but dropped because of player lags.
   */
  public lagPackets = 0;

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
      sft: 0,
      sf: 0,
      tIn: 0,
      tOut: 0,
    };

    this.sample = {
      ll: 0,
      ppsIn: 0,
      ppsOut: 0,
      cpu: 0,
      ram: 0,
      online: 0,
      sft: 0,
      sf: 0,
      tIn: 0,
      tOut: 0,
    };

    this.uptime = {
      human: '0d 0h 0m',
      seconds: 0,
    };
  }
}

const metrics = new Metrics();

export default metrics;
