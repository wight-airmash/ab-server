import { CTF_TEAMS } from '@airbattle/protocol';
import { PLAYERS_ALIVE_STATUSES } from '../../../constants';
import {
  BROADCAST_CHAT_SERVER_WHISPER,
  CTF_DROP_FLAG_NOW,
  CTF_PLAYER_DROP_FLAG,
} from '../../../events';
import { System } from '../../../server/system';
import { Flag, PlayerId } from '../../../types';
/**
 * This implementation is only applicable to Q-bots.
 */
export default class FlagDropFix extends System {
  private blueElectionsStartedAt = 0;

  private redElectionsStartedAt = 0;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CTF_DROP_FLAG_NOW]: this.onDropRequest,
    };
  }

  onDropRequest(playerId: PlayerId): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);

    if (player.alivestatus.current !== PLAYERS_ALIVE_STATUSES.ALIVE) {
      this.emit(
        BROADCAST_CHAT_SERVER_WHISPER,
        playerId,
        'This command is not available to the spectators.'
      );

      return;
    }

    const flag = this.storage.mobList.get(
      player.team.current === CTF_TEAMS.BLUE
        ? this.storage.ctfFlagRedId
        : this.storage.ctfFlagBlueId
    ) as Flag;

    if (flag.owner.current !== 0 && this.storage.botIdList.has(flag.owner.current)) {
      if (
        this.storage.broadcast.has(playerId) &&
        this.storage.broadcast
          .get(playerId)
          .has(this.storage.playerMainConnectionList.get(flag.owner.current))
      ) {
        this.emit(CTF_PLAYER_DROP_FLAG, flag.owner.current);
      } else {
        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, "You're too far from the bot.");
      }
    }
  }
}
