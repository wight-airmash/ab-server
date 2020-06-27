import { SERVER_BROADCAST_SCORE_BOARD_INTERVAL_TICKS } from '../../constants';
import { BROADCAST_SCORE_BOARD, TIMELINE_LOOP_TICK } from '../../events';
import { SCOREBOARD_FORCE_UPDATE } from '../../events/scoreboard';
import { System } from '../system';

export default class ScoreBoardPeriodic extends System {
  protected ticks = 0;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_LOOP_TICK]: this.onTick,
      [SCOREBOARD_FORCE_UPDATE]: this.onForceUpdate,
    };
  }

  onForceUpdate(): void {
    this.ticks = 0;
    this.emit(BROADCAST_SCORE_BOARD);
  }

  onTick(): void {
    this.ticks += 1;

    if (this.ticks >= SERVER_BROADCAST_SCORE_BOARD_INTERVAL_TICKS) {
      this.ticks = 0;
      this.emit(BROADCAST_SCORE_BOARD);
    }
  }
}
