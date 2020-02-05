import { CTF_TEAM_CAPTURED_FLAG } from '@/events';
import { System } from '@/server/system';

export default class GameRankings extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CTF_TEAM_CAPTURED_FLAG]: this.onTeamCapture,
    };
  }

  onTeamCapture(): void {
    this.storage.playerRankings.outdated = true;
  }
}
