import {
  BROADCAST_PLAYERS_ALIVE,
  PLAYERS_ALIVE_UPDATE,
  TIMELINE_GAME_MATCH_START,
} from '../../../events';
import { System } from '../../../server/system';

export default class GameEndpointAPI extends System {
  private start = Date.now();

  constructor({ app }) {
    super({ app });

    this.storage.gameModeAPIResponse = `"btr":{"start":${this.start},"alive":0}`;

    this.listeners = {
      [BROADCAST_PLAYERS_ALIVE]: this.updateResponse,
      [PLAYERS_ALIVE_UPDATE]: this.updateResponse,
      [TIMELINE_GAME_MATCH_START]: this.onMatchStart,
    };
  }

  onMatchStart(): void {
    if (this.storage.gameEntity.match.start) {
      this.start = this.storage.gameEntity.match.start;

      this.updateResponse();
    }
  }

  updateResponse(): void {
    this.storage.gameModeAPIResponse = `"btr":{"start":${this.start},"alive":${this.storage.gameEntity.match.playersAlive}}`;
  }
}
