import { PLAYER_LEVEL_UPDATE_TYPES, ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import {
  BROADCAST_PLAYER_LEVEL,
  CONNECTIONS_SEND_PACKETS,
  RESPONSE_SCORE_UPDATE,
} from '../../events';
import { convertEarningsToLevel } from '../../support/numbers';
import { has } from '../../support/objects';
import { PlayerId } from '../../types';
import { System } from '../system';

export default class ScoreUpdateResponse extends System {
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

    if (has(player, 'user')) {
      const user = this.storage.users.list.get(player.user.id);

      ({ earnings, totalkills, totaldeaths } = user.lifetimestats);

      const newLevel = convertEarningsToLevel(earnings);

      if (newLevel > player.level.current) {
        player.level.current = newLevel;
        this.emit(BROADCAST_PLAYER_LEVEL, player.id.current, PLAYER_LEVEL_UPDATE_TYPES.LEVELUP);
      }
    }

    this.emit(
      CONNECTIONS_SEND_PACKETS,
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
