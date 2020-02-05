import {
  PLAYERS_CREATED,
  PLAYERS_KILLED,
  PLAYERS_RANKINGS_UPDATE,
  PLAYERS_REMOVE,
  TIMELINE_GAME_MATCH_END,
} from '@/events';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

export default class GameRankings extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_CREATED]: this.onPlayerCreated,
      [PLAYERS_KILLED]: this.onPlayerKilled,
      [PLAYERS_RANKINGS_UPDATE]: this.onUpdateRequest,
      [PLAYERS_REMOVE]: this.onPlayerRemove,
      [TIMELINE_GAME_MATCH_END]: this.onMatchEnd,
    };
  }

  protected updateRankings(): void {
    this.storage.playerRankings.outdated = false;

    this.storage.playerRankings.byBounty.sort((playerAId: PlayerId, playerBId: PlayerId) => {
      const playerA = this.storage.playerList.get(playerAId);
      const playerB = this.storage.playerList.get(playerBId);

      return playerB.score.current - playerA.score.current;
    });
  }

  onMatchEnd(): void {
    this.storage.playerRankings.outdated = true;
  }

  onPlayerCreated(playerId: PlayerId): void {
    this.storage.playerRankings.byBounty.push(playerId);
  }

  onPlayerRemove(playerId: PlayerId): void {
    const index = this.storage.playerRankings.byBounty.indexOf(playerId);

    if (index !== -1) {
      this.storage.playerRankings.byBounty.splice(index, 1);
    }
  }

  onPlayerKilled(): void {
    this.storage.playerRankings.outdated = true;
  }

  onUpdateRequest(): void {
    if (this.storage.playerRankings.outdated === true) {
      this.updateRankings();
      this.log.debug('Update rankings.');
    }
  }
}
