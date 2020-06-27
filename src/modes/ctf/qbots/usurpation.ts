import { CTF_TEAMS } from '@airbattle/protocol';
import {
  CTF_LEADER_DATA_EXPIRE_INTERVAL_MS,
  CTF_LEADER_DATA_EXPIRE_INTERVAL_SEC,
  CTF_USURP_DEBOUNCE_INTERVAL_MS,
} from '../../../constants';
import {
  BROADCAST_CHAT_SERVER_TEAM,
  BROADCAST_CHAT_TEAM,
  CTF_USURP_LEADER_POSITION,
  RESPONSE_COMMAND_REPLY,
} from '../../../events';
import { System } from '../../../server/system';
import { CTFLeadersStorage, PlayerId } from '../../../types';

/**
 * This implementation is only applicable to Q-bots.
 */
export default class Usurpation extends System {
  private leaders: CTFLeadersStorage;

  private latestBlueUsurpAt = 0;

  private latestRedUsurpAt = 0;

  constructor({ app }) {
    super({ app });

    this.leaders = this.storage.ctf.leaders;

    this.listeners = {
      [CTF_USURP_LEADER_POSITION]: this.onUsurp,
    };
  }

  onUsurp(usurperId: PlayerId): void {
    if (!this.helpers.isPlayerConnected(usurperId)) {
      return;
    }

    const usurper = this.storage.playerList.get(usurperId);
    const connectionId = this.storage.playerMainConnectionList.get(usurperId);
    const now = Date.now();
    const updateExpiredAt = now - CTF_LEADER_DATA_EXPIRE_INTERVAL_MS;
    const debounceExpiredAt = now - CTF_USURP_DEBOUNCE_INTERVAL_MS;

    if (
      (usurper.team.current === CTF_TEAMS.BLUE && this.latestBlueUsurpAt > debounceExpiredAt) ||
      (usurper.team.current === CTF_TEAMS.RED && this.latestRedUsurpAt > debounceExpiredAt)
    ) {
      this.emit(
        RESPONSE_COMMAND_REPLY,
        connectionId,
        'Too frequent use of /usurp, repeat the request later.'
      );

      return;
    }

    if (
      (usurper.team.current === CTF_TEAMS.BLUE && this.leaders.blueUpdatedAt < updateExpiredAt) ||
      (usurper.team.current === CTF_TEAMS.RED && this.leaders.redUpdatedAt < updateExpiredAt)
    ) {
      this.emit(
        RESPONSE_COMMAND_REPLY,
        connectionId,
        `Please use #status first. After bot response you will have ${CTF_LEADER_DATA_EXPIRE_INTERVAL_SEC} seconds to request /usurp.`
      );

      return;
    }

    if (usurper.team.current === CTF_TEAMS.BLUE) {
      if (!this.helpers.isPlayerConnected(this.leaders.blueId)) {
        this.emit(
          RESPONSE_COMMAND_REPLY,
          connectionId,
          'Blue team leader is unknown. Use #status first.'
        );

        return;
      }

      const leader = this.storage.playerList.get(this.leaders.blueId);

      if (usurper.score.current > leader.score.current) {
        this.latestBlueUsurpAt = now;
        this.emit(
          BROADCAST_CHAT_SERVER_TEAM,
          CTF_TEAMS.BLUE,
          `${usurper.name.current} usurped the leader position.`
        );
        this.emit(BROADCAST_CHAT_TEAM, this.leaders.blueId, `#leader ${usurper.name.current}`);
      } else {
        this.emit(RESPONSE_COMMAND_REPLY, connectionId, "Your score isn't high enough.");
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

      const leader = this.storage.playerList.get(this.leaders.redId);

      if (usurper.score.current > leader.score.current) {
        this.latestRedUsurpAt = now;
        this.emit(
          BROADCAST_CHAT_SERVER_TEAM,
          CTF_TEAMS.RED,
          `${usurper.name.current} usurped the leader position.`
        );
        this.emit(BROADCAST_CHAT_TEAM, this.leaders.redId, `#leader ${usurper.name.current}`);
      } else {
        this.emit(RESPONSE_COMMAND_REPLY, connectionId, "Your score isn't high enough.");
      }
    }
  }
}
