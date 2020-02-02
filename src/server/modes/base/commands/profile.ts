import { MS_PER_SEC, SERVER_FPS } from '@/constants';
import { BROADCAST_CHAT_SERVER_WHISPER, COMMAND_PROFILE } from '@/events';
import { System } from '@/server/system';
import { msToHumanReadable, unixMsToHumanReadable } from '@/support/datetime';
import { ConnectionId } from '@/types';

export default class ProfileCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_PROFILE]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: ConnectionId, command = ''): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    if (this.helpers.isPlayerConnected(connection.meta.playerId) && command === '') {
      const now = Date.now();
      const player = this.storage.playerList.get(connection.meta.playerId);
      const stats = [`Connected: ${unixMsToHumanReadable(player.times.createdAt, now)} ago.`];
      const afkMs = now - player.times.lastMove;
      const frameMs = 1000 / SERVER_FPS;
      const afkTotalMs = ~~((player.times.inactiveTotal / 17) * frameMs);
      const playingMs = ~~((player.times.activePlaying / 17) * frameMs);

      stats.push(`Playing: ${msToHumanReadable(playingMs)}.`);
      stats.push(`AFK (total): ${msToHumanReadable(afkTotalMs)}.`);

      if (afkMs > 10 * MS_PER_SEC) {
        stats.push(`AFK (now): ${msToHumanReadable(afkMs)}.`);
      }

      stats.push(`Keys pressed: ${Math.ceil((player.keystate.seq - 1) / 2)}.`);

      this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, stats.join(' '));
    }
  }
}
