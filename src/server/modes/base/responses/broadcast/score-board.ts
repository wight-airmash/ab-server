import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { PLAYERS_ALIVE_STATUSES, SHIPS_TYPES } from '@/constants';
import { BROADCAST_SCORE_BOARD, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId, PlayerId } from '@/types';

interface PlayerRawData {
  id: PlayerId;
  x: number;
  y: number;
  alive: number;
  score: number;
  level: number;
  isStealthed: boolean;
  hasFlag: boolean;
  connectionId: MainConnectionId;
}

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
    const playersRawData: PlayerRawData[] = [];
    const players: ServerPackets.ScoreBoardData[] = [];
    let recipientsData: PlayerRawData[] = [];

    this.storage.playerList.forEach(player => {
      if (!this.storage.playerMainConnectionList.has(player.id.current)) {
        return;
      }

      const playerConnectionId = this.storage.playerMainConnectionList.get(player.id.current);
      const isStealthed =
        player.planetype.current === SHIPS_TYPES.PROWLER && player.planestate.stealthed === true;

      playersRawData.push({
        id: player.id.current,
        x: player.position.lowX,
        y: player.position.lowY,
        alive: player.alivestatus.current,
        score: player.score.current,
        level: player.level.current,
        isStealthed,
        hasFlag: player.planestate.flagspeed,
        connectionId: playerConnectionId,
      });

      if (connectionId !== null && playerConnectionId === connectionId) {
        recipientsData.push(playersRawData[playersRawData.length - 1]);
      }
    });

    if (recipientsData.length === 0) {
      recipientsData = playersRawData;
    }

    playersRawData.sort((p1, p2) => p2.score - p1.score);

    for (let i = 0; i < playersRawData.length; i += 1) {
      players.push({
        id: playersRawData[i].id,
        score: playersRawData[i].score,
        level: playersRawData[i].level,
      } as ServerPackets.ScoreBoardData);
    }

    for (let recipientIndex = 0; recipientIndex < recipientsData.length; recipientIndex += 1) {
      const rankings: ServerPackets.ScoreBoardRanking[] = [];
      const {
        id: recipientId,
        isStealthed: isRecipientStealthed,
        connectionId: recipientConnectionId,
      } = recipientsData[recipientIndex];

      for (let playerIndex = 0; playerIndex < playersRawData.length; playerIndex += 1) {
        const {
          id,
          alive,
          x,
          y,
          connectionId: playerConnectionId,
          isStealthed,
          hasFlag,
        } = playersRawData[playerIndex];
        const isWithinViewport = this.storage.broadcast.has(recipientId)
          ? this.storage.broadcast.get(recipientId).has(playerConnectionId)
          : false;

        if (recipientConnectionId === playerConnectionId) {
          rankings.push({
            id,
            x: alive === PLAYERS_ALIVE_STATUSES.ALIVE ? x : 0,
            y: alive === PLAYERS_ALIVE_STATUSES.ALIVE ? y : 0,
          });
        } else if (isRecipientStealthed === false) {
          rankings.push({
            id,
            x:
              alive !== PLAYERS_ALIVE_STATUSES.ALIVE ||
              (isStealthed === true && isWithinViewport === false)
                ? 0
                : x,
            y:
              alive !== PLAYERS_ALIVE_STATUSES.ALIVE ||
              (isStealthed === true && isWithinViewport === false)
                ? 0
                : y,
          });
        } else {
          const hasCoords =
            (alive === PLAYERS_ALIVE_STATUSES.ALIVE && isWithinViewport === true) ||
            hasFlag === true;

          rankings.push({
            id,
            x: hasCoords ? x : 0,
            y: hasCoords ? y : 0,
          });
        }
      }

      this.log.debug('SCORE_BOARD', {
        c: SERVER_PACKETS.SCORE_BOARD,
        data: players,
        rankings,
      });

      this.emit(
        CONNECTIONS_SEND_PACKET,
        {
          c: SERVER_PACKETS.SCORE_BOARD,
          data: players,
          rankings,
        } as ServerPackets.ScoreBoard,
        recipientConnectionId
      );
    }
  }
}
