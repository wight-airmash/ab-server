import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { PLAYERS_ALIVE_STATUSES, SHIPS_TYPES } from '@/constants';
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
    const sightedRankings = [];
    const blindRankings = [];
    const sightedRecipients = [];
    const blindRecipients = [];

    this.storage.playerList.forEach(player => {
      const isBlind =
        player.planetype.current === SHIPS_TYPES.PROWLER && player.planestate.stealthed === true;

      playersData.push({
        alive: player.alivestatus.current,
        id: player.id.current,
        score: player.score.current,
        level: player.level.current,
        x: player.position.lowX,
        y: player.position.lowY,
        isBlind,
      });

      if (this.storage.playerMainConnectionList.has(player.id.current)) {
        const playerConnectionId = this.storage.playerMainConnectionList.get(player.id.current);

        if (connectionId !== null && playerConnectionId !== connectionId) {
          return;
        }

        if (isBlind === true) {
          blindRecipients.push(playerConnectionId);
        } else {
          sightedRecipients.push(playerConnectionId);
        }
      }
    });

    if (blindRecipients.length === 0 && sightedRecipients.length === 0) {
      return;
    }

    playersData.sort((p1, p2) => p2.score - p1.score);

    for (let i = 0; i < playersData.length; i += 1) {
      players.push({
        id: playersData[i].id,
        score: playersData[i].score,
        level: playersData[i].level,
      } as ServerPackets.ScoreBoardData);

      if (playersData[i].isBlind === false) {
        sightedRankings.push({
          id: playersData[i].id,
          x: playersData[i].alive === PLAYERS_ALIVE_STATUSES.ALIVE ? playersData[i].x : 0,
          y: playersData[i].alive === PLAYERS_ALIVE_STATUSES.ALIVE ? playersData[i].y : 0,
        } as ServerPackets.ScoreBoardRanking);
      }
    }

    if (sightedRecipients.length !== 0) {
      this.emit(
        CONNECTIONS_SEND_PACKET,
        {
          c: SERVER_PACKETS.SCORE_BOARD,
          data: players,
          rankings: sightedRankings,
        } as ServerPackets.ScoreBoard,
        sightedRecipients
      );
    }

    if (blindRecipients.length !== 0) {
      this.emit(
        CONNECTIONS_SEND_PACKET,
        {
          c: SERVER_PACKETS.SCORE_BOARD,
          data: players,
          rankings: blindRankings,
        } as ServerPackets.ScoreBoard,
        blindRecipients
      );
    }
  }
}
