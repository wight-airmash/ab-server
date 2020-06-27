import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { PLAYERS_ALIVE_STATUSES } from '../../../constants';
import { BROADCAST_SCORE_BOARD, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { MainConnectionId } from '../../../types';
import { System } from '../../system';

export default class ScoreBoardBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_SCORE_BOARD]: this.onScoreBoard,
    };
  }

  /**
   * Sent on:
   * 1. Player connected.
   * 2. Every N-seconds (see `SERVER_BROADCAST_SCORE_BOARD_INTERVAL_SEC` constant).
   *
   * Broadcast to one or all players.
   *
   * @param connectionId
   */
  onScoreBoard(connectionId: MainConnectionId = null): void {
    const players = [];
    const rankings = [];
    let recipients = null;

    if (connectionId !== null) {
      recipients = connectionId;
    } else {
      recipients = [...this.storage.mainConnectionIdList];
    }

    for (let idIndex = 0; idIndex < this.storage.playerRankings.byBounty.length; idIndex += 1) {
      const playerId = this.storage.playerRankings.byBounty[idIndex].id;

      if (this.storage.playerList.has(playerId)) {
        const player = this.storage.playerList.get(playerId);

        players.push({
          id: playerId,
          score: player.score.current,
          level: player.level.current,
        } as ServerPackets.ScoreBoardData);

        rankings.push({
          id: playerId,
          x: player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE ? player.position.lowX : 0,
          y: player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE ? player.position.lowY : 0,
        } as ServerPackets.ScoreBoardRanking);
      }
    }

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.SCORE_BOARD,
        data: players,
        rankings,
      } as ServerPackets.ScoreBoard,
      recipients
    );
  }
}
