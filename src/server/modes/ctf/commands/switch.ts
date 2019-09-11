import { CTF_TEAMS } from '@airbattle/protocol';
import {
  COMMAND_SWITCH,
  CTF_PLAYER_DROP_FLAG,
  RESPONSE_COMMAND_REPLY,
  BROADCAST_PLAYER_RETEAM,
  BROADCAST_CHAT_SERVER_PUBLIC,
  PLAYERS_UPDATE_TEAM,
} from '@/events';
import { System } from '@/server/system';
import { PLAYERS_ALIVE_STATUSES, CTF_PLAYER_SWITCH_TIMEOUT_MS, MS_PER_SEC } from '@/constants';
import { ConnectionId } from '@/types';

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
      !this.helpers.isPlayerConnected(connection.meta.playerId)
    ) {
      return;
    }

    const player = this.storage.playerList.get(connection.meta.playerId);

    if (
      player.alivestatus.current === PLAYERS_ALIVE_STATUSES.SPECTATE &&
      player.spectate.isActive === true
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
      this.emit(PLAYERS_UPDATE_TEAM, connection.meta.playerId, teamId);

      this.emit(BROADCAST_PLAYER_RETEAM, [connection.meta.playerId]);
      this.emit(CTF_PLAYER_DROP_FLAG, connection.meta.playerId);
      this.emit(BROADCAST_CHAT_SERVER_PUBLIC, `${player.name.current} switched to ${teamText}.`);

      this.log.debug('SWITCHING, blue connections.', [
        ...this.storage.connectionIdByTeam.get(CTF_TEAMS.BLUE),
      ]);
      this.log.debug('SWITCHING, red connections.', [
        ...this.storage.connectionIdByTeam.get(CTF_TEAMS.RED),
      ]);
      this.log.debug(`Player id${player.id.current} switched to ${teamText}.`);
    } else {
      this.emit(RESPONSE_COMMAND_REPLY, connectionId, 'Go into spectator mode first.');
    }
  }
}
