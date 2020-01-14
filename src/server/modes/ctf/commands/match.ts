import { BROADCAST_CHAT_SERVER_WHISPER, COMMAND_MATCH } from '@/events';
import { System } from '@/server/system';
import { ConnectionId } from '@/types';

export default class MatchCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_MATCH]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: ConnectionId, command = ''): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);
    const player = this.storage.playerList.get(connection.meta.playerId);

    if (command === '') {
      this.log.debug(`Player id${connection.meta.playerId} checked match info.`);

      const matchDuration = Date.now() - this.storage.gameEntity.match.start;
      const humanTimeParts = [];
      const seconds = Math.floor((matchDuration / 1000) % 60);
      const minutes = Math.floor((matchDuration / (1000 * 60)) % 60);
      const hours = Math.floor((matchDuration / (1000 * 60 * 60)) % 24);

      if (hours > 0) {
        humanTimeParts.push(`${hours}h`);
      }

      if (minutes > 0) {
        humanTimeParts.push(`${minutes}m`);
      }

      if (seconds > 0) {
        humanTimeParts.push(`${seconds}s`);
      }

      const { capIfReturned } = this.storage.gameEntity.match;

      this.emit(
        BROADCAST_CHAT_SERVER_WHISPER,
        connection.meta.playerId,
        `Match time: ${humanTimeParts.join(' ')}, cap_if_returned: ${capIfReturned}.`
      );
    } else if (command.startsWith('set ')) {
      if (player.su.current === false) {
        return;
      }

      const varWithVal = command.substring('set '.length);

      if (varWithVal.startsWith('cap_if_returned ')) {
        const val = !!parseInt(varWithVal.substring('cap_if_returned '.length), 10);

        this.storage.gameEntity.match.capIfReturned = val;
        this.emit(
          BROADCAST_CHAT_SERVER_WHISPER,
          connection.meta.playerId,
          `set cap_if_returned to ${val}`
        );
      }
    }
  }
}
