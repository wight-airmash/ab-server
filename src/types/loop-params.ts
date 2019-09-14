export interface LoopParams {
  /**
   * current frame
   */
  frame: number;

  /**
   * frames per tick
   */
  frameFactor: number;

  /**
   * ns since previous tick
   */
  timeFromStart: number;

  /**
   * number of skipped frames since previous tick
   */
  skippedFrames: number;
}
