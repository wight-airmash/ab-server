import {
  CTF_TEAM_CAPTURED_FLAG,
  TIMELINE_CLOCK_SECOND,
  TIMELINE_GAME_MATCH_START,
} from '../../../events';
import { System } from '../../../server/system';

export default class GameEndpointAPI extends System {
  private shouldUpdate = false;

  constructor({ app }) {
    super({ app });

    this.storage.gameModeAPIResponse = `"ctf":{"start":${Date.now()},"score":{"blue":0,"red":0}}`;

    this.listeners = {
      [CTF_TEAM_CAPTURED_FLAG]: this.onTeamCaptured,
      [TIMELINE_CLOCK_SECOND]: this.onSecond,
      [TIMELINE_GAME_MATCH_START]: this.updateResponse,
    };
  }

  onTeamCaptured(): void {
    this.shouldUpdate = true;
  }

  onSecond(): void {
    if (this.shouldUpdate) {
      this.shouldUpdate = false;

      this.updateResponse();
    }
  }

  updateResponse(): void {
    this.storage.gameModeAPIResponse = `"ctf":{"start":${this.storage.gameEntity.match.start},"score":{"blue":${this.storage.gameEntity.match.blue},"red":${this.storage.gameEntity.match.red}}}`;
  }
}
