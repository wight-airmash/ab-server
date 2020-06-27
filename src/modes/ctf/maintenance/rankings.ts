import { CTF_TEAM_CAPTURED_FLAG, PLAYERS_RANKINGS_UPDATE } from '../../../events';
import { System } from '../../../server/system';

export default class GameRankings extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CTF_TEAM_CAPTURED_FLAG]: this.onTeamCapture,
    };
  }

  onTeamCapture(): void {
    this.emit(PLAYERS_RANKINGS_UPDATE);
  }
}
