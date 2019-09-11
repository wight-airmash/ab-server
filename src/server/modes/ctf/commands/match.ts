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

      this.emit(
        BROADCAST_CHAT_SERVER_WHISPER,
        connection.meta.playerId,
        `Match time: ${humanTimeParts.join(' ')}.`
      );
    }
  }
}
