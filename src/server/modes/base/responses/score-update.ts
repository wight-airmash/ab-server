import { PLAYER_LEVEL_UPDATE_TYPES, SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { RESPONSE_PLAYER_LEVEL, RESPONSE_SCORE_UPDATE, CONNECTIONS_SEND_PACKET } from '@/events';
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

    let earnings = 0;
    let totalkills = player.kills.current;
    let totaldeaths = player.deaths.current;

    if (player.user) {
      const user = this.storage.userList.get(player.user.id);

      earnings = user.lifetimestats.earnings;
      totalkills = user.lifetimestats.totalkills;
      totaldeaths = user.lifetimestats.totaldeaths;

      const newLevel = this.helpers.convertEarningsToLevel(earnings);

      if (newLevel > player.level.current) {
        player.level.current = newLevel;
        this.emit(RESPONSE_PLAYER_LEVEL, player.id.current, PLAYER_LEVEL_UPDATE_TYPES.LEVELUP);
      }
    }

    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.SCORE_UPDATE,
        id: player.id.current,
        score: player.score.current,
        earnings,
        upgrades: player.upgrades.amount,
        totalkills,
        totaldeaths,
      } as ServerPackets.ScoreUpdate,
      connectionId
    );

    player.delayed.RESPONSE_SCORE_UPDATE = false;
  }
}
