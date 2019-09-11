import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { RESPONSE_SCORE_UPDATE, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

export default class ScoreUpdate extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_SCORE_UPDATE]: this.onScoreUpdate,
    };
  }

  /**
   * Sent when:
   * 1. Player kills someone.
   * 2. Player was killed.
   * 3. Player gets new level.
   * 4. Player score was updated (for example, for capturing a flag).
   * 5. Player picks up an upgrade box.
   *
   * @param playerId
   */
  onScoreUpdate(playerId: PlayerId): void {
    const player = this.storage.playerList.get(playerId);
    const connectionId = this.storage.playerMainConnectionList.get(playerId);

    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.SCORE_UPDATE,
        id: player.id.current,
        score: player.score.current,
        earnings: player.earningscore.current,
        upgrades: player.upgrades.amount,
        totalkills: player.kills.total,
        totaldeaths: player.deaths.total,
      } as ServerPackets.ScoreUpdate,
      connectionId
    );

    player.delayed.RESPONSE_SCORE_UPDATE = false;
  }
}
