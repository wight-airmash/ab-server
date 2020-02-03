import { CTF_TEAMS } from '@airbattle/protocol';
import { CTF_AFK_TIME_TO_START_ELECTIONS_MS, MS_PER_SEC } from '@/constants';
import {
  CTF_BOT_CHAT_TEAM,
  CTF_REMOVE_PLAYER_FROM_LEADER,
  CTF_START_ELECTIONS,
  RESPONSE_COMMAND_REPLY,
} from '@/events';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

/**
 * This implementation is only applicable to Q-bots.
 */
export default class Elections extends System {
  protected blueLeaderId: PlayerId = null;

  protected redLeaderId: PlayerId = null;

  protected blueUpdatedAt = 0;

  protected redUpdatedAt = 0;

  protected isBlueElectionsActive = false;

  protected isRedElectionsActive = false;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CTF_BOT_CHAT_TEAM]: this.onBotChat,
      [CTF_START_ELECTIONS]: this.onStartElections,
    };
  }

  onBotChat(botId: PlayerId, msg: string): void {
    if (!this.helpers.isPlayerConnected(this.blueLeaderId)) {
      return;
    }

    const bot = this.storage.playerList.get(botId);

    /**
     * Check the message pattern.
     *
     * Examples:
     *
     * Type #yes in the next 30 seconds to become the new team leader.
     * playerName is still the team leader.
     * playerName has been chosen as the new team leader.
     */

    if (msg === 'Type #yes in the next 30 seconds to become the new team leader.') {
      if (bot.team.current === CTF_TEAMS.BLUE) {
        this.isBlueElectionsActive = true;
      } else {
        this.isRedElectionsActive = true;
      }
    }

    if (msg.startsWith('The blue team has')) {
      // The blue team has 5 bots in auto mode controlled by playerName.
    }

    if (msg.startsWith('The red team has')) {
      // The red team has 7 bots in capture mode controlled by playerName.
    }
  }

  isAfk(playerId: PlayerId, now: number = Date.now()): boolean {
    const player = this.storage.playerList.get(playerId);

    return now - player.times.lastMove > CTF_AFK_TIME_TO_START_ELECTIONS_MS;
  }

  onStartElections(initiatorId: PlayerId): void {
    if (!this.helpers.isPlayerConnected(initiatorId)) {
      return;
    }

    const initiator = this.storage.playerList.get(initiatorId);
    const updateExpiredAt = Date.now() - 10 * MS_PER_SEC;

    if (
      (initiator.team.current === CTF_TEAMS.BLUE && this.blueUpdatedAt > updateExpiredAt) ||
      (initiator.team.current === CTF_TEAMS.RED && this.redUpdatedAt > updateExpiredAt)
    ) {
      this.emit(
        RESPONSE_COMMAND_REPLY,
        this.storage.playerMainConnectionList.get(initiatorId),
        'Please use #status first. After you will have 10 seconds to request /elections.'
      );

      return;
    }

    if (initiator.team.current === CTF_TEAMS.BLUE) {
      if (!this.helpers.isPlayerConnected(this.blueLeaderId)) {
        return;
      }

      this.emit(CTF_REMOVE_PLAYER_FROM_LEADER, this.blueLeaderId);
    } else {
      if (!this.helpers.isPlayerConnected(this.redLeaderId)) {
        return;
      }

      this.emit(CTF_REMOVE_PLAYER_FROM_LEADER, this.redLeaderId);
    }
  }
}
