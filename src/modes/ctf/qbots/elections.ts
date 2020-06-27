import { CTF_TEAMS } from '@airbattle/protocol';
import {
  CTF_AFK_TIME_TO_START_ELECTIONS_MS,
  CTF_LEADER_DATA_EXPIRE_INTERVAL_MS,
  CTF_LEADER_DATA_EXPIRE_INTERVAL_SEC,
} from '../../../constants';
import {
  CTF_REMOVE_PLAYER_FROM_LEADER,
  CTF_START_ELECTIONS,
  RESPONSE_COMMAND_REPLY,
} from '../../../events';
import { System } from '../../../server/system';
import { CTFLeadersStorage, PlayerId } from '../../../types';

/**
 * This implementation is only applicable to Q-bots.
 */
export default class Elections extends System {
  private leaders: CTFLeadersStorage;

  constructor({ app }) {
    super({ app });

    this.leaders = this.storage.ctf.leaders;

    this.listeners = {
      [CTF_START_ELECTIONS]: this.onStartElections,
    };
  }

  protected isPlayerAFK(playerId: PlayerId, now: number = Date.now()): boolean {
    const player = this.storage.playerList.get(playerId);

    return now - player.times.lastMove > CTF_AFK_TIME_TO_START_ELECTIONS_MS;
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
    const updateExpiredAt = now - CTF_LEADER_DATA_EXPIRE_INTERVAL_MS;

    if (
      (initiator.team.current === CTF_TEAMS.BLUE && this.leaders.isBlueElections) ||
      (initiator.team.current === CTF_TEAMS.RED && this.leaders.isRedElections)
    ) {
      this.emit(
        RESPONSE_COMMAND_REPLY,
        connectionId,
        'Hurry up to type #yes, the elections have already started!.'
      );

      return;
    }

    if (
      (initiator.team.current === CTF_TEAMS.BLUE && this.leaders.blueUpdatedAt < updateExpiredAt) ||
      (initiator.team.current === CTF_TEAMS.RED && this.leaders.redUpdatedAt < updateExpiredAt)
    ) {
      this.emit(
        RESPONSE_COMMAND_REPLY,
        connectionId,
        `Please use #status first. After bot response you will have ${CTF_LEADER_DATA_EXPIRE_INTERVAL_SEC} seconds to request /elections.`
      );

      return;
    }

    if (initiator.team.current === CTF_TEAMS.BLUE) {
      if (!this.helpers.isPlayerConnected(this.leaders.blueId)) {
        this.emit(
          RESPONSE_COMMAND_REPLY,
          connectionId,
          'Blue team leader is unknown. Use #status first.'
        );

        return;
      }

      if (this.isPlayerAFK(this.leaders.blueId, now)) {
        this.emit(CTF_REMOVE_PLAYER_FROM_LEADER, this.leaders.blueId);
      } else {
        this.emit(RESPONSE_COMMAND_REPLY, connectionId, "Blue team leader isn't AFK.");
      }
    } else {
      if (!this.helpers.isPlayerConnected(this.leaders.redId)) {
        this.emit(
          RESPONSE_COMMAND_REPLY,
          connectionId,
          'Red team leader is unknown. Use #status first.'
        );

        return;
      }

      if (this.isPlayerAFK(this.leaders.redId, now)) {
        this.emit(CTF_REMOVE_PLAYER_FROM_LEADER, this.leaders.redId);
      } else {
        this.emit(RESPONSE_COMMAND_REPLY, connectionId, "Red team leader isn't AFK.");
      }
    }
  }
}
