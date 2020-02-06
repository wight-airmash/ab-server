import { CTF_TEAMS } from '@airbattle/protocol';
import { CTF_ELECTIONS_DATA_EXPIRE_SEC, MS_PER_SEC } from '@/constants';
import { BROADCAST_CHAT_TEAM, CTF_USURP_LEADER_POSITION, RESPONSE_COMMAND_REPLY } from '@/events';
import { System } from '@/server/system';
import { CTFLeadersStorage, PlayerId } from '@/types';

/**
 * This implementation is only applicable to Q-bots.
 */
export default class Usurpation extends System {
  private leaders: CTFLeadersStorage;

  protected latestBlueUsurpAt = 0;

  protected latestRedUsurpAt = 0;

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
    const updateExpiredAt = now - CTF_ELECTIONS_DATA_EXPIRE_SEC * MS_PER_SEC;

    if (
      (usurper.team.current === CTF_TEAMS.BLUE && this.leaders.blueUpdatedAt < updateExpiredAt) ||
      (usurper.team.current === CTF_TEAMS.RED && this.leaders.redUpdatedAt < updateExpiredAt)
    ) {
      this.emit(
        RESPONSE_COMMAND_REPLY,
        connectionId,
        `Please use #status first. After bot response you will have ${CTF_ELECTIONS_DATA_EXPIRE_SEC} seconds to request /usurp.`
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
        this.emit(BROADCAST_CHAT_TEAM, this.leaders.redId, `#leader ${usurper.name.current}`);
      } else {
        this.emit(RESPONSE_COMMAND_REPLY, connectionId, "Your score isn't high enough.");
      }
    }
  }
}
