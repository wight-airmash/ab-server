import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, RESPONSE_SCORE_DETAILED } from '../../../events';
import { System } from '../../../server/system';
import { MainConnectionId } from '../../../types';

export default class ScoreDetailedResponse extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_SCORE_DETAILED]: this.onScoreDetailed,
    };
  }

  /**
   * FFA scores.
   * Sent in response to a client request.
   *
   * @param connectionId player connection id
   */
  onScoreDetailed(connectionId: MainConnectionId): void {
    const scores: ServerPackets.ScoreDetailedScore[] = [];

    for (let idIndex = 0; idIndex < this.storage.playerRankings.byBounty.length; idIndex += 1) {
      if (this.storage.playerList.has(this.storage.playerRankings.byBounty[idIndex].id)) {
        const player = this.storage.playerList.get(
          this.storage.playerRankings.byBounty[idIndex].id
        );

        scores.push({
          id: player.id.current,
          level: player.level.current,
          score: player.score.current,
          kills: player.kills.current,
          deaths: player.deaths.current,
          damage: player.damage.current,
          ping: player.ping.current,
        } as ServerPackets.ScoreDetailedScore);
      }
    }

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.SCORE_DETAILED,
        scores,
      } as ServerPackets.ScoreDetailed,
      connectionId
    );
  }
}
