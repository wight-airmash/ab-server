import { CTF_TEAMS } from '@airbattle/protocol';
import {
  CTF_AFK_TIME_TO_START_ELECTIONS_MS,
  CTF_ELECTIONS_DATA_EXPIRE_SEC,
  MS_PER_SEC,
} from '@/constants';
import {
  CTF_BOT_CHAT_TEAM,
  CTF_REMOVE_PLAYER_FROM_LEADER,
  CTF_START_ELECTIONS,
  PLAYERS_REMOVED,
  RESPONSE_COMMAND_REPLY,
  TIMELINE_CLOCK_MINUTE,
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

  protected blueElectionsStartedAt = 0;

  protected redElectionsStartedAt = 0;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CTF_BOT_CHAT_TEAM]: this.onBotChat,
      [CTF_START_ELECTIONS]: this.onStartElections,
      [PLAYERS_REMOVED]: this.onPlayerDisconnected,
      [TIMELINE_CLOCK_MINUTE]: this.onMinuteTick,
    };
  }

  protected setLeaderByName(
    playerName: string,
    teamId: CTF_TEAMS = null,
    stopElections = true
  ): void {
    if (
      this.storage.playerNameList.has(playerName) === true &&
      this.storage.playerHistoryNameToIdList.has(playerName)
    ) {
      const { id } = this.storage.playerHistoryNameToIdList.get(playerName);
      let playerTeamId: CTF_TEAMS;

      if (teamId === null) {
        if (this.storage.playerList.has(id) === true) {
          playerTeamId = this.storage.playerList.get(id).team.current;
        }
      } else {
        playerTeamId = teamId;
      }

      if (playerTeamId === CTF_TEAMS.BLUE) {
        this.blueLeaderId = id;
        this.blueUpdatedAt = Date.now();

        if (stopElections === true) {
          this.isBlueElectionsActive = false;

          this.log.debug('Blue team leader elections fihished.');
        }

        this.log.debug('Detect blue team leader', { id, playerName });
      } else {
        this.redLeaderId = id;
        this.redUpdatedAt = Date.now();

        if (stopElections === true) {
          this.isRedElectionsActive = false;

          this.log.debug('Red team leader elections fihished.');
        }

        this.log.debug('Detect red team leader', { id, playerName });
      }
    } else {
      this.log.debug('Team leader not found', { playerName });
    }
  }

  /**
   * Parse the leader name from the "controlled by" message.
   *
   * @param msg
   * @param teamId
   */
  protected parseLeaderFromControlledBy(msg: string, teamId: CTF_TEAMS): void {
    const playerName = msg.substring(msg.indexOf('controlled by ') + 14, msg.length - 1);

    this.setLeaderByName(playerName, teamId, false);
  }

  protected isPlayerAFK(playerId: PlayerId, now: number = Date.now()): boolean {
    const player = this.storage.playerList.get(playerId);

    return now - player.times.lastMove > CTF_AFK_TIME_TO_START_ELECTIONS_MS;
  }

  /**
   * Parse the team chat message from the bot.
   *
   * @param botId
   * @param msg
   */
  onBotChat(botId: PlayerId, msg: string): void {
    if (!this.helpers.isPlayerConnected(botId)) {
      return;
    }

    const bot = this.storage.playerList.get(botId);

    if (msg === 'Type #yes in the next 30 seconds to become the new team leader.') {
      if (bot.team.current === CTF_TEAMS.BLUE) {
        this.isBlueElectionsActive = true;
        this.blueElectionsStartedAt = Date.now();

        this.log.debug('Blue team leader elections started.');
      } else {
        this.isRedElectionsActive = true;
        this.redElectionsStartedAt = Date.now();

        this.log.debug('Red team leader elections started.');
      }

      return;
    }

    // The blue team has 5 bots in auto mode controlled by playerName.
    if (msg.indexOf('The blue team has') === 0 && msg.indexOf('controlled by') !== -1) {
      this.parseLeaderFromControlledBy(msg, CTF_TEAMS.BLUE);

      return;
    }

    // The red team has 7 bots in capture mode controlled by playerName.
    if (msg.indexOf('The red team has') === 0 && msg.indexOf('controlled by') !== -1) {
      this.parseLeaderFromControlledBy(msg, CTF_TEAMS.RED);

      return;
    }

    const newTeamLeaderIndex = msg.indexOf(' has been chosen as the new team leader.');
    const isStillIndex = msg.indexOf(' is still the team leader.');

    // playerName has been chosen as the new team leader.
    if (
      (newTeamLeaderIndex !== -1 && isStillIndex === -1) ||
      (newTeamLeaderIndex !== -1 && isStillIndex === 0)
    ) {
      this.setLeaderByName(msg.substring(0, newTeamLeaderIndex === 0 ? 40 : newTeamLeaderIndex));

      return;
    }

    // playerName is still the team leader.
    if (isStillIndex !== -1) {
      this.setLeaderByName(msg.substring(0, isStillIndex === 0 ? 26 : isStillIndex));
    }
  }

  onPlayerDisconnected(playerId: PlayerId): void {
    if (this.blueLeaderId === playerId) {
      this.blueLeaderId = null;
    } else if (this.redLeaderId === playerId) {
      this.redLeaderId = null;
    }
  }

  /**
   * Reset elections status in case something goes wrong.
   */
  onMinuteTick(): void {
    const expiredAt = Date.now() - 32 * MS_PER_SEC;

    if (this.isBlueElectionsActive === true && this.blueElectionsStartedAt < expiredAt) {
      this.isBlueElectionsActive = false;

      this.log.debug('Reset blue elections status.');
    }

    if (this.isRedElectionsActive === true && this.redElectionsStartedAt < expiredAt) {
      this.isRedElectionsActive = false;

      this.log.debug('Reset red elections status.');
    }
  }

  /**
   * Start the elections if possible.
   *
   * @param initiatorId
   */
  onStartElections(initiatorId: PlayerId): void {
    if (!this.helpers.isPlayerConnected(initiatorId)) {
      return;
    }

    const initiator = this.storage.playerList.get(initiatorId);
    const connectionId = this.storage.playerMainConnectionList.get(initiatorId);
    const now = Date.now();
    const updateExpiredAt = now - CTF_ELECTIONS_DATA_EXPIRE_SEC * MS_PER_SEC;

    if (
      (initiator.team.current === CTF_TEAMS.BLUE && this.blueUpdatedAt < updateExpiredAt) ||
      (initiator.team.current === CTF_TEAMS.RED && this.redUpdatedAt < updateExpiredAt)
    ) {
      this.emit(
        RESPONSE_COMMAND_REPLY,
        connectionId,
        `Please use #status first. After bot response you will have ${CTF_ELECTIONS_DATA_EXPIRE_SEC} seconds to request /elections.`
      );

      return;
    }

    if (
      (initiator.team.current === CTF_TEAMS.BLUE && this.isBlueElectionsActive === true) ||
      (initiator.team.current === CTF_TEAMS.RED && this.isRedElectionsActive === true)
    ) {
      this.emit(
        RESPONSE_COMMAND_REPLY,
        connectionId,
        'Hurry up to type #yes, the elections have already started!.'
      );

      return;
    }

    if (initiator.team.current === CTF_TEAMS.BLUE) {
      if (!this.helpers.isPlayerConnected(this.blueLeaderId)) {
        this.emit(
          RESPONSE_COMMAND_REPLY,
          connectionId,
          "Blue team leader isn't known. Use #status first."
        );

        return;
      }

      if (this.isPlayerAFK(this.blueLeaderId, now) === true) {
        this.emit(CTF_REMOVE_PLAYER_FROM_LEADER, this.blueLeaderId);
      } else {
        this.emit(RESPONSE_COMMAND_REPLY, connectionId, "Blue team leader isn't AFK.");
      }
    } else {
      if (!this.helpers.isPlayerConnected(this.redLeaderId)) {
        this.emit(
          RESPONSE_COMMAND_REPLY,
          connectionId,
          "Red team leader isn't known. Use #status first."
        );

        return;
      }

      if (this.isPlayerAFK(this.redLeaderId, now) === true) {
        this.emit(CTF_REMOVE_PLAYER_FROM_LEADER, this.redLeaderId);
      } else {
        this.emit(RESPONSE_COMMAND_REPLY, connectionId, "Red team leader isn't AFK.");
      }
    }
  }
}
