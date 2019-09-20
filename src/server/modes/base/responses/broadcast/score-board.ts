import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { PLAYERS_ALIVE_STATUSES } from '@/constants';
import { BROADCAST_SCORE_BOARD, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

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
    const playersData = [];
    const players = [];
    const rankings = [];
    let recipients = null;

    if (connectionId !== null) {
      recipients = connectionId;
    } else {
      recipients = [...this.storage.mainConnectionIdList];
    }

    this.storage.playerList.forEach(player => {
      playersData.push({
        alive: player.alivestatus.current,
        id: player.id.current,
        score: player.score.current,
        level: player.level.current,
        x: player.position.lowX,
        y: player.position.lowY,
      });
    });

    playersData.sort((p1, p2) => p2.score - p1.score);

    for (let i = 0; i < playersData.length; i += 1) {
      players.push({
        id: playersData[i].id,
        score: playersData[i].score,
        level: playersData[i].level,
      } as ServerPackets.ScoreBoardData);

      rankings.push({
        id: playersData[i].id,
        x: playersData[i].alive === PLAYERS_ALIVE_STATUSES.ALIVE ? playersData[i].x : 0,
        y: playersData[i].alive === PLAYERS_ALIVE_STATUSES.ALIVE ? playersData[i].y : 0,
      } as ServerPackets.ScoreBoardRanking);
    }

    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.SCORE_BOARD,
        data: players,
        rankings,
      } as ServerPackets.ScoreBoard,
      recipients
    );
  }
}
