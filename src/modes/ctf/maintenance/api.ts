import { CTF_TEAM_CAPTURED_FLAG, TIMELINE_GAME_MATCH_START } from '../../../events';
import { System } from '../../../server/system';

export default class GameEndpointAPI extends System {
  constructor({ app }) {
    super({ app });

    this.storage.gameModeAPIResponse = `"ctf":{"start":${Date.now()},"score":{"blue":0,"red":0}}`;

    this.listeners = {
      [CTF_TEAM_CAPTURED_FLAG]: this.updateResponse,
      [TIMELINE_GAME_MATCH_START]: this.updateResponse,
    };
  }

  updateResponse(): void {
    this.storage.gameModeAPIResponse = `"ctf":{"start":${this.storage.gameEntity.match.start},"score":{"blue":${this.storage.gameEntity.match.blue},"red":${this.storage.gameEntity.match.red}}}`;
  }
}
