import { SERVER_BROADCAST_SCORE_BOARD_INTERVAL_SEC } from '@/constants';
import { BROADCAST_SCORE_BOARD, TIMELINE_CLOCK_SECOND } from '@/events';
import { System } from '@/server/system';

export default class ScoreBoardPeriodic extends System {
  protected seconds = 0;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_CLOCK_SECOND]: this.onSecondTick,
    };
  }

  onSecondTick(): void {
    this.seconds += 1;

    if (this.seconds >= SERVER_BROADCAST_SCORE_BOARD_INTERVAL_SEC) {
      this.seconds = 0;
      this.emit(BROADCAST_SCORE_BOARD);
    }
  }
}
