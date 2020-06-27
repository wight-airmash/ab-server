import {
  PLAYERS_CREATED,
  PLAYERS_KILLED,
  PLAYERS_RANKINGS_SORT,
  PLAYERS_RANKINGS_UPDATE,
  PLAYERS_REMOVE,
  TIMELINE_GAME_MATCH_END,
  TIMELINE_GAME_MATCH_START,
} from '../../events';
import { bInsert } from '../../support/arrays';
import { BountyRankingItem, Player, PlayerId } from '../../types';
import { System } from '../system';

const compareFn = (a: BountyRankingItem, b: BountyRankingItem): boolean => a.score < b.score;

export default class GameRankings extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_CREATED]: this.onPlayerCreated,
      [PLAYERS_KILLED]: this.onPlayerKilled,
      [PLAYERS_RANKINGS_SORT]: this.onSort,
      [PLAYERS_RANKINGS_UPDATE]: this.onUpdate,
      [PLAYERS_REMOVE]: this.onPlayerRemove,
      [TIMELINE_GAME_MATCH_END]: this.onMatchEnd,
      [TIMELINE_GAME_MATCH_START]: this.onMatchStart,
    };
  }

  onMatchStart(): void {
    this.recreateRankings();
  }

  onMatchEnd(): void {
    this.recreateRankings();
  }

  /**
   * Only sort without data retrieving.
   */
  onSort(): void {
    if (this.storage.playerRankings.outdated) {
      this.sortRankings();
    }
  }

  /**
   * Retrieve players score data and sort.
   */
  onUpdate(): void {
    this.recreateRankings();
  }

  onPlayerCreated(playerId: PlayerId): void {
    const player = this.storage.playerList.get(playerId);
    const rankingItem = { id: playerId, score: player.score.current };

    if (rankingItem.score === 0) {
      this.storage.playerRankings.byBounty.push(rankingItem);
    } else {
      bInsert(this.storage.playerRankings.byBounty, rankingItem, compareFn);
    }
  }

  onPlayerRemove(playerId: PlayerId): void {
    const index = this.storage.playerRankings.byBounty.findIndex(
      rankingItem => rankingItem.id === playerId
    );

    if (index !== -1) {
      this.storage.playerRankings.byBounty.splice(index, 1);
    }
  }

  onPlayerKilled(victimId: PlayerId, killerId: PlayerId): void {
    const victim = this.storage.playerList.get(victimId);
    const victimIndex = this.storage.playerRankings.byBounty.findIndex(
      rankingItem => rankingItem.id === victimId
    );

    this.storage.playerRankings.byBounty[victimIndex].score = victim.score.current;

    if (this.storage.playerList.has(killerId)) {
      const killer = this.storage.playerList.get(killerId);
      const killerIndex = this.storage.playerRankings.byBounty.findIndex(
        rankingItem => rankingItem.id === killerId
      );

      this.storage.playerRankings.byBounty[killerIndex].score = killer.score.current;
    }

    this.storage.playerRankings.outdated = true;
  }

  private sortRankings(): void {
    this.storage.playerRankings.byBounty.sort((rankingA, rankingB) => {
      return rankingB.score - rankingA.score;
    });

    this.storage.playerRankings.outdated = false;
  }

  private recreateRankings(): void {
    this.storage.playerRankings.byBounty = [];

    const playersIterator = this.storage.playerList.values();
    let player: Player = playersIterator.next().value;

    while (player !== undefined) {
      const rankingItem = { id: player.id.current, score: player.score.current };

      if (rankingItem.score === 0) {
        this.storage.playerRankings.byBounty.push(rankingItem);
      } else {
        bInsert(this.storage.playerRankings.byBounty, rankingItem, compareFn);
      }

      player = playersIterator.next().value;
    }
  }
}
