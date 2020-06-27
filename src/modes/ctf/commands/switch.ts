import { CTF_TEAMS } from '@airbattle/protocol';
import {
  CTF_PLAYER_SWITCH_TIMEOUT_MS,
  MS_PER_SEC,
  PLAYERS_ALIVE_STATUSES,
} from '../../../constants';
import {
  BROADCAST_CHAT_SERVER_PUBLIC,
  BROADCAST_PLAYER_RETEAM,
  COMMAND_SWITCH,
  CTF_PLAYER_DROP_FLAG,
  CTF_PLAYER_SWITCHED,
  PLAYERS_UPDATE_TEAM,
  RESPONSE_COMMAND_REPLY,
} from '../../../events';
import { System } from '../../../server/system';
import { ConnectionId } from '../../../types';

export default class SwitchCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_SWITCH]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: ConnectionId): void {
    const connection = this.storage.connectionList.get(connectionId);

    if (
      !this.storage.connectionList.has(connectionId) ||
      !this.helpers.isPlayerConnected(connection.playerId)
    ) {
      return;
    }

    const { playerId } = connection;
    const player = this.storage.playerList.get(playerId);

    if (
      player.alivestatus.current === PLAYERS_ALIVE_STATUSES.SPECTATE &&
      player.spectate.isActive
    ) {
      const now = Date.now();

      if (player.times.lastSwitch > now - CTF_PLAYER_SWITCH_TIMEOUT_MS) {
        const s = Math.ceil(
          (CTF_PLAYER_SWITCH_TIMEOUT_MS - (now - player.times.lastSwitch)) / MS_PER_SEC
        );

        this.emit(RESPONSE_COMMAND_REPLY, connectionId, `Wait ${s} seconds until the next switch.`);

        return;
      }

      let teamId = null;
      let teamText = 'red';

      if (player.team.current === CTF_TEAMS.BLUE) {
        teamId = CTF_TEAMS.RED;
      } else {
        teamId = CTF_TEAMS.BLUE;
        teamText = 'blue';
      }

      player.times.lastSwitch = now;
      player.stats.switches += 1;

      this.emit(PLAYERS_UPDATE_TEAM, playerId, teamId);

      this.emit(BROADCAST_PLAYER_RETEAM, [playerId]);
      this.emit(CTF_PLAYER_DROP_FLAG, playerId);
      this.emit(CTF_PLAYER_SWITCHED, playerId);
      this.emit(BROADCAST_CHAT_SERVER_PUBLIC, `${player.name.current} switched to ${teamText}.`);
    } else {
      this.emit(RESPONSE_COMMAND_REPLY, connectionId, 'Go into spectator mode first.');
    }
  }
}
