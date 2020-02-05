import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { PLAYERS_ALIVE_STATUSES } from '@/constants';
import { CONNECTIONS_SEND_PACKET, RESPONSE_SCORE_DETAILED } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class ScoreDetailedResponse extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_SCORE_DETAILED]: this.onScoreDetailed,
    };
  }

  /**
   * BTR scores.
   * Sent in response to a client request.
   *
   * @param connectionId player connection id
   */
  onScoreDetailed(сonnectionId: MainConnectionId): void {
    const scores: ServerPackets.ScoreDetailedBtrScore[] = [];

    for (let idIndex = 0; idIndex < this.storage.playerRankings.byBounty.length; idIndex += 1) {
      if (this.storage.playerList.has(this.storage.playerRankings.byBounty[idIndex])) {
        const player = this.storage.playerList.get(this.storage.playerRankings.byBounty[idIndex]);

        scores.push({
          id: player.id.current,
          level: player.level.current,
          alive: player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE,
          wins: player.wins.current,
          score: player.score.current,
          kills: player.kills.current,
          deaths: player.deaths.current,
          damage: player.damage.current,
          ping: player.ping.current,
        } as ServerPackets.ScoreDetailedBtrScore);
      }
    }

    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.SCORE_DETAILED_BTR,
        scores,
      } as ServerPackets.ScoreDetailedBtr,
      сonnectionId
    );
  }
}
