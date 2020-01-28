import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { RESPONSE_SCORE_DETAILED, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';
import { PLAYERS_ALIVE_STATUSES } from '@/constants';

export default class ScoreDetailed extends System {
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
    const scores = [];

    this.storage.playerList.forEach(player => {
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
    });

    scores.sort((p1, p2) => p1.score - p2.score);

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
